"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Auth } from "@/components/auth"
import { DocumentManager } from "@/components/document-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, CheckCircle2, Lightbulb, Target, BookOpen, FileText, Settings, LogOut, Save } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { calculateFleschReadingEase, getReadabilityColor, getReadabilityDescription } from "@/lib/readability"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface Suggestion {
  id: string
  type: "grammar" | "spelling" | "style" | "clarity"
  severity: "error" | "warning" | "suggestion"
  text: string
  replacement: string
  explanation: string
  position: { start: number; end: number }
}

const GRAMMAR_RULES = [
  {
    pattern: /\bthere\s+is\s+(\w+)\s+(\w+s)\b/gi,
    replacement: "there are $1 $2",
    type: "grammar" as const,
    explanation: 'Use "there are" with plural nouns',
  },
  {
    pattern: /\byour\s+welcome\b/gi,
    replacement: "you're welcome",
    type: "grammar" as const,
    explanation: 'Use "you\'re" (you are) instead of "your"',
  },
  {
    pattern: /\bits\s+a\s+good\s+idea\b/gi,
    replacement: "it's a good idea",
    type: "grammar" as const,
    explanation: 'Use "it\'s" (it is) instead of "its"',
  },
  {
    pattern: /\b(recieve|recieved|recieving)\b/gi,
    replacement: (match: string) => match.replace("ie", "ei"),
    type: "spelling" as const,
    explanation: 'Remember: "i before e except after c"',
  },
  {
    pattern: /\b(seperate|seperated|seperating)\b/gi,
    replacement: (match: string) =>
      match.replace("seperate", "separate").replace("seperated", "separated").replace("seperating", "separating"),
    type: "spelling" as const,
    explanation: 'Correct spelling is "separate"',
  },
  {
    pattern: /\bvery\s+(\w+)\b/gi,
    replacement: "$1",
    type: "style" as const,
    explanation: 'Consider removing "very" for more concise writing',
  },
  {
    pattern: /\bin\s+order\s+to\b/gi,
    replacement: "to",
    type: "clarity" as const,
    explanation: 'Simply use "to" instead of "in order to"',
  },
]

export default function GrammarlyClone() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [text, setText] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [readabilityScore, setReadabilityScore] = useState<number>(0)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  const checkText = (content: string) => {
    const newSuggestions: Suggestion[] = []

    GRAMMAR_RULES.forEach((rule, ruleIndex) => {
      let match
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags)

      while ((match = regex.exec(content)) !== null) {
        const replacement =
          typeof rule.replacement === "function"
            ? rule.replacement(match[0])
            : rule.replacement.replace(/\$(\d+)/g, (_, num) => match[Number.parseInt(num)] || "")

        newSuggestions.push({
          id: `${ruleIndex}-${match.index}`,
          type: rule.type,
          severity: rule.type === "spelling" || rule.type === "grammar" ? "error" : "suggestion",
          text: match[0],
          replacement,
          explanation: rule.explanation,
          position: { start: match.index, end: match.index + match[0].length },
        })
      }
    })

    setSuggestions(newSuggestions)

    // Calculate readability score
    const score = calculateFleschReadingEase(content)
    setReadabilityScore(score)
  }

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

  useEffect(() => {
    const timer = setTimeout(() => {
      checkText(text)
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

  const applySuggestion = (suggestion: Suggestion) => {
    const newText =
      text.slice(0, suggestion.position.start) + suggestion.replacement + text.slice(suggestion.position.end)
    handleTextChange(newText)
    setSelectedSuggestion(null)
  }

  const ignoreSuggestion = (suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
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
    suggestions: suggestions.filter((s) => s.severity === "suggestion").length,
  }

  const getSuggestionIcon = (type: string, severity: string) => {
    if (severity === "error") return <AlertCircle className="w-4 h-4 text-red-500" />
    if (type === "style") return <Lightbulb className="w-4 h-4 text-blue-500" />
    if (type === "clarity") return <Target className="w-4 h-4 text-green-500" />
    return <BookOpen className="w-4 h-4 text-yellow-500" />
  }

  if (!user) {
    return <Auth onAuthChange={setUser} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Writing Assistant</h1>
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
            <span className="text-sm text-gray-600">Welcome, {user.email}</span>
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

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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
                <CardTitle className="text-lg">Writing Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Issues Found</span>
                  <Badge variant={stats.errors > 0 ? "destructive" : "secondary"}>
                    {stats.errors + stats.suggestions}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Words</span>
                  <span className="font-medium">{stats.words}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Characters</span>
                  <span className="font-medium">{stats.characters}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Readability</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        getReadabilityColor(readabilityScore) === "green"
                          ? "bg-green-500"
                          : getReadabilityColor(readabilityScore) === "yellow"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <span className="font-medium">{readabilityScore}</span>
                    <span className="text-xs text-gray-500">({getReadabilityDescription(readabilityScore)})</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suggestions Card */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Suggestions ({suggestions.length})
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
                            {getSuggestionIcon(suggestion.type, suggestion.severity)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.type}
                                </Badge>
                                <Badge
                                  variant={suggestion.severity === "error" ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {suggestion.severity}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                "{suggestion.text}" → "{suggestion.replacement}"
                              </p>
                              <p className="text-xs text-gray-600 mb-3">{suggestion.explanation}</p>
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
