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
import { Info, Save, Sparkles, Loader2 } from "lucide-react"
import type { Database } from "@/lib/database.types"
import { useToast } from "./ui/use-toast"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface DocumentMetadataModalProps {
  document: Document
  documentContent: string
  onMetadataUpdate: (document: Document) => void
}

export function DocumentMetadataModal({ document, documentContent, onMetadataUpdate }: DocumentMetadataModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState(document.title || "")
  const [documentType, setDocumentType] = useState(document.document_type || "")
  const [documentGoal, setDocumentGoal] = useState(document.document_goal || "")
  const [isGenerating, setIsGenerating] = useState<"title" | "type" | "goal" | null>(null)
  const { toast } = useToast()

  // Reset form when document changes
  useEffect(() => {
    setTitle(document.title || "")
    setDocumentType(document.document_type || "")
    setDocumentGoal(document.document_goal || "")
  }, [document.id, document.title, document.document_type, document.document_goal])

  const handleGenerateProperty = async (property: "title" | "type" | "goal") => {
    setIsGenerating(property);
    try {
      const response = await fetch('/api/generate-doc-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentContent, propertyToGenerate: property }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to generate property.');
      }

      const { generatedValue } = await response.json();

      if (property === 'title') {
        setTitle(generatedValue);
      } else if (property === 'type') {
        setDocumentType(generatedValue);
      } else {
        setDocumentGoal(generatedValue);
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message,
      })
    } finally {
      setIsGenerating(null);
    }
  };

  const handleSave = async () => {
    if (!document.id) return

    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from("documents")
        .update({
          title: title.trim(),
          document_type: documentType.trim() || null,
          document_goal: documentGoal.trim() || null,
        })
        .eq("id", document.id)
        .select()
        .single()

      if (error) throw error

      onMetadataUpdate(data)
      setIsOpen(false)
    } catch (error) {
      console.error("Error saving document metadata:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save document metadata.",
      })
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

  const wordCount = documentContent.trim().split(/\s+/).filter(Boolean).length;
  const isGenerationDisabled = wordCount < 30 || wordCount > 5000;

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
            <Label htmlFor="document-title">Document Title</Label>
            <div className="flex items-center gap-2">
              <Input
                id="document-title"
                placeholder="A clear and concise title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleGenerateProperty('title')}
                disabled={isGenerationDisabled || isGenerating !== null}
                title={isGenerationDisabled ? "Content must be between 30 and 5000 words to generate." : "Generate Title"}
              >
                {isGenerating === 'title' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <div className="flex items-center gap-2">
              <Input
                id="document-type"
                placeholder="e.g., User Guide, API Reference, Tutorial"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                list="document-types"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleGenerateProperty('type')}
                disabled={isGenerationDisabled || isGenerating !== null}
                title={isGenerationDisabled ? "Content must be between 30 and 5000 words to generate." : "Generate Type"}
              >
                {isGenerating === 'type' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
            <datalist id="document-types">
              {documentTypeOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-goal">Document Goal</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="document-goal"
                placeholder="Describe what this document should communicate or achieve..."
                value={documentGoal}
                onChange={(e) => setDocumentGoal(e.target.value)}
                rows={3}
                className="resize-none flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleGenerateProperty('goal')}
                disabled={isGenerationDisabled || isGenerating !== null}
                title={isGenerationDisabled ? "Content must be between 30 and 5000 words to generate." : "Generate Goal"}
                className="mt-0"
              >
                {isGenerating === 'goal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
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
