import { supabase } from "@/lib/supabase"

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

    const analysisPromise = this.performAnalysis(content, documentId)
    this.requestQueue.set(documentId, analysisPromise)

    try {
      const result = await analysisPromise
      return result
    } finally {
      // Clean up the request from queue
      this.requestQueue.delete(documentId)
    }
  }

  private async performAnalysis(content: string, documentId: string): Promise<SuggestionResponse> {
    try {
      // Get the current session token
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("No valid session found")
      }

      // Call our secure API route
      const response = await fetch("/api/analyze-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content,
          documentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Analysis failed")
      }

      const result: SuggestionResponse = await response.json()
      return result
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

  // Method to apply a suggestion to text
  applySuggestion(content: string, suggestion: DocumentSuggestion): string {
    const before = content.substring(0, suggestion.startIndex)
    const after = content.substring(suggestion.endIndex)
    return before + suggestion.suggestedText + after
  }
}

export const aiService = AIService.getInstance()
