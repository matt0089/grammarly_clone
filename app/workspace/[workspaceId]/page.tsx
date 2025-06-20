"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Auth } from "@/components/auth"
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace-context"
import { WorkspaceEditor } from "@/components/workspace-editor"
import type { User as SupabaseUser } from "@supabase/supabase-js"

function WorkspacePageContent() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const { workspaces, setCurrentWorkspace, isLoading } = useWorkspace()

  useEffect(() => {
    if (!isLoading && workspaces.length > 0) {
      const workspace = workspaces.find((w) => w.id === workspaceId)
      if (workspace) {
        setCurrentWorkspace(workspace)
      } else {
        // Workspace not found, redirect to dashboard
        router.push("/")
      }
    }
  }, [workspaceId, workspaces, isLoading, setCurrentWorkspace, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return <WorkspaceEditor />
}

export default function WorkspacePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth onAuthChange={setUser} />
  }

  return (
    <WorkspaceProvider>
      <WorkspacePageContent />
    </WorkspaceProvider>
  )
}
