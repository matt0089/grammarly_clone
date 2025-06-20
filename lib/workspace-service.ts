import { createClient } from "@/utils/supabase/server"

export async function getWorkspaces(userId: string) {
  const supabase = createClient()

  // First get workspaces with document count
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select(`
      *,
      documents(count)
    `)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching workspaces:", error)
    throw error
  }

  // Then get the latest document update time for each workspace
  const workspacesWithMetadata = await Promise.all(
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
        document_count: workspace.documents?.length || 0,
        last_document_update: latestDoc?.updated_at || null,
        documents: undefined, // Remove the documents array since we only needed the count
      }
    }),
  )

  return workspacesWithMetadata
}
