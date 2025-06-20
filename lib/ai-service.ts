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
      console.log("Starting analysis request for document:", documentId)

      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      console.log("Session check:", {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionError: sessionError?.message,
      })

      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error("Session error: " + sessionError.message)
      }

      if (!session?.access_token) {
        console.error("No valid session found")
        throw new Error("No valid session found")
      }

      console.log("Making API request to /api/analyze-document")

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

      console.log("API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API error response:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Analysis failed`)
      }

      const result: SuggestionResponse = await response.json()
      console.log("Analysis successful:", {
        suggestionsCount: result.suggestions.length,
      })

      return result
    } catch (error) {
      console.error("AI analysis error:", error)

      // Return empty result instead of throwing to prevent UI crashes
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
