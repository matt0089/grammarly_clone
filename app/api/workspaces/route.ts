import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { workspaceService } from "@/lib/workspace-service"

export async function GET(request: NextRequest) {
  try {
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

    // Get user's workspaces
    const workspaces = await workspaceService.getUserWorkspaces(user.id)

    return NextResponse.json({ workspaces })
  } catch (error) {
    console.error("Error fetching workspaces:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()

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

    // Create workspace
    const workspace = await workspaceService.createWorkspace(
      {
        name: name.trim(),
        description: description?.trim() || null,
      },
      user.id,
    )

    return NextResponse.json({ workspace })
  } catch (error) {
    console.error("Error creating workspace:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
