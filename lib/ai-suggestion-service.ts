import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import type { EnhancedSuggestion, TextChunk, AISuggestionResponse } from "./ai-types"
import { SuggestionSchema } from "./ai-types"
import { textProcessor } from "./text-processor"
import { suggestionCache } from "./suggestion-cache"

export class AISuggestionService {
  private readonly model = openai("gpt-4o-mini")
  private processingCount = 0
  private readonly MAX_CONCURRENT_REQUESTS = 3
  private activeProcesses = new Map<string, { startTime: number; aborted: boolean }>()

  /**
   * Generate AI-powered suggestions for text (SERVER SIDE ONLY)
   */
  async generateSuggestions(text: string, context?: string, abortSignal?: AbortSignal): Promise<EnhancedSuggestion[]> {
    // Verify we're on the server side
    if (typeof window !== "undefined") {
      throw new Error("AISuggestionService can only be used on the server side")
    }

    // Check if request is already aborted
    if (abortSignal?.aborted) {
      throw new Error("Request was aborted")
    }

    // Limit concurrent processing to prevent memory overload
    if (this.processingCount >= this.MAX_CONCURRENT_REQUESTS) {
      throw new Error("Too many concurrent requests. Please try again later.")
    }

    const processId = `process-${Date.now()}-${Math.random()}`
    this.processingCount++
    this.activeProcesses.set(processId, { startTime: Date.now(), aborted: false })

    try {
      if (!text.trim()) return []

      // Stricter text length limit
      if (text.length > 3000) {
        text = text.slice(0, 3000)
      }

      // Check cache first
      const textHash = textProcessor.generateTextHash(text)
      const cached = suggestionCache.getCachedSuggestions(textHash)
      if (cached) {
        return cached
      }

      // Check abort signal before processing
      if (abortSignal?.aborted) {
        throw new Error("Request was aborted")
      }

      // Process text in chunks if it's too long
      const chunks = textProcessor.chunkText(text)
      const allSuggestions: EnhancedSuggestion[] = []

      // Process chunks sequentially to reduce memory pressure
      for (let i = 0; i < chunks.length; i++) {
        // Check abort signal before each chunk
        if (abortSignal?.aborted) {
          throw new Error("Request was aborted during processing")
        }

        const chunk = chunks[i]
        try {
          const chunkSuggestions = await this.processChunk(chunk, context, abortSignal)
          allSuggestions.push(...chunkSuggestions)
        } catch (error) {
          console.error(`Failed to process chunk ${i}:`, error)
          // Continue with other chunks instead of failing completely
          continue
        }

        // Small delay to allow garbage collection and check for abort
        await new Promise((resolve) => {
          const timeoutId = setTimeout(resolve, 10)

          // Clear timeout if aborted
          if (abortSignal?.aborted) {
            clearTimeout(timeoutId)
            resolve(undefined)
          }
        })
      }

      // Final abort check
      if (abortSignal?.aborted) {
        throw new Error("Request was aborted")
      }

      // Deduplicate and sort suggestions
      const uniqueSuggestions = this.deduplicateSuggestions(allSuggestions)
      const sortedSuggestions = this.sortSuggestionsByImportance(uniqueSuggestions)

      // Cache the results only if not aborted
      if (!abortSignal?.aborted) {
        suggestionCache.cacheSuggestions(textHash, sortedSuggestions)
      }

      return sortedSuggestions
    } catch (error) {
      console.error("AI suggestion generation failed:", error)

      // Mark process as aborted if it was an abort error
      const processInfo = this.activeProcesses.get(processId)
      if (processInfo && error instanceof Error && error.message.includes("aborted")) {
        processInfo.aborted = true
      }

      throw error
    } finally {
      this.processingCount--
      this.activeProcesses.delete(processId)

      // Cleanup old processes
      this.cleanupActiveProcesses()
    }
  }

  private async processChunk(
    chunk: TextChunk,
    globalContext?: string,
    abortSignal?: AbortSignal,
  ): Promise<EnhancedSuggestion[]> {
    // Check abort signal before processing
    if (abortSignal?.aborted) {
      throw new Error("Request was aborted")
    }

    const prompt = this.buildPrompt(chunk.text, chunk.context || globalContext)

    try {
      // Create a race condition between the AI call and abort signal
      const aiPromise = generateObject({
        model: this.model,
        schema: SuggestionSchema,
        prompt,
        temperature: 0.1,
        maxRetries: 1,
      })

      const abortPromise = new Promise<never>((_, reject) => {
        if (abortSignal) {
          abortSignal.addEventListener("abort", () => {
            reject(new Error("Request was aborted"))
          })
        }
      })

      const result = await Promise.race([aiPromise, abortPromise])

      return this.transformToSuggestions(result.object.suggestions, chunk)
    } catch (error) {
      console.error("Failed to process chunk:", error)

      // Don't throw on abort, just return empty array
      if (error instanceof Error && error.message.includes("aborted")) {
        return []
      }

      return []
    }
  }

  private cleanupActiveProcesses() {
    const now = Date.now()
    const maxAge = 2 * 60 * 1000 // 2 minutes

    for (const [processId, info] of this.activeProcesses.entries()) {
      if (now - info.startTime > maxAge) {
        console.warn(`Cleaning up stale process: ${processId}`)
        this.activeProcesses.delete(processId)
      }
    }
  }

  private buildPrompt(text: string, context?: string): string {
    // Limit prompt size to prevent memory issues
    const maxPromptLength = 2000
    let limitedText = text
    let limitedContext = context

    if (text.length > maxPromptLength * 0.7) {
      limitedText = text.slice(0, Math.floor(maxPromptLength * 0.7))
    }

    if (context && context.length > maxPromptLength * 0.3) {
      limitedContext = context.slice(0, Math.floor(maxPromptLength * 0.3))
    }

    return `You are an expert writing assistant. Analyze the following text for writing improvements and provide specific, actionable suggestions.

Consider these aspects:
- Grammar and spelling errors (mark as "error" severity)
- Style and clarity issues (mark as "warning" or "suggestion" severity)
- Conciseness opportunities
- Active voice recommendations
- Word choice improvements
- Sentence structure optimization

Guidelines:
- Focus on the most impactful improvements first
- Provide exact text positions (character indices)
- Give clear explanations for each suggestion
- Suggest specific replacements
- Rate your confidence (0.0 to 1.0)
- Provide contextual reasoning when helpful

${limitedContext ? `Context: ${limitedContext}` : ""}

Text to analyze:
"${limitedText}"

Provide suggestions in the specified JSON format. Only suggest changes that genuinely improve the writing.`
  }

  private transformToSuggestions(
    aiSuggestions: AISuggestionResponse["suggestions"],
    chunk: TextChunk,
  ): EnhancedSuggestion[] {
    return aiSuggestions.map((suggestion, index) => {
      const category = this.categorizeSuggestion(suggestion.severity, suggestion.confidence)

      return {
        id: `ai-${chunk.startIndex}-${index}-${Date.now()}`,
        type: suggestion.type,
        severity: suggestion.severity,
        text: suggestion.originalText,
        replacement: suggestion.suggestedText,
        explanation: suggestion.explanation,
        position: {
          start: chunk.startIndex + suggestion.startIndex,
          end: chunk.startIndex + suggestion.endIndex,
        },
        confidence: suggestion.confidence,
        category,
        aiGenerated: true,
        contextualReason: suggestion.contextualReason,
        alternativeOptions: suggestion.alternativeOptions,
      }
    })
  }

  private categorizeSuggestion(severity: string, confidence: number): "critical" | "important" | "minor" {
    if (severity === "error") return "critical"
    if (severity === "warning" && confidence > 0.8) return "important"
    if (confidence > 0.7) return "important"
    return "minor"
  }

  private deduplicateSuggestions(suggestions: EnhancedSuggestion[]): EnhancedSuggestion[] {
    const seen = new Set<string>()
    return suggestions.filter((suggestion) => {
      const key = `${suggestion.position.start}-${suggestion.position.end}-${suggestion.type}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private sortSuggestionsByImportance(suggestions: EnhancedSuggestion[]): EnhancedSuggestion[] {
    const categoryOrder = { critical: 0, important: 1, minor: 2 }

    return suggestions.sort((a, b) => {
      // First by category
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category]
      if (categoryDiff !== 0) return categoryDiff

      // Then by confidence
      const confidenceDiff = b.confidence - a.confidence
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff

      // Finally by position
      return a.position.start - b.position.start
    })
  }
}

export const aiSuggestionService = new AISuggestionService()
