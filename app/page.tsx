"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Auth } from "@/components/auth"
import { DocumentManager } from "@/components/document-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Settings, LogOut, Save, Clock, BarChart3 } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { calculateFleschReadingEase, type ReadabilityResult } from "@/lib/readability"
import { ReadabilityDisplay } from "@/components/readability-display"

type Document = Database["public"]["Tables"]["documents"]["Row"]

export default function GrammarlyClone() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [text, setText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [readabilityScore, setReadabilityScore] = useState<ReadabilityResult | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

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

    // Calculate readability score
    const readability = calculateFleschReadingEase(newText)
    setReadabilityScore(readability)
  }

  useEffect(() => {
    if (selectedDocument) {
      setText(selectedDocument.content)
    } else {
      setText("")
    }
  }, [selectedDocument])

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
    sentences: text.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0).length,
    paragraphs: text.split(/\n\s*\n/).filter((para) => para.trim().length > 0).length,
    readingTime: Math.ceil(
      text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length / 200,
    ), // Assuming 200 words per minute
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
              <FileText className="w-5 h-5 text-white" />
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Document Manager Sidebar */}
          <div className="lg:col-span-1">
            <DocumentManager
              userId={user.id}
              onSelectDocument={setSelectedDocument}
              selectedDocument={selectedDocument}
            />
          </div>

          {/* Main Editor */}
          <div className="lg:col-span-2">
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

          {/* Enhanced Stats Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Writing Analytics Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Writing Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReadabilityDisplay result={readabilityScore} wordCount={stats.words} />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Words</span>
                    <span className="font-medium">{stats.words}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Characters</span>
                    <span className="font-medium">{stats.characters}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sentences</span>
                    <span className="font-medium">{stats.sentences}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Paragraphs</span>
                    <span className="font-medium">{stats.paragraphs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Reading Time
                    </span>
                    <span className="font-medium">{stats.readingTime} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Writing Tips Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Writing Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3 pr-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-sm text-blue-900 mb-1">Keep it Simple</h4>
                      <p className="text-xs text-blue-700">
                        Use clear, concise language that your readers can easily understand.
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-sm text-green-900 mb-1">Active Voice</h4>
                      <p className="text-xs text-green-700">
                        Use active voice to make your writing more direct and engaging.
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-sm text-purple-900 mb-1">Vary Sentence Length</h4>
                      <p className="text-xs text-purple-700">
                        Mix short and long sentences to create rhythm in your writing.
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-sm text-orange-900 mb-1">Show, Don't Tell</h4>
                      <p className="text-xs text-orange-700">
                        Use specific examples and details to illustrate your points.
                      </p>
                    </div>
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
