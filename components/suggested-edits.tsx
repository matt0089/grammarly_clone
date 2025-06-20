"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, RefreshCw, Lightbulb, AlertCircle, Info, Zap } from "lucide-react"
import { aiService, type DocumentSuggestion, type SuggestionResponse } from "@/lib/ai-service"
import { getSuggestionIcon, getSuggestionColor } from "@/lib/suggestion-types"

interface SuggestedEditsProps {
  content: string
  documentId: string | null
  workspaceId: string
  onApplySuggestion: (suggestion: DocumentSuggestion) => void
  isEnabled: boolean
}

export function SuggestedEdits({
  content,
  documentId,
  workspaceId,
  onApplySuggestion,
  isEnabled,
}: SuggestedEditsProps) {
  const [suggestions, setSuggestions] = useState<DocumentSuggestion[]>([])
  const [summary, setSummary] = useState<SuggestionResponse["summary"] | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState("")
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const analyzeContent = useCallback(async () => {
    if (!isEnabled || !documentId || !workspaceId || content.trim().length < 50) {
      setSuggestions([])
      setSummary(null)
      return
    }

    // Don't re-analyze if content hasn't changed significantly
    if (content === lastAnalyzedContent) {
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await aiService.analyzeDoucment(content, documentId, workspaceId)
      setSuggestions(response.suggestions)
      setSummary(response.summary)
      setLastAnalyzedContent(content)
      setAppliedSuggestions(new Set()) // Reset applied suggestions for new analysis
    } catch (err) {
      console.error("Analysis error:", err)
      setError("Failed to analyze document. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }, [content, documentId, workspaceId, isEnabled, lastAnalyzedContent])

  // Auto-analyze when content changes (with debouncing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      analyzeContent()
    }, 3000) // Wait 3 seconds after user stops typing

    return () => clearTimeout(timeoutId)
  }, [analyzeContent])

  const handleApplySuggestion = (suggestion: DocumentSuggestion) => {
    onApplySuggestion(suggestion)
    setAppliedSuggestions((prev) => new Set([...prev, suggestion.id]))
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
  }

  const handleRefreshAnalysis = () => {
    setLastAnalyzedContent("") // Force re-analysis
    analyzeContent()
  }

  if (!isEnabled || !documentId) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Suggested Edits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Select a document</p>
            <p className="text-sm">AI suggestions will appear here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (content.trim().length < 50) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Suggested Edits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Info className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Write more content</p>
            <p className="text-sm">Need at least 50 characters for analysis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Suggested Edits
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefreshAnalysis} disabled={isAnalyzing}>
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        {summary && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Issues found</span>
              <span className="font-medium">{summary.totalIssues}</span>
            </div>
            {summary.totalIssues > 0 && (
              <Progress
                value={((summary.totalIssues - suggestions.length) / summary.totalIssues) * 100}
                className="h-2"
              />
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px]">
          <div className="space-y-3 pr-4">
            {isAnalyzing && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Analysis Error</span>
                </div>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <Button variant="outline" size="sm" onClick={handleRefreshAnalysis} className="mt-2">
                  Try Again
                </Button>
              </div>
            )}

            {!isAnalyzing && !error && suggestions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="font-medium">Great writing!</p>
                <p className="text-sm">No suggestions at this time</p>
              </div>
            )}

            {suggestions.map((suggestion) => {
              const isApplied = appliedSuggestions.has(suggestion.id)
              const colorClasses = getSuggestionColor(suggestion.severity)

              return (
                <div
                  key={suggestion.id}
                  className={`p-3 border rounded-lg transition-all ${
                    isApplied ? "opacity-50 bg-gray-50" : colorClasses
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getSuggestionIcon(suggestion.type)}</span>
                      <h4 className="font-medium text-sm">{suggestion.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type}
                      </Badge>
                    </div>
                    <Badge variant={suggestion.severity === "high" ? "destructive" : "secondary"} className="text-xs">
                      {suggestion.severity}
                    </Badge>
                  </div>

                  <p className="text-xs mb-3">{suggestion.description}</p>

                  <div className="space-y-2 mb-3">
                    <div className="p-2 bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">Original: </span>
                      <span className="font-mono">{suggestion.originalText}</span>
                    </div>
                    <div className="p-2 bg-green-100 rounded text-xs">
                      <span className="text-gray-600">Suggested: </span>
                      <span className="font-mono">{suggestion.suggestedText}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-3">{suggestion.explanation}</p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApplySuggestion(suggestion)}
                      disabled={isApplied}
                      className="text-xs"
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Applied
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1" />
                          Apply
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDismissSuggestion(suggestion.id)}
                      className="text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
