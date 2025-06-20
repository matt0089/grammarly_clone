"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/app/context/UserContext"
import { supabase } from "@/lib/supabaseClient"
import WorkspaceCard from "@/components/WorkspaceCard"
import { PlusIcon } from "@heroicons/react/24/solid"
import Link from "next/link"

const Dashboard = () => {
  const router = useRouter()
  const { user, setUser } = useUser()
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Session error:", sessionError)
          router.push("/")
          return
        }

        if (!session?.user) {
          router.push("/")
          return
        }

        setUser(session.user)
        await loadWorkspaces(session.user.id)
      } catch (error) {
        console.error("Error in checkAuthAndLoadData:", error)
        router.push("/")
      }
    }

    checkAuthAndLoadData()
  }, [router])

  const loadWorkspaces = async (userId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading workspaces:", error)
        setError("Failed to load workspaces")
        return
      }

      if (!data || data.length === 0) {
        // Create default workspace if none exist
        await createDefaultWorkspace(userId)
        return
      }

      setWorkspaces(data)
    } catch (error) {
      console.error("Error in loadWorkspaces:", error)
      setError("Failed to load workspaces")
    } finally {
      setLoading(false)
    }
  }

  const createDefaultWorkspace = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .insert([{ user_id: userId, name: "My Workspace" }])
        .select()

      if (error) {
        console.error("Error creating default workspace:", error)
        setError("Failed to create default workspace")
        return
      }

      if (data && data.length > 0) {
        setWorkspaces(data)
      }
    } catch (error) {
      console.error("Error in createDefaultWorkspace:", error)
      setError("Failed to create default workspace")
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Workspaces</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((workspace) => (
          <WorkspaceCard key={workspace.id} workspace={workspace} />
        ))}
        <Link href="/create-workspace">
          <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center h-32 text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors duration-200">
            <PlusIcon className="h-6 w-6" />
            <span className="ml-2">Add New Workspace</span>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
