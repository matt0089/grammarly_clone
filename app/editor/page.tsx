"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Legacy route - redirect to dashboard
export default function EditorPage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
