"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Auth } from "@/components/auth"
import { DocumentManager } from "@/components/document-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Target,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  Save,
  MessageSquare,
  Edit,
  AlignLeft,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { calculateFleschReadingEase, type ReadabilityResult } from "@/lib/readability"
import { ReadabilityDisplay } from "@/components/readability-display"
import { useAISuggestions } from "@/hooks/use-ai-suggestions"
import type { EnhancedSuggestion } from "@/lib/ai-types"

type Document = Database["public"]["Tables"]["documents"]["Row"]

// Remove the old Suggestion interface and GRAMMAR_RULES array
// They are now handled by the AI system

export default function GrammarlyClone() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [text, setText] = useState("")
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [readabilityScore, setReadabilityScore] = useState<ReadabilityResult | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Use the new AI suggestions hook
  const { suggestions, isProcessingAI, error: suggestionsError, refreshSuggestions } = useAISuggestions(text)

  const saveDocument = async (content: string) => {
    if (!selectedDocument || !user) return

    setIsSaving(true)
    try {
      const { error } = await supabase.from("documents").update({ content }).eq("id", selectedDocument.id)

      if (error) throw error
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving document:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTextChange = (newText: string) => {
    setText(newText)

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Auto-save after 2 seconds of inactivity
    if (selectedDocument) {
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(newText)
      }, 2000)
    }
  }

  // Calculate readability score when text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const readability = calculateFleschReadingEase(text)
      setReadabilityScore(readability)
    }, 500)

    return () => clearTimeout(timer)
  }, [text])

  useEffect(() => {
    if (selectedDocument) {
      setText(selectedDocument.content)
    } else {
      setText("")
    }
  }, [selectedDocument])

  const applySuggestion = (suggestion: EnhancedSuggestion) => {
    const newText =
      text.slice(0, suggestion.position.start) + suggestion.replacement + text.slice(suggestion.position.end)
    handleTextChange(newText)
    setSelectedSuggestion(null)
  }

  const ignoreSuggestion = (suggestionId: string) => {
    // For now, we'll just hide it from the UI
    // In a full implementation, we'd track ignored suggestions
    setSelectedSuggestion(null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSelectedDocument(null)
    setText("")
  }

  const stats = {
    words: text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length,
    characters: text.length,
    errors: suggestions.filter((s) => s.severity === "error").length,
    suggestions: suggestions.length,
  }

  const getSuggestionIcon = (suggestion: EnhancedSuggestion) => {
    if (suggestion.aiGenerated) {
      return <Sparkles className="w-4 h-4 text-purple-500" />
    }

    if (suggestion.severity === "error") return <AlertCircle className="w-4 h-4 text-red-500" />

    switch (suggestion.type) {
      case "style":
        return <Lightbulb className="w-4 h-4 text-blue-500" />
      case "clarity":
        return <Target className="w-4 h-4 text-green-500" />
      case "conciseness":
        return <FileText className="w-4 h-4 text-purple-500" />
      case "active-voice":
        return <MessageSquare className="w-4 h-4 text-orange-500" />
      case "word-choice":
        return <Edit className="w-4 h-4 text-cyan-500" />
      case "sentence-structure":
        return <AlignLeft className="w-4 h-4 text-indigo-500" />
      default:
        return <BookOpen className="w-4 h-4 text-yellow-500" />
    }
  }

  if (!user) {
    return <Auth onAuthChange={setUser} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">DocWise AI</h1>
            {selectedDocument && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm font-medium">{selectedDocument.title}</span>
                {isSaving && <span className="text-xs text-gray-400">Saving...</span>}
                {lastSaved && !isSaving && (
                  <span className="text-xs text-gray-400">Saved {lastSaved.toLocaleTimeString()}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, email@example.com</span>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="w-full px-6 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Document Manager Sidebar */}
          <div className="lg:col-span-1">
            <DocumentManager
              userId={user.id}
              onSelectDocument={setSelectedDocument}
              selectedDocument={selectedDocument}
            />
          </div>

          {/* Main Editor */}
          <div className="lg:col-span-3">
            <Card className="h-[600px]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {selectedDocument ? selectedDocument.title : "Select a document"}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{stats.words} words</span>
                    <span>{stats.characters} characters</span>
                    {selectedDocument && (
                      <Button variant="outline" size="sm" onClick={() => saveDocument(text)} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-full pb-6">
                <div className="relative h-full">
                  <textarea
                    ref={editorRef}
                    value={text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="w-full h-full p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm leading-relaxed"
                    placeholder={selectedDocument ? "Start writing here..." : "Select a document to start writing"}
                    disabled={!selectedDocument}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Suggestions Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  Writing Stats
                  {isProcessingAI && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Issues Found</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={stats.errors > 0 ? "destructive" : "secondary"}>
                      {stats.errors + stats.suggestions}
                    </Badge>
                    {isProcessingAI && <span className="text-xs text-blue-600">Analyzing...</span>}
                  </div>
                </div>
                <ReadabilityDisplay result={readabilityScore} wordCount={stats.words} />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Words</span>
                  <span className="font-medium">{stats.words}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Characters</span>
                  <span className="font-medium">{stats.characters}</span>
                </div>
                {suggestionsError && (
                  <div className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    AI suggestions unavailable
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suggestions Card */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Suggestions ({suggestions.length})
                  </div>
                  <Button variant="ghost" size="sm" onClick={refreshSuggestions} disabled={isProcessingAI}>
                    <RefreshCw className={`w-4 h-4 ${isProcessingAI ? "animate-spin" : ""}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-3">
                    {suggestions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                        <p className="font-medium">Great job!</p>
                        <p className="text-sm">No issues found in your writing.</p>
                      </div>
                    ) : (
                      suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedSuggestion === suggestion.id
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedSuggestion(suggestion.id)}
                        >
                          <div className="flex items-start gap-3">
                            {getSuggestionIcon(suggestion)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={suggestion.type as any} className="text-xs">
                                  {suggestion.type.replace("-", " ")}
                                </Badge>
                                <Badge
                                  variant={suggestion.severity === "error" ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {suggestion.severity}
                                </Badge>
                                {suggestion.aiGenerated && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                    AI
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-500">
                                  {Math.round(suggestion.confidence * 100)}%
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                "{suggestion.text}" → "{suggestion.replacement}"
                              </p>
                              <p className="text-xs text-gray-600 mb-2">{suggestion.explanation}</p>
                              {suggestion.contextualReason && (
                                <p className="text-xs text-blue-600 mb-2 italic">{suggestion.contextualReason}</p>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    applySuggestion(suggestion)
                                  }}
                                  className="h-7 text-xs"
                                >
                                  Apply
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    ignoreSuggestion(suggestion.id)
                                  }}
                                  className="h-7 text-xs"
                                >
                                  Ignore
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
