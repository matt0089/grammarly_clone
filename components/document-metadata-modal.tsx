"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Info, Save } from "lucide-react"
import type { Database } from "@/lib/database.types"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface DocumentMetadataModalProps {
  document: Document
  onMetadataUpdate: (document: Document) => void
}

export function DocumentMetadataModal({ document, onMetadataUpdate }: DocumentMetadataModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [documentType, setDocumentType] = useState(document.document_type || "")
  const [documentGoal, setDocumentGoal] = useState(document.document_goal || "")

  // Reset form when document changes
  useEffect(() => {
    setDocumentType(document.document_type || "")
    setDocumentGoal(document.document_goal || "")
  }, [document.id, document.document_type, document.document_goal])

  const handleSave = async () => {
    if (!document.id) return

    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from("documents")
        .update({
          document_type: documentType.trim() || null,
          document_goal: documentGoal.trim() || null,
        })
        .eq("id", document.id)
        .select()
        .single()

      if (error) throw error

      // Update the parent component with the new metadata
      onMetadataUpdate(data)
      setIsOpen(false)
    } catch (error) {
      console.error("Error saving document metadata:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const documentTypeOptions = [
    "User Guide",
    "API Reference",
    "Technical Documentation",
    "Tutorial",
    "FAQ",
    "Release Notes",
    "White Paper",
    "Case Study",
    "Blog Post",
    "General",
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Document Information">
          <Info className="w-4 h-4 mr-2" />
          Doc Info
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Document Information
          </DialogTitle>
          <DialogDescription>Add metadata to help describe your document's purpose and type.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Input
              id="document-type"
              placeholder="e.g., User Guide, API Reference, Tutorial"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              list="document-types"
            />
            <datalist id="document-types">
              {documentTypeOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-goal">Document Goal</Label>
            <Textarea
              id="document-goal"
              placeholder="Describe what this document should communicate or achieve..."
              value={documentGoal}
              onChange={(e) => setDocumentGoal(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
