import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import type { EnhancedSuggestion, TextChunk, AISuggestionResponse } from "./ai-types"
import { SuggestionSchema } from "./ai-types"
import { textProcessor } from "./text-processor"
import { suggestionCache } from "./suggestion-cache"

export class AISuggestionService {
  private readonly model = openai("gpt-4o-mini") // Using mini model to reduce memory usage

  /**
   * Generate AI-powered suggestions for text (SERVER SIDE ONLY)
   */
  async generateSuggestions(text: string, context?: string): Promise<EnhancedSuggestion[]> {
    // Verify we're on the server side
    if (typeof window !== "undefined") {
      throw new Error("AISuggestionService can only be used on the server side")
    }

    if (!text.trim()) return []

    // Add text length limits to prevent memory issues
    if (text.length > 5000) {
      console.warn(`Text too long (${text.length} chars), truncating to 5000 chars`)
      text = text.slice(0, 5000)
    }

    // Check cache first
    const textHash = textProcessor.generateTextHash(text)
    const cached = suggestionCache.getCachedSuggestions(textHash)
    if (cached) {
      return cached
    }

    try {
      // Process text in smaller chunks to reduce memory usage
      const chunks = textProcessor.chunkText(text)
      const allSuggestions: EnhancedSuggestion[] = []

      // Process chunks sequentially instead of in parallel to reduce memory pressure
      for (const chunk of chunks) {
        try {
          const chunkSuggestions = await this.processChunk(chunk, context)
          allSuggestions.push(...chunkSuggestions)

          // Add small delay between chunks to prevent overwhelming the API
          if (chunks.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        } catch (chunkError) {
          console.error(`Failed to process chunk starting at ${chunk.startIndex}:`, chunkError)
          // Continue with other chunks instead of failing completely
        }
      }

      // Deduplicate and sort suggestions
      const uniqueSuggestions = this.deduplicateSuggestions(allSuggestions)
      const sortedSuggestions = this.sortSuggestionsByImportance(uniqueSuggestions)

      // Cache the results
      suggestionCache.cacheSuggestions(textHash, sortedSuggestions)

      return sortedSuggestions
    } catch (error) {
      console.error("AI suggestion generation failed:", error)
      throw error
    }
  }

  private async processChunk(chunk: TextChunk, globalContext?: string): Promise<EnhancedSuggestion[]> {
    const prompt = this.buildPrompt(chunk.text, chunk.context || globalContext)

    try {
      const result = await generateObject({
        model: this.model,
        schema: SuggestionSchema,
        prompt,
        temperature: 0.1, // Lower temperature for more consistent results
        maxRetries: 1, // Reduce retries to prevent memory buildup
        maxTokens: 1000, // Limit response size
      })

      return this.transformToSuggestions(result.object.suggestions, chunk)
    } catch (error) {
      console.error("Failed to process chunk:", error)
      return []
    }
  }

  private buildPrompt(text: string, context?: string): string {
    // Shorter, more focused prompt to reduce token usage
    return `Analyze this text for writing improvements. Focus on the most important issues only.

Rules:
- Maximum 5 suggestions per text
- Use exact character positions
- Confidence between 0.0-1.0
- Only suggest meaningful improvements

${context ? `Context: ${context.slice(0, 200)}` : ""}

Text: "${text}"

Return JSON with suggestions array.`
  }

  private transformToSuggestions(
    aiSuggestions: AISuggestionResponse["suggestions"],
    chunk: TextChunk,
  ): EnhancedSuggestion[] {
    // Limit the number of suggestions to prevent memory issues
    const limitedSuggestions = aiSuggestions.slice(0, 5)

    return limitedSuggestions.map((suggestion, index) => {
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
        alternativeOptions: suggestion.alternativeOptions?.slice(0, 3), // Limit alternatives
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

    return suggestions
      .sort((a, b) => {
        // First by category
        const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category]
        if (categoryDiff !== 0) return categoryDiff

        // Then by confidence
        const confidenceDiff = b.confidence - a.confidence
        if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff

        // Finally by position
        return a.position.start - b.position.start
      })
      .slice(0, 10) // Limit total suggestions to prevent memory issues
  }
}

export const aiSuggestionService = new AISuggestionService()
