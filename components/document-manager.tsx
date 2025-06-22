"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Trash2, Upload, X, Download, Archive } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { fileProcessorRegistry } from "@/lib/file-processors"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { downloadDocument, downloadDocumentsAsZip, type DownloadableDocument } from "@/lib/download-utils"
import { getDocuments } from "@/lib/document-service"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface DocumentManagerProps {
  workspaceId: string
  onSelectDocument: (document: Document | null) => void
  selectedDocument: Document | null
  documents: Document[]
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>
}

export function DocumentManager({ workspaceId, onSelectDocument, selectedDocument, documents, setDocuments }: DocumentManagerProps) {
  const [loading, setLoading] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const createDocument = async () => {
    if (!newDocTitle.trim() || !workspaceId) return

    setIsCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase
        .from("documents")
        .insert({
          title: newDocTitle,
          content: "",
          user_id: user.id,
          workspace_id: workspaceId,
          file_type: "txt",
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
    if (!file || !workspaceId) return

    setUploadError(null)
    setIsUploading(true)

    try {
      const maxSize = 1024 * 1024 // 1MB in bytes
      if (file.size > maxSize) {
        throw new Error(`File size exceeds 1MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`)
      }

      if (!fileProcessorRegistry.isSupported(file.name)) {
        const supportedTypes = fileProcessorRegistry.getSupportedTypes().join(", ")
        throw new Error(`Unsupported file type. Supported formats: ${supportedTypes}`)
      }
      
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const content = await fileProcessorRegistry.processFile(file)
      const fileType = fileProcessorRegistry.getFileTypeForFile(file.name)

      const { data, error } = await supabase
        .from("documents")
        .insert({
          title: file.name,
          content: content,
          user_id: user.id,
          workspace_id: workspaceId,
          file_type: fileType,
        })
        .select()
        .single()

      if (error) throw error

      setDocuments([data, ...documents])
      onSelectDocument(data)

      event.target.value = ""
    } catch (error) {
      console.error("Error uploading file:", error)
      setUploadError(error instanceof Error ? error.message : "Failed to upload file")
      event.target.value = ""
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadDocument = async (document: Document) => {
    try {
      if (selectedDocument?.id === document.id) {
        const currentContent = selectedDocument.content
        await supabase.from("documents").update({ content: currentContent }).eq("id", document.id)

        document.content = currentContent
      }

      const downloadableDoc: DownloadableDocument = {
        id: document.id,
        title: document.title,
        content: document.content,
        file_type: document.file_type || "txt",
      }

      downloadDocument(downloadableDoc)
    } catch (error) {
      console.error("Error downloading document:", error)
    }
  }

  const handleBulkDownload = async () => {
    if (documents.length === 0) return

    try {
      const downloadableDocs: DownloadableDocument[] = documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        file_type: doc.file_type || "txt",
      }))

      await downloadDocumentsAsZip(downloadableDocs)
    } catch (error) {
      console.error("Error creating bulk download:", error)
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
          Documents ({documents.length})
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
                onKeyDown={(e) => e.key === 'Enter' && createDocument()}
                disabled={isCreating}
              />
              <Button onClick={createDocument} disabled={isCreating || !newDocTitle.trim()}>
                {isCreating ? 'Creating...' : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            <div>
              <label htmlFor="file-upload" className="w-full">
                <Button asChild variant="outline">
                  <span className="w-full flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload File
                  </span>
                </Button>
              </label>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={uploadFile}
                disabled={isUploading}
                accept={fileProcessorRegistry.getSupportedTypes().join(",")}
              />
            </div>
            {isUploading && (
              <div className="text-sm text-center text-muted-foreground">Uploading...</div>
            )}
            {uploadError && (
              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                selectedDocument?.id === doc.id ? "bg-gray-200 dark:bg-gray-700" : ""
              }`}
              onClick={() => onSelectDocument(doc)}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="flex-1 truncate">{doc.title}</span>
                {doc.file_type && (
                  <Badge variant="secondary" className="text-xs">
                    {doc.file_type}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownloadDocument(doc)
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteDocument(doc.id)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </ScrollArea>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full" onClick={handleBulkDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download All as .zip
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
