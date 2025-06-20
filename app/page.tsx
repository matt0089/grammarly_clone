"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Auth } from "@/components/auth"
import { DocumentManager } from "@/components/document-manager"
import { DocumentMetadataModal } from "@/components/document-metadata-modal"
import { WorkspaceProvider } from "@/lib/workspace-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Settings, LogOut, Save, Clock, BarChart3, PanelLeft } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { calculateFleschReadingEase, type ReadabilityResult } from "@/lib/readability"
import { ReadabilityDisplay } from "@/components/readability-display"
import { SuggestedEdits } from "@/components/suggested-edits"
import { aiService, type DocumentSuggestion } from "@/lib/ai-service"

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
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
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

    // Calculate readability score
    const readability = calculateFleschReadingEase(newText)
    setReadabilityScore(readability)
  }

  const handleMetadataUpdate = (updatedDocument: Document) => {
    setSelectedDocument(updatedDocument)
  }

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

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
    router.push("/")
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth onAuthChange={setUser} />
  }

  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">DocWise AI</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="ml-2"
                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <PanelLeft className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? "rotate-180" : ""}`} />
              </Button>
              {selectedDocument && (
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm font-medium">{selectedDocument.title}</span>
                  {selectedDocument.document_type && (
                    <span className="text-xs text-gray-400">({selectedDocument.document_type})</span>
                  )}
                  {isSaving && <span className="text-xs text-gray-400">Saving...</span>}
                  {lastSaved && !isSaving && (
                    <span className="text-xs text-gray-400">Saved {lastSaved.toLocaleTimeString()}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>

              {/* Analytics Modal Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Writing Analytics
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
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
                  </div>
                </DialogContent>
              </Dialog>

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
          <div className={`flex gap-6 transition-all duration-300`}>
            {/* Document Manager Sidebar */}
            {!isSidebarCollapsed && (
              <div className="w-64 flex-shrink-0">
                <DocumentManager
                  userId={user.id}
                  onSelectDocument={setSelectedDocument}
                  selectedDocument={selectedDocument}
                />
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex gap-6">
              {/* Text Editor */}
              <div className="flex-1">
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
                          <div className="flex items-center gap-2">
                            <DocumentMetadataModal
                              document={selectedDocument}
                              onMetadataUpdate={handleMetadataUpdate}
                            />
                            <Button variant="outline" size="sm" onClick={() => saveDocument(text)} disabled={isSaving}>
                              <Save className="w-4 h-4 mr-2" />
                              {isSaving ? "Saving..." : "Save"}
                            </Button>
                          </div>
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

              {/* Suggested Edits Card - Always on the right */}
              <div className="w-80 flex-shrink-0">
                <SuggestedEdits
                  content={text}
                  documentId={selectedDocument?.id || null}
                  onApplySuggestion={(suggestion: DocumentSuggestion) => {
                    const newText = aiService.applySuggestion(text, suggestion)
                    setText(newText)
                    // Auto-save the changes
                    if (selectedDocument) {
                      saveDocument(newText)
                    }
                  }}
                  isEnabled={!!selectedDocument}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceProvider>
  )
}
