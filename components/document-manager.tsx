"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Trash2, Upload, X } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { fileProcessorRegistry } from "@/lib/file-processors"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface DocumentManagerProps {
  userId: string
  onSelectDocument: (document: Document | null) => void
  selectedDocument: Document | null
}

export function DocumentManager({ userId, onSelectDocument, selectedDocument }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [userId])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const createDocument = async () => {
    if (!newDocTitle.trim()) return

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from("documents")
        .insert({
          title: newDocTitle,
          content: "",
          user_id: userId,
        })
        .select()
        .single()

      if (error) throw error

      setDocuments([data, ...documents])
      setNewDocTitle("")
      onSelectDocument(data)
    } catch (error) {
      console.error("Error creating document:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", documentId)

      if (error) throw error

      setDocuments(documents.filter((doc) => doc.id !== documentId))
      if (selectedDocument?.id === documentId) {
        onSelectDocument(null)
      }
    } catch (error) {
      console.error("Error deleting document:", error)
    }
  }

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setIsUploading(true)

    try {
      // Check file size (1MB limit)
      const maxSize = 1024 * 1024 // 1MB in bytes
      if (file.size > maxSize) {
        throw new Error(`File size exceeds 1MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`)
      }

      // Check file type
      if (!fileProcessorRegistry.isSupported(file.name)) {
        const supportedTypes = fileProcessorRegistry.getSupportedTypes().join(", ")
        throw new Error(`Unsupported file type. Supported formats: ${supportedTypes}`)
      }

      // Process file content
      const content = await fileProcessorRegistry.processFile(file)

      // Create document with original filename
      const { data, error } = await supabase
        .from("documents")
        .insert({
          title: file.name,
          content: content,
          user_id: userId,
        })
        .select()
        .single()

      if (error) throw error

      setDocuments([data, ...documents])
      onSelectDocument(data)

      // Reset file input
      event.target.value = ""
    } catch (error) {
      console.error("Error uploading file:", error)
      setUploadError(error instanceof Error ? error.message : "Failed to upload file")
      // Reset file input on error
      event.target.value = ""
    } finally {
      setIsUploading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading documents...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          My Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="New document title..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && createDocument()}
              />
              <Button onClick={createDocument} disabled={isCreating || !newDocTitle.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".txt,.md,.markdown"
                onChange={uploadFile}
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={isUploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload File"}
              </Button>
            </div>

            {uploadError && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between">
                  <span>{uploadError}</span>
                  <Button variant="ghost" size="sm" onClick={() => setUploadError(null)} className="h-auto p-1">
                    <X className="w-4 h-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-4 space-y-2">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No documents yet</p>
                <p className="text-sm">Create your first document to get started</p>
              </div>
            ) : (
              documents.map((document) => (
                <div
                  key={document.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors group ${
                    selectedDocument?.id === document.id
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => onSelectDocument(document)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{document.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{new Date(document.updated_at).toLocaleDateString()}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {document.content.trim().split(/\s+/).length} words
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteDocument(document.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
