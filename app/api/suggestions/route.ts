import { type NextRequest, NextResponse } from "next/server"
import { aiSuggestionService } from "@/lib/ai-suggestion-service"

export async function POST(request: NextRequest) {
  try {
    const { text, context } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required and must be a string" }, { status: 400 })
    }

    if (text.length > 10000) {
      return NextResponse.json({ error: "Text is too long. Maximum 10,000 characters allowed." }, { status: 400 })
    }

    const suggestions = await aiSuggestionService.generateSuggestions(text, context)

    return NextResponse.json({
      suggestions,
      processed: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Suggestions API error:", error)

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)

      // Log raw AI response if available
      if ("text" in error) {
        console.error("Raw AI response that failed parsing:", (error as any).text)
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate suggestions",
        details: error instanceof Error ? error.message : "Unknown error",
        // In development, include more details
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
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
