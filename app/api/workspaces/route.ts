import { NextResponse } from "next/server"
import { supabase } from "@/utils/supabaseClient"

export async function GET(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch workspaces with document counts
    const { data: workspaces, error } = await supabase
      .from("workspaces")
      .select(`
        *,
        documents(count)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (error) throw error

    // If user has no workspaces, create a default one
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

      if (createError) throw createError

      return NextResponse.json({
        workspaces: [newWorkspace],
      })
    }

    return NextResponse.json({
      workspaces: workspaces || [],
    })
  } catch (error) {
    console.error("Error fetching workspaces:", error)
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 })
  }
}
