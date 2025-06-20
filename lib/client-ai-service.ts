import type { EnhancedSuggestion } from "./ai-types"

export class ClientAIService {
  /**
   * Generate AI suggestions by calling the API route
   */
  async generateSuggestions(text: string, context?: string): Promise<EnhancedSuggestion[]> {
    if (!text.trim()) return []

    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, context }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.suggestions || []
    } catch (error) {
      console.error("Failed to get AI suggestions:", error)
      throw error
    }
  }
}

export const clientAIService = new ClientAIService()
