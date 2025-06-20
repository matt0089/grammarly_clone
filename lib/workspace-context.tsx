"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { WorkspaceWithStats } from "@/lib/workspace-service"
import type { Database } from "@/lib/database.types"
import type { User } from "@supabase/supabase-js"

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]

interface WorkspaceContextType {
  workspaces: WorkspaceWithStats[]
  currentWorkspace: Workspace | null
  isLoading: boolean
  error: string | null
  refreshWorkspaces: () => Promise<void>
  setCurrentWorkspace: (workspace: Workspace | null) => void
  createWorkspace: (name: string, description?: string) => Promise<Workspace>
  updateWorkspace: (id: string, name: string, description?: string) => Promise<Workspace>
  deleteWorkspace: (id: string) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}

interface WorkspaceProviderProps {
  children: React.ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithStats[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  // Get current session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshWorkspaces = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) {
        throw new Error("No valid session")
      }

      const response = await fetch("/api/workspaces", {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch workspaces")
      }

      const { workspaces: fetchedWorkspaces } = await response.json()
      setWorkspaces(fetchedWorkspaces)

      // Set current workspace to default if none selected
      if (!currentWorkspace && fetchedWorkspaces.length > 0) {
        const defaultWorkspace = fetchedWorkspaces.find((w: WorkspaceWithStats) => w.is_default)
        setCurrentWorkspace(defaultWorkspace || fetchedWorkspaces[0])
      }
    } catch (err) {
      console.error("Error fetching workspaces:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch workspaces")
    } finally {
      setIsLoading(false)
    }
  }

  const createWorkspace = async (name: string, description?: string): Promise<Workspace> => {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error("No valid session")
    }

    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
      body: JSON.stringify({ name, description }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create workspace")
    }

    const { workspace } = await response.json()
    await refreshWorkspaces()
    return workspace
  }

  const updateWorkspace = async (id: string, name: string, description?: string): Promise<Workspace> => {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error("No valid session")
    }

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
      body: JSON.stringify({ name, description }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to update workspace")
    }

    const { workspace } = await response.json()
    await refreshWorkspaces()

    // Update current workspace if it's the one being updated
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(workspace)
    }

    return workspace
  }

  const deleteWorkspace = async (id: string): Promise<void> => {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error("No valid session")
    }

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to delete workspace")
    }

    // If deleting current workspace, switch to default
    if (currentWorkspace?.id === id) {
      const defaultWorkspace = workspaces.find((w) => w.is_default)
      setCurrentWorkspace(defaultWorkspace || null)
    }

    await refreshWorkspaces()
  }

  // Load workspaces when user changes
  useEffect(() => {
    if (user) {
      refreshWorkspaces()
    } else {
      setWorkspaces([])
      setCurrentWorkspace(null)
      setIsLoading(false)
    }
  }, [user])

  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    refreshWorkspaces,
    setCurrentWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
