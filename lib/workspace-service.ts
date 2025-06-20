import { supabase } from "./supabase"
import type { Database } from "./database.types"

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]
type WorkspaceInsert = Database["public"]["Tables"]["workspaces"]["Insert"]

export class WorkspaceService {
  static async getDefaultWorkspace(userId: string): Promise<Workspace | null> {
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .single()

      if (error) {
        console.error("Error fetching default workspace:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in getDefaultWorkspace:", error)
      return null
    }
  }

  static async createDefaultWorkspace(userId: string): Promise<Workspace | null> {
    try {
      const workspaceData: WorkspaceInsert = {
        name: "My Workspace",
        description: "Default workspace",
        user_id: userId,
        is_default: true,
      }

      const { data, error } = await supabase.from("workspaces").insert(workspaceData).select().single()

      if (error) {
        console.error("Error creating default workspace:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in createDefaultWorkspace:", error)
      return null
    }
  }

  static async ensureDefaultWorkspace(userId: string): Promise<Workspace | null> {
    // First try to get existing default workspace
    let workspace = await this.getDefaultWorkspace(userId)

    // If no default workspace exists, create one
    if (!workspace) {
      workspace = await this.createDefaultWorkspace(userId)
    }

    return workspace
  }

  static async getAllWorkspaces(userId: string): Promise<Workspace[]> {
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Error fetching workspaces:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error in getAllWorkspaces:", error)
      return []
    }
  }
}
