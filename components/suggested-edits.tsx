"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle, XCircle, RefreshCw, Lightbulb, Zap } from "lucide-react"
import { aiService, type SuggestionEdit, type DocumentAnalysis } from "@/lib/ai-service"
import { cn } from "@/lib/utils"

interface SuggestedEditsProps {
  content: string
  onApplySuggestion: (suggestion: SuggestionEdit) => void
  documentId?: string
}

export function SuggestedEdits({ content, onApplySuggestion, documentId }: SuggestedEditsProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState("")
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())

  const analyzeContent = useCallback(
    async (text: string) => {
      if (text === lastAnalyzedContent || text.trim().length < 10) {
        return
      }

      setIsAnalyzing(true)
      setError(null)

      try {
        const result = await aiService.analyzeDocument(text, documentId)
        setAnalysis(result)
        setLastAnalyzedContent(text)
        setAppliedSuggestions(new Set()) // Reset applied suggestions for new analysis
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed")
        setAnalysis(null)
      } finally {
        setIsAnalyzing(false)
      }
    },
    [documentId, lastAnalyzedContent],
  )

  // Auto-analyze when content changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (content !== lastAnalyzedContent) {
        analyzeContent(content)
      }
    }, 2000) // 2 second delay

    return () => clearTimeout(timeoutId)
  }, [content, analyzeContent, lastAnalyzedContent])

  const handleApplySuggestion = (suggestion: SuggestionEdit) => {
    onApplySuggestion(suggestion)
    setAppliedSuggestions((prev) => new Set([...prev, suggestion.id]))
  }

  const handleRefreshAnalysis = () => {
    setLastAnalyzedContent("") // Force re-analysis
    analyzeContent(content)
  }

  const getConfidenceColor = (confidence: SuggestionEdit["confidence"]) => {
    switch (confidence) {
      case "high":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const availableSuggestions = analysis?.suggestions.filter((s) => !appliedSuggestions.has(s.id)) || []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Suggested Edits
          </CardTitle>
          <div className="flex items-center gap-2">
            {analysis && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Score:</span>
                <Badge variant="outline" className="text-xs">
                  {analysis.overallScore}/100
                </Badge>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleRefreshAnalysis} disabled={isAnalyzing}>
              <RefreshCw className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {analysis && (
          <div className="space-y-2">
            <Progress value={analysis.overallScore} className="h-2" />
            <p className="text-xs text-gray-600">{analysis.summary}</p>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[520px]">
          <div className="space-y-3 pr-4">
            {isAnalyzing && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-gray-600">Analyzing your writing...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-900">Analysis Error</span>
                </div>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {!isAnalyzing && !error && content.trim().length < 10 && (
              <div className="p-4 text-center text-gray-500">
                <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Write at least 10 words to get AI-powered suggestions</p>
              </div>
            )}

            {!isAnalyzing && !error && availableSuggestions.length === 0 && content.trim().length >= 10 && (
              <div className="p-4 text-center text-green-600">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Great writing!</p>
                <p className="text-xs text-gray-600">No suggestions at this time.</p>
              </div>
            )}

            {availableSuggestions.map((suggestion) => {
              const typeInfo = aiService.getSuggestionTypeInfo(suggestion.type)

              return (
                <div
                  key={suggestion.id}
                  className={cn("p-3 rounded-lg border transition-all hover:shadow-sm", typeInfo.bgColor)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {typeInfo.label}
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs", getConfidenceColor(suggestion.confidence))}>
                        {suggestion.confidence}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Original:</p>
                      <p className="text-sm bg-white/50 p-2 rounded border">"{suggestion.original}"</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 mb-1">Suggested:</p>
                      <p className="text-sm bg-white/70 p-2 rounded border font-medium">"{suggestion.suggested}"</p>
                    </div>

                    <p className={cn("text-xs", typeInfo.textColor)}>{suggestion.explanation}</p>

                    <Button size="sm" onClick={() => handleApplySuggestion(suggestion)} className="w-full mt-2">
                      Apply Suggestion
                    </Button>
                  </div>
                </div>
              )
            })}

            {appliedSuggestions.size > 0 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  ✓ Applied {appliedSuggestions.size} suggestion{appliedSuggestions.size !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
