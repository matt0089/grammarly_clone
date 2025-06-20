"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Check, X, RefreshCw, AlertCircle, Clock, Zap, Eye } from "lucide-react"
import { AIEditingService, type EditingSuggestion, type DocumentAnalysis } from "@/lib/ai-editing-service"

interface SuggestedEditsProps {
  text: string
  onApplySuggestion: (suggestion: EditingSuggestion) => void
  isEnabled?: boolean
}

export function SuggestedEdits({ text, onApplySuggestion, isEnabled = true }: SuggestedEditsProps) {
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [lastAnalyzedText, setLastAnalyzedText] = useState("")
  const debounceRef = useRef<NodeJS.Timeout>()

  // Debounced analysis trigger
  useEffect(() => {
    if (!isEnabled || text === lastAnalyzedText) return

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set new timeout for analysis
    debounceRef.current = setTimeout(() => {
      analyzeText(text)
    }, 3000) // 3 second delay

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [text, isEnabled, lastAnalyzedText])

  const analyzeText = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim() || textToAnalyze.length < 50) {
      setAnalysis(null)
      return
    }

    setIsAnalyzing(true)
    setDismissedSuggestions(new Set()) // Reset dismissed suggestions for new analysis

    try {
      const result = await AIEditingService.analyzeDocument(textToAnalyze, (progressAnalysis) => {
        setAnalysis(progressAnalysis)
      })

      setAnalysis(result)
      setLastAnalyzedText(textToAnalyze)
    } catch (error) {
      console.error("Analysis failed:", error)
      setAnalysis({
        totalChunks: 0,
        completedChunks: 0,
        suggestions: [],
        isComplete: true,
        errors: ["Analysis failed. Please try again."],
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleApplySuggestion = (suggestion: EditingSuggestion) => {
    onApplySuggestion(suggestion)
    setDismissedSuggestions((prev) => new Set([...prev, suggestion.id]))
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions((prev) => new Set([...prev, suggestionId]))
  }

  const handleRetryAnalysis = () => {
    analyzeText(text)
  }

  const getPriorityIcon = (priority: 1 | 2 | 3) => {
    switch (priority) {
      case 1:
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 2:
        return <Zap className="w-4 h-4 text-orange-500" />
      case 3:
        return <Eye className="w-4 h-4 text-blue-500" />
    }
  }

  const getPriorityLabel = (priority: 1 | 2 | 3) => {
    switch (priority) {
      case 1:
        return "Critical"
      case 2:
        return "Important"
      case 3:
        return "Minor"
    }
  }

  const getPriorityColor = (priority: 1 | 2 | 3) => {
    switch (priority) {
      case 1:
        return "bg-red-100 text-red-800 border-red-200"
      case 2:
        return "bg-orange-100 text-orange-800 border-orange-200"
      case 3:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const visibleSuggestions =
    analysis?.suggestions.filter((suggestion) => !dismissedSuggestions.has(suggestion.id)) || []

  const progressPercentage = analysis ? (analysis.completedChunks / Math.max(analysis.totalChunks, 1)) * 100 : 0

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gray-400" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">AI suggestions disabled</p>
            <p className="text-sm">Select a document to get AI-powered editing suggestions</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Suggestions
            {visibleSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {visibleSuggestions.length}
              </Badge>
            )}
          </CardTitle>
          {analysis && !isAnalyzing && (
            <Button variant="ghost" size="sm" onClick={handleRetryAnalysis} className="h-8 w-8 p-0">
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {isAnalyzing && analysis && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Analyzing document...</span>
              <span>
                {analysis.completedChunks}/{analysis.totalChunks} sections
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[520px]">
          <div className="space-y-3 pr-4">
            {/* Show errors if any */}
            {analysis?.errors && analysis.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {analysis.errors[0]}
                  {analysis.errors.length > 1 && ` (+${analysis.errors.length - 1} more)`}
                </AlertDescription>
              </Alert>
            )}

            {/* Loading state */}
            {isAnalyzing && !analysis && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">Analyzing your writing...</p>
              </div>
            )}

            {/* No suggestions state */}
            {!isAnalyzing && analysis?.isComplete && visibleSuggestions.length === 0 && text.trim().length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">Great writing!</p>
                <p className="text-sm">No suggestions at this time.</p>
              </div>
            )}

            {/* Empty state */}
            {!analysis && !isAnalyzing && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Start writing</p>
                <p className="text-sm">AI suggestions will appear as you write</p>
              </div>
            )}

            {/* Suggestions */}
            {visibleSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(suggestion.priority)}
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                      {getPriorityLabel(suggestion.priority)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissSuggestion(suggestion.id)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Original:</p>
                    <p className="text-sm bg-red-50 p-2 rounded border-l-2 border-red-200 font-mono">
                      "{suggestion.original}"
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Suggested:</p>
                    <p className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-200 font-mono">
                      "{suggestion.suggested}"
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reason:</p>
                    <p className="text-sm text-gray-700">{suggestion.reason}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Analysis in progress indicator */}
            {isAnalyzing && analysis && visibleSuggestions.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                <div className="animate-pulse">Finding more suggestions...</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
