import { type NextRequest, NextResponse } from "next/server"
import { aiSuggestionService } from "@/lib/ai-suggestion-service"

export async function POST(request: NextRequest) {
  try {
    const { text, context } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required and must be a string" }, { status: 400 })
    }

    // Reduced text limit to prevent memory issues
    if (text.length > 5000) {
      return NextResponse.json({ error: "Text is too long. Maximum 5,000 characters allowed." }, { status: 400 })
    }

    // Add timeout to prevent long-running requests
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

    // More detailed error logging for memory issues
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)

      // Check for memory-related errors
      if (error.message.includes("memory") || error.message.includes("heap")) {
        console.error("Memory-related error detected")
      }
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
    memoryUsage: process.memoryUsage(), // Add memory usage info for debugging
  })
}
