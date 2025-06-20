import { supabase } from "./supabase"
import type { Database } from "./database.types"

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]
type WorkspaceInsert = Database["public"]["Tables"]["workspaces"]["Insert"]
type WorkspaceUpdate = Database["public"]["Tables"]["workspaces"]["Update"]

export interface WorkspaceWithStats extends Workspace {
  documentCount: number
  lastUpdated: string | null
}

export class WorkspaceService {
  static async getWorkspaces(userId: string): Promise<WorkspaceWithStats[]> {
    try {
      // First, get workspaces with document count
      const { data: workspaces, error } = await supabase
        .from("workspaces")
        .select(`
          *,
          documents(count)
        `)
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false })

      if (error) throw error

      // Then get the latest document update time for each workspace
      const workspacesWithStats: WorkspaceWithStats[] = await Promise.all(
        (workspaces || []).map(async (workspace) => {
          const { data: latestDoc } = await supabase
            .from("documents")
            .select("updated_at")
            .eq("workspace_id", workspace.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single()

          return {
            ...workspace,
            documentCount: workspace.documents?.[0]?.count || 0,
            lastUpdated: latestDoc?.updated_at || null,
          }
        }),
      )

      return workspacesWithStats
    } catch (error) {
      console.error("Error fetching workspaces:", error)
      throw error
    }
  }

  static async createWorkspace(workspace: WorkspaceInsert): Promise<Workspace> {
    try {
      const { data, error } = await supabase.from("workspaces").insert(workspace).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating workspace:", error)
      throw error
    }
  }

  static async updateWorkspace(id: string, updates: WorkspaceUpdate): Promise<Workspace> {
    try {
      const { data, error } = await supabase.from("workspaces").update(updates).eq("id", id).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating workspace:", error)
      throw error
    }
  }

  static async deleteWorkspace(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("workspaces").delete().eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting workspace:", error)
      throw error
    }
  }

  static async getDefaultWorkspace(userId: string): Promise<Workspace | null> {
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .single()

      if (error && error.code !== "PGRST116") throw error
      return data || null
    } catch (error) {
      console.error("Error fetching default workspace:", error)
      throw error
    }
  }

  static async ensureDefaultWorkspace(userId: string): Promise<Workspace> {
    try {
      let defaultWorkspace = await this.getDefaultWorkspace(userId)

      if (!defaultWorkspace) {
        defaultWorkspace = await this.createWorkspace({
          name: "My Workspace",
          description: "Default workspace",
          user_id: userId,
          is_default: true,
        })
      }

      return defaultWorkspace
    } catch (error) {
      console.error("Error ensuring default workspace:", error)
      throw error
    }
  }
}
