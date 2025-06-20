"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { WorkspaceService, type WorkspaceWithStats } from "./workspace-service"
import type { Database } from "./database.types"

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]

interface WorkspaceContextType {
  workspaces: WorkspaceWithStats[]
  currentWorkspace: Workspace | null
  loading: boolean
  error: string | null
  refreshWorkspaces: () => Promise<void>
  setCurrentWorkspace: (workspace: Workspace | null) => void
  createWorkspace: (name: string, description?: string) => Promise<Workspace>
  updateWorkspace: (id: string, updates: { name?: string; description?: string }) => Promise<Workspace>
  deleteWorkspace: (id: string) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({
  children,
  userId,
}: {
  children: React.ReactNode
  userId: string
}) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithStats[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshWorkspaces = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await WorkspaceService.getWorkspaces(userId)
      setWorkspaces(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces")
    } finally {
      setLoading(false)
    }
  }

  const createWorkspace = async (name: string, description?: string) => {
    try {
      const workspace = await WorkspaceService.createWorkspace({
        name,
        description: description || null,
        user_id: userId,
        is_default: false,
      })
      await refreshWorkspaces()
      return workspace
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace")
      throw err
    }
  }

  const updateWorkspace = async (id: string, updates: { name?: string; description?: string }) => {
    try {
      const workspace = await WorkspaceService.updateWorkspace(id, updates)
      await refreshWorkspaces()
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(workspace)
      }
      return workspace
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace")
      throw err
    }
  }

  const deleteWorkspace = async (id: string) => {
    try {
      await WorkspaceService.deleteWorkspace(id)
      await refreshWorkspaces()
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workspace")
      throw err
    }
  }

  useEffect(() => {
    if (userId) {
      refreshWorkspaces()
    }
  }, [userId])

  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    loading,
    error,
    refreshWorkspaces,
    setCurrentWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}
