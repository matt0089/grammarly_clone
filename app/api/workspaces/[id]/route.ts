import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { workspaceService } from "@/lib/workspace-service"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, description } = await request.json()
    const workspaceId = params.id

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 })
    }

    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    // Extract the token from "Bearer <token>"
    const token = authHeader.replace("Bearer ", "")

    // Verify the user's session
    const userSupabase = supabase
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Update workspace
    const workspace = await workspaceService.updateWorkspace(workspaceId, {
      name: name.trim(),
      description: description?.trim() || null,
    })

    return NextResponse.json({ workspace })
  } catch (error) {
    console.error("Error updating workspace:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
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

    // Extract the token from "Bearer <token>"
    const token = authHeader.replace("Bearer ", "")

    // Verify the user's session
    const userSupabase = supabase
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Delete workspace
    await workspaceService.deleteWorkspace(workspaceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting workspace:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
