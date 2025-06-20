"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Trash2, LogOut, FolderOpen } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"] & {
  documents?: { count: number }[]
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/")
        return
      }

      setUser(session.user)
      await fetchWorkspaces(session.access_token)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkspaces = async (token: string) => {
    try {
      const response = await fetch("/api/workspaces", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch workspaces")
      }

      const data = await response.json()
      setWorkspaces(data.workspaces || [])
    } catch (error) {
      console.error("Error fetching workspaces:", error)
    }
  }

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return

    setIsCreating(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("No session")

      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: newWorkspaceName,
          description: newWorkspaceDescription,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create workspace")
      }

      const data = await response.json()
      setWorkspaces([...workspaces, { ...data.workspace, documents: [] }])
      setNewWorkspaceName("")
      setNewWorkspaceDescription("")
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error("Error creating workspace:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const deleteWorkspace = async (workspaceId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("No session")

      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete workspace")
      }

      setWorkspaces(workspaces.filter((w) => w.id !== workspaceId))
    } catch (error) {
      console.error("Error deleting workspace:", error)
      alert(error instanceof Error ? error.message : "Failed to delete workspace")
    }
  }

  const openWorkspace = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}`)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const getDocumentCount = (workspace: Workspace) => {
    return workspace.documents?.[0]?.count || 0
  }

  const getUserInitials = (user: SupabaseUser) => {
    const fullName = user.user_metadata?.full_name || user.email
    return fullName
      .split(" ")
      .map((name: string) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <p className="text-gray-600">Loading your workspaces...</p>
        </div>
      </div>
    )
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
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* User Profile Section */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="bg-green-600 text-white text-lg">
                    {user ? getUserInitials(user) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Welcome back, {user?.user_metadata?.full_name || "User"}!
                  </h2>
                  <p className="text-gray-600">{user?.email}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline">
                      {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="outline">
                      {workspaces.reduce((total, w) => total + getDocumentCount(w), 0)} document
                      {workspaces.reduce((total, w) => total + getDocumentCount(w), 0) !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workspaces Section */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Workspaces</h3>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workspace-name">Name</Label>
                  <Input
                    id="workspace-name"
                    placeholder="Enter workspace name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="workspace-description">Description (optional)</Label>
                  <Textarea
                    id="workspace-description"
                    placeholder="Describe your workspace"
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createWorkspace} disabled={isCreating || !newWorkspaceName.trim()}>
                    {isCreating ? "Creating..." : "Create Workspace"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{workspace.name}</CardTitle>
                    {workspace.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{workspace.description}</p>
                    )}
                  </div>
                  {!workspace.is_default && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{workspace.name}"? This will permanently delete all
                            documents in this workspace. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteWorkspace(workspace.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>
                      {getDocumentCount(workspace)} document{getDocumentCount(workspace) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {workspace.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                <Button className="w-full" onClick={() => openWorkspace(workspace.id)}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Open Workspace
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {workspaces.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first workspace to get started with organizing your documents.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Workspace
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
