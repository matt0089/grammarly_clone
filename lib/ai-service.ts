import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export interface DocumentSuggestion {
  id: string
  type: "grammar" | "style" | "clarity" | "tone"
  severity: "low" | "medium" | "high"
  title: string
  description: string
  originalText: string
  suggestedText: string
  startIndex: number
  endIndex: number
  explanation: string
}

export interface SuggestionResponse {
  suggestions: DocumentSuggestion[]
  summary: {
    totalIssues: number
    grammarIssues: number
    styleIssues: number
    clarityIssues: number
    toneIssues: number
  }
}

export class AIService {
  private static instance: AIService
  private requestQueue: Map<string, Promise<SuggestionResponse>> = new Map()

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  async analyzeDoucment(content: string, documentId: string): Promise<SuggestionResponse> {
    // Check if there's already a request in progress for this document
    const existingRequest = this.requestQueue.get(documentId)
    if (existingRequest) {
      return existingRequest
    }

    // Minimum content length check
    if (content.trim().length < 50) {
      return {
        suggestions: [],
        summary: {
          totalIssues: 0,
          grammarIssues: 0,
          styleIssues: 0,
          clarityIssues: 0,
          toneIssues: 0,
        },
      }
    }

    const analysisPromise = this.performAnalysis(content)
    this.requestQueue.set(documentId, analysisPromise)

    try {
      const result = await analysisPromise
      return result
    } finally {
      // Clean up the request from queue
      this.requestQueue.delete(documentId)
    }
  }

  private async performAnalysis(content: string): Promise<SuggestionResponse> {
    try {
      const prompt = `You are an expert writing assistant. Analyze the following text and provide specific, actionable suggestions for improvement. Focus on:

1. Grammar errors (subject-verb agreement, punctuation, etc.)
2. Style improvements (word choice, sentence structure)
3. Clarity issues (unclear phrasing, ambiguous references)
4. Tone consistency (formal/informal, active/passive voice)

For each suggestion, provide:
- The exact text that needs improvement
- A specific replacement suggestion
- A brief explanation of why the change improves the writing
- The character positions where the issue occurs

Text to analyze:
"""
${content}
"""

Respond with a JSON object in this exact format:
{
  "suggestions": [
    {
      "id": "unique_id",
      "type": "grammar|style|clarity|tone",
      "severity": "low|medium|high",
      "title": "Brief title of the issue",
      "description": "Short description",
      "originalText": "exact text from document",
      "suggestedText": "improved version",
      "startIndex": number,
      "endIndex": number,
      "explanation": "why this change helps"
    }
  ]
}

Limit to the 5 most important suggestions. Ensure all character indices are accurate.`

      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
        temperature: 0.3,
        maxTokens: 2000,
      })

      // Parse the AI response
      const aiResponse = this.parseAIResponse(text, content)

      // Generate summary
      const summary = this.generateSummary(aiResponse.suggestions)

      return {
        suggestions: aiResponse.suggestions,
        summary,
      }
    } catch (error) {
      console.error("AI analysis error:", error)
      return {
        suggestions: [],
        summary: {
          totalIssues: 0,
          grammarIssues: 0,
          styleIssues: 0,
          clarityIssues: 0,
          toneIssues: 0,
        },
      }
    }
  }

  private parseAIResponse(aiText: string, originalContent: string): { suggestions: DocumentSuggestion[] } {
    try {
      // Extract JSON from the AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response")
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validate and clean up suggestions
      const validSuggestions: DocumentSuggestion[] = []

      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        for (const suggestion of parsed.suggestions) {
          // Validate required fields
          if (!suggestion.originalText || !suggestion.suggestedText) {
            continue
          }

          // Find the actual position of the text in the document
          const startIndex = originalContent.indexOf(suggestion.originalText)
          if (startIndex === -1) {
            // Try to find a close match
            const words = suggestion.originalText.split(" ")
            const firstWord = words[0]
            const possibleStart = originalContent.indexOf(firstWord)
            if (possibleStart !== -1) {
              suggestion.startIndex = possibleStart
              suggestion.endIndex = possibleStart + suggestion.originalText.length
            } else {
              continue // Skip if we can't find the text
            }
          } else {
            suggestion.startIndex = startIndex
            suggestion.endIndex = startIndex + suggestion.originalText.length
          }

          // Ensure required fields have defaults
          validSuggestions.push({
            id: suggestion.id || `suggestion_${Date.now()}_${Math.random()}`,
            type: suggestion.type || "style",
            severity: suggestion.severity || "medium",
            title: suggestion.title || "Improvement suggestion",
            description: suggestion.description || "Consider this improvement",
            originalText: suggestion.originalText,
            suggestedText: suggestion.suggestedText,
            startIndex: suggestion.startIndex,
            endIndex: suggestion.endIndex,
            explanation: suggestion.explanation || "This change improves readability",
          })
        }
      }

      return { suggestions: validSuggestions }
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return { suggestions: [] }
    }
  }

  private generateSummary(suggestions: DocumentSuggestion[]) {
    const summary = {
      totalIssues: suggestions.length,
      grammarIssues: 0,
      styleIssues: 0,
      clarityIssues: 0,
      toneIssues: 0,
    }

    suggestions.forEach((suggestion) => {
      switch (suggestion.type) {
        case "grammar":
          summary.grammarIssues++
          break
        case "style":
          summary.styleIssues++
          break
        case "clarity":
          summary.clarityIssues++
          break
        case "tone":
          summary.toneIssues++
          break
      }
    })

    return summary
  }

  // Method to apply a suggestion to text
  applySuggestion(content: string, suggestion: DocumentSuggestion): string {
    const before = content.substring(0, suggestion.startIndex)
    const after = content.substring(suggestion.endIndex)
    return before + suggestion.suggestedText + after
  }
}

export const aiService = AIService.getInstance()
