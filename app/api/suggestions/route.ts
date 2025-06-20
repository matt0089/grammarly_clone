import { type NextRequest, NextResponse } from "next/server"
import { aiSuggestionService } from "@/lib/ai-suggestion-service"

export async function POST(request: NextRequest) {
  try {
    const { text, context } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required and must be a string" }, { status: 400 })
    }

    // Reduced from 10000 to prevent memory issues
    if (text.length > 3000) {
      return NextResponse.json({ error: "Text is too long. Maximum 3,000 characters allowed." }, { status: 400 })
    }

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 30000) // 30 second timeout
    })

    const suggestionsPromise = aiSuggestionService.generateSuggestions(text, context)

    const suggestions = await Promise.race([suggestionsPromise, timeoutPromise])

    return NextResponse.json({
      suggestions,
      processed: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Suggestions API error:", error)

    // Force garbage collection if available (Node.js)
    if (global.gc) {
      global.gc()
    }

    return NextResponse.json(
      {
        error: "Failed to generate suggestions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "AI Suggestions API is running",
    version: "1.0.0",
  })
}
