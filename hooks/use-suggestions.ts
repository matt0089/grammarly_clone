"use client"

import { useState, useCallback } from "react"
import { aiService, type SuggestionEdit, type DocumentAnalysis } from "@/lib/ai-service"

export interface UseSuggestionsReturn {
  isAnalyzing: boolean
  analysis: DocumentAnalysis | null
  error: string | null
  analyzeContent: (content: string, documentId?: string) => Promise<void>
  applySuggestion: (content: string, suggestion: SuggestionEdit) => string
  clearError: () => void
}

export function useSuggestions(): UseSuggestionsReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyzeContent = useCallback(async (content: string, documentId?: string) => {
    if (content.trim().length < 10) {
      setAnalysis(null)
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const result = await aiService.analyzeDocument(content, documentId)
      setAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
      setAnalysis(null)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const applySuggestion = useCallback((content: string, suggestion: SuggestionEdit): string => {
    return aiService.applySuggestion(content, suggestion)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isAnalyzing,
    analysis,
    error,
    analyzeContent,
    applySuggestion,
    clearError,
  }
}
