import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import type { EnhancedSuggestion, TextChunk, AISuggestionResponse } from "./ai-types"
import { SuggestionSchema } from "./ai-types"
import { textProcessor } from "./text-processor"
import { suggestionCache } from "./suggestion-cache"

export class AISuggestionService {
  private readonly model = openai("gpt-4o-mini") // This will only work on server side

  /**
   * Generate AI-powered suggestions for text (SERVER SIDE ONLY)
   */
  async generateSuggestions(text: string, context?: string): Promise<EnhancedSuggestion[]> {
    // Verify we're on the server side
    if (typeof window !== "undefined") {
      throw new Error("AISuggestionService can only be used on the server side")
    }

    if (!text.trim()) return []

    // Check cache first
    const textHash = textProcessor.generateTextHash(text)
    const cached = suggestionCache.getCachedSuggestions(textHash)
    if (cached) {
      return cached
    }

    try {
      // Process text in chunks if it's too long
      const chunks = textProcessor.chunkText(text)
      const allSuggestions: EnhancedSuggestion[] = []

      for (const chunk of chunks) {
        const chunkSuggestions = await this.processChunk(chunk, context)
        allSuggestions.push(...chunkSuggestions)
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

  // ... rest of the methods remain the same
  private async processChunk(chunk: TextChunk, globalContext?: string): Promise<EnhancedSuggestion[]> {
    const prompt = this.buildPrompt(chunk.text, chunk.context || globalContext)

    try {
      const result = await generateObject({
        model: this.model,
        schema: SuggestionSchema,
        prompt,
        temperature: 0.3,
      })

      return this.transformToSuggestions(result.object.suggestions, chunk)
    } catch (error) {
      console.error("Failed to process chunk:", error)
      return []
    }
  }

  private buildPrompt(text: string, context?: string): string {
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

${context ? `Context: ${context}` : ""}

Text to analyze:
"${text}"

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
