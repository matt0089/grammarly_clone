"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWorkspace } from "@/lib/workspace-context"
import { Loader2 } from "lucide-react"

interface EditWorkspaceModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditWorkspaceModal({ workspaceId, open, onOpenChange }: EditWorkspaceModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { workspaces, updateWorkspace } = useWorkspace()

  // Load workspace data when modal opens
  useEffect(() => {
    if (open && workspaceId) {
      const workspace = workspaces.find((w) => w.id === workspaceId)
      if (workspace) {
        setName(workspace.name)
        setDescription(workspace.description || "")
      }
    }
  }, [open, workspaceId, workspaces])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError("Workspace name is required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await updateWorkspace(workspaceId, name.trim(), description.trim() || undefined)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen)
      if (!newOpen) {
        setError(null)
      }
    }
  }

  const workspace = workspaces.find((w) => w.id === workspaceId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Workspace</DialogTitle>
          <DialogDescription>Update your workspace name and description.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-workspace-name">Name</Label>
            <Input
              id="edit-workspace-name"
              placeholder="e.g., Marketing Documents"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading || workspace?.is_default}
              required
            />
            {workspace?.is_default && <p className="text-xs text-gray-500">Default workspace name cannot be changed</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-workspace-description">Description (optional)</Label>
            <Textarea
              id="edit-workspace-description"
              placeholder="Describe what this workspace is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="resize-none"
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
