import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    // Extract the token
    const token = authHeader.replace("Bearer ", "")

    // Get user from token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Get user's workspaces with document counts
    const { data: workspaces, error } = await supabase
      .from("workspaces")
      .select(`
        *,
        documents(count)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // If no workspaces exist, create a default one
    if (!workspaces || workspaces.length === 0) {
      const { data: newWorkspace, error: createError } = await supabase
        .from("workspaces")
        .insert({
          name: "My Documents",
          description: "Default workspace for your documents",
          user_id: user.id,
          is_default: true,
        })
        .select(`
          *,
          documents(count)
        `)
        .single()

      if (createError) {
        console.error("Error creating default workspace:", createError)
        return NextResponse.json({ error: "Failed to create default workspace" }, { status: 500 })
      }

      return NextResponse.json({ workspaces: [newWorkspace] })
    }

    return NextResponse.json({ workspaces })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

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

    // Create new workspace
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        user_id: user.id,
        is_default: false,
      })
      .select(`
        *,
        documents(count)
      `)
      .single()

    if (error) {
      console.error("Error creating workspace:", error)
      return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 })
    }

    return NextResponse.json({ workspace })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
