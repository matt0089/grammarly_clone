"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Trash2 } from "lucide-react"
import type { Database } from "@/lib/database.types"

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
