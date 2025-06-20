import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    // Extract the token from "Bearer <token>"
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

    // Get user's workspaces
    const { data: workspaces, error } = await userSupabase
      .from("workspaces")
      .select(`
        *,
        documents(count)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching workspaces:", error)
      return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 })
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

    // Create new workspace
    const { data: workspace, error } = await userSupabase
      .from("workspaces")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        user_id: user.id,
        is_default: false,
      })
      .select()
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
