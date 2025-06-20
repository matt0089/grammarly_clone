import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspaceId = params.id

    // Get the authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Create Supabase client with user's token
    const userSupabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    )

    // Verify the session
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Get workspace
    const { data: workspace, error } = await userSupabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (error || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    return NextResponse.json({ workspace })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspaceId = params.id
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

    // Create Supabase client with user's token
    const userSupabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    )

    // Verify the session
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Update workspace
    const { data: workspace, error } = await userSupabase
      .from("workspaces")
      .update({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error || !workspace) {
      return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 })
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

    // Create Supabase client with user's token
    const userSupabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    )

    // Verify the session
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Check if this is the user's only workspace
    const { data: workspaces, error: countError } = await userSupabase
      .from("workspaces")
      .select("id")
      .eq("user_id", user.id)

    if (countError) {
      return NextResponse.json({ error: "Failed to check workspace count" }, { status: 500 })
    }

    if (workspaces.length <= 1) {
      return NextResponse.json({ error: "Cannot delete your only workspace" }, { status: 400 })
    }

    // Delete workspace (documents will be cascade deleted)
    const { error } = await userSupabase.from("workspaces").delete().eq("id", workspaceId).eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
