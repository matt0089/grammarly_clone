import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]
type WorkspaceInsert = Database["public"]["Tables"]["workspaces"]["Insert"]
type WorkspaceUpdate = Database["public"]["Tables"]["workspaces"]["Update"]

export interface WorkspaceWithStats extends Workspace {
  document_count: number
  last_updated: string | null
}

export class WorkspaceService {
  private static instance: WorkspaceService

  static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService()
    }
    return WorkspaceService.instance
  }

  async getUserWorkspaces(userId: string): Promise<WorkspaceWithStats[]> {
    const { data, error } = await supabase
      .from("workspaces")
      .select(`
        *,
        documents(count),
        documents(updated_at)
      `)
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })

    if (error) throw error

    // Transform the data to include stats
    return (data || []).map((workspace: any) => ({
      ...workspace,
      document_count: workspace.documents?.[0]?.count || 0,
      last_updated: workspace.documents?.[0]?.updated_at || null,
    }))
  }

  async createWorkspace(workspace: Omit<WorkspaceInsert, "user_id">, userId: string): Promise<Workspace> {
    const { data, error } = await supabase
      .from("workspaces")
      .insert({
        ...workspace,
        user_id: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateWorkspace(id: string, updates: WorkspaceUpdate): Promise<Workspace> {
    const { data, error } = await supabase.from("workspaces").update(updates).eq("id", id).select().single()

    if (error) throw error
    return data
  }

  async deleteWorkspace(id: string): Promise<void> {
    // First check if this is a default workspace
    const { data: workspace, error: fetchError } = await supabase
      .from("workspaces")
      .select("is_default")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError

    if (workspace.is_default) {
      throw new Error("Cannot delete default workspace")
    }

    // Delete the workspace (documents will be cascade deleted)
    const { error } = await supabase.from("workspaces").delete().eq("id", id)

    if (error) throw error
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const { data, error } = await supabase.from("workspaces").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") return null // Not found
      throw error
    }

    return data
  }

  async getDefaultWorkspace(userId: string): Promise<Workspace | null> {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single()

    if (error) {
      if (error.code === "PGRST116") return null // Not found
      throw error
    }

    return data
  }
}

export const workspaceService = WorkspaceService.getInstance()
