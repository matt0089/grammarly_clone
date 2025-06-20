import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspaceId = params.id

    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Get user from token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Get workspace
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
      }
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({ workspace })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspaceId = params.id

    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Get user from token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Check if workspace exists and belongs to user
    const { data: workspace, error: fetchError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Don't allow deletion of default workspace if it's the only one
    if (workspace.is_default) {
      const { data: allWorkspaces, error: countError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user.id)

      if (countError) {
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }

      if (allWorkspaces.length <= 1) {
        return NextResponse.json({ error: "Cannot delete your only workspace" }, { status: 400 })
      }
    }

    // Delete all documents in the workspace first
    const { error: deleteDocsError } = await supabase
      .from("documents")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)

    if (deleteDocsError) {
      console.error("Error deleting documents:", deleteDocsError)
      return NextResponse.json({ error: "Failed to delete workspace documents" }, { status: 500 })
    }

    // Delete the workspace
    const { error: deleteError } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)
      .eq("user_id", user.id)

    if (deleteError) {
      console.error("Error deleting workspace:", deleteError)
      return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
