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
