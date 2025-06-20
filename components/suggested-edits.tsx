"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle, X, RefreshCw, Lightbulb } from "lucide-react"
import { aiWritingService, type DocumentAnalysis, type WritingSuggestion } from "@/lib/ai-service"
import { cn } from "@/lib/utils"

interface SuggestedEditsProps {
  content: string
  onApplySuggestion: (suggestion: WritingSuggestion) => void
}

export function SuggestedEdits({ content, onApplySuggestion }: SuggestedEditsProps) {
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState("")

  const analyzeContent = async (forceRefresh = false) => {
    if (!content.trim() || content.length < 50) {
      setAnalysis({
        suggestions: [],
        overallScore: 0,
        summary: "Write at least 50 characters to get AI suggestions.",
      })
      return
    }

    // Don't re-analyze the same content unless forced
    if (!forceRefresh && content === lastAnalyzedContent && analysis) {
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await aiWritingService.analyzeDocument(content)
      setAnalysis(result)
      setLastAnalyzedContent(content)
      setDismissedSuggestions(new Set()) // Reset dismissed suggestions on new analysis
    } catch (error) {
      console.error("Error analyzing content:", error)
      setAnalysis({
        suggestions: [],
        overallScore: 0,
        summary: "Error analyzing document. Please try again.",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Auto-analyze when content changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== lastAnalyzedContent) {
        analyzeContent()
      }
    }, 3000) // Wait 3 seconds after user stops typing

    return () => clearTimeout(timer)
  }, [content, lastAnalyzedContent])

  const handleApplySuggestion = (suggestion: WritingSuggestion) => {
    onApplySuggestion(suggestion)
    setDismissedSuggestions((prev) => new Set([...prev, suggestion.id]))
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions((prev) => new Set([...prev, suggestionId]))
  }

  const getSeverityColor = (severity: WritingSuggestion["severity"]) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeIcon = (type: WritingSuggestion["type"]) => {
    switch (type) {
      case "grammar":
        return "📝"
      case "style":
        return "✨"
      case "clarity":
        return "🔍"
      case "tone":
        return "🎭"
      case "word-choice":
        return "📖"
      default:
        return "💡"
    }
  }

  const visibleSuggestions = analysis?.suggestions.filter((s) => !dismissedSuggestions.has(s.id)) || []
  const scoreColor = analysis?.overallScore
    ? analysis.overallScore >= 80
      ? "text-green-600"
      : analysis.overallScore >= 60
        ? "text-yellow-600"
        : "text-red-600"
    : "text-gray-400"

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI Suggestions
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => analyzeContent(true)} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        {analysis && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Writing Score:</span>
              <span className={cn("font-semibold", scoreColor)}>{analysis.overallScore}/100</span>
            </div>
            <Progress value={analysis.overallScore} className="h-2" />
            <p className="text-xs text-gray-500">{analysis.summary}</p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-[480px]">
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Analyzing your writing...</p>
              </div>
            </div>
          ) : visibleSuggestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Great work!</p>
              <p className="text-xs text-gray-500">
                {content.length < 50 ? "Write more content to get suggestions" : "No suggestions available"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {visibleSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getTypeIcon(suggestion.type)}</span>
                      <Badge variant="outline" className={cn("text-xs", getSeverityColor(suggestion.severity))}>
                        {suggestion.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismissSuggestion(suggestion.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="text-gray-500">Original:</span>
                      <div className="bg-red-50 p-2 rounded text-red-800 mt-1 font-mono">
                        "{suggestion.originalText}"
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="text-gray-500">Suggested:</span>
                      <div className="bg-green-50 p-2 rounded text-green-800 mt-1 font-mono">
                        "{suggestion.suggestedText}"
                      </div>
                    </div>

                    <p className="text-xs text-gray-600">{suggestion.explanation}</p>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="w-full mt-2"
                    >
                      Apply Suggestion
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
