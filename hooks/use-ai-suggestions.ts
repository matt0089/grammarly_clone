"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { EnhancedSuggestion } from "@/lib/ai-types"
import { hybridProcessor } from "@/lib/hybrid-processor"

interface UseAISuggestionsReturn {
  suggestions: EnhancedSuggestion[]
  isProcessingAI: boolean
  error: string | null
  refreshSuggestions: () => void
}

export function useAISuggestions(text: string): UseAISuggestionsReturn {
  const [suggestions, setSuggestions] = useState<EnhancedSuggestion[]>([])
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastTextRef = useRef("")

  const processSuggestions = useCallback(async (textToProcess: string) => {
    if (!textToProcess.trim()) {
      setSuggestions([])
      setIsProcessingAI(false)
      return
    }

    try {
      setError(null)
      const result = await hybridProcessor.getSuggestions(textToProcess)
      setSuggestions(result.suggestions)
      setIsProcessingAI(result.isProcessingAI)
    } catch (err) {
      console.error("Failed to get suggestions:", err)
      setError(err instanceof Error ? err.message : "Failed to get suggestions")
      setIsProcessingAI(false)
    }
  }, [])

  const debouncedProcess = useCallback(
    (textToProcess: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Immediate processing for small changes, debounced for larger ones
      const delay = textToProcess.length > 1000 ? 1500 : 500

      timeoutRef.current = setTimeout(() => {
        processSuggestions(textToProcess)
      }, delay)
    },
    [processSuggestions],
  )

  const refreshSuggestions = useCallback(() => {
    if (lastTextRef.current) {
      processSuggestions(lastTextRef.current)
    }
  }, [processSuggestions])

  useEffect(() => {
    lastTextRef.current = text
    debouncedProcess(text)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text, debouncedProcess])

  // Listen for AI suggestion updates
  useEffect(() => {
    const handleSuggestionsUpdate = (event: CustomEvent) => {
      setSuggestions(event.detail.suggestions)
      setIsProcessingAI(false)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("suggestionsUpdated", handleSuggestionsUpdate as EventListener)

      return () => {
        window.removeEventListener("suggestionsUpdated", handleSuggestionsUpdate as EventListener)
      }
    }
  }, [])

  return {
    suggestions,
    isProcessingAI,
    error,
    refreshSuggestions,
  }
}
