import { type NextRequest, NextResponse } from "next/server"
import { aiSuggestionService } from "@/lib/ai-suggestion-service"

// Add request tracking to identify leaks
const activeRequests = new Map<string, { timestamp: number; aborted: boolean }>()
let requestCounter = 0

export async function POST(request: NextRequest) {
  const requestId = `req-${++requestCounter}-${Date.now()}`
  const startTime = Date.now()

  // Track active request
  activeRequests.set(requestId, { timestamp: startTime, aborted: false })

  // Clean up old tracking entries
  cleanupRequestTracking()

  try {
    const { text, context } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required and must be a string" }, { status: 400 })
    }

    if (text.length > 3000) {
      return NextResponse.json({ error: "Text is too long. Maximum 3,000 characters allowed." }, { status: 400 })
    }

    // Create an AbortController for this request
    const abortController = new AbortController()

    // Set up timeout with proper cleanup
    const timeoutId = setTimeout(() => {
      const requestInfo = activeRequests.get(requestId)
      if (requestInfo) {
        requestInfo.aborted = true
      }
      abortController.abort()
    }, 30000) // 30 second timeout

    try {
      // Pass abort signal to the AI service
      const suggestions = await aiSuggestionService.generateSuggestions(text, context, abortController.signal)

      // Clear timeout if request completes successfully
      clearTimeout(timeoutId)

      return NextResponse.json({
        suggestions,
        processed: true,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId)

      // Check if request was aborted
      if (abortController.signal.aborted) {
        console.log(`Request ${requestId} was aborted due to timeout`)
        return NextResponse.json({ error: "Request timeout" }, { status: 408 })
      }

      throw error
    }
  } catch (error) {
    console.error(`Suggestions API error for request ${requestId}:`, error)

    // Force garbage collection if available (Node.js)
    if (global.gc) {
      try {
        global.gc()
      } catch (gcError) {
        console.warn("Garbage collection failed:", gcError)
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate suggestions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  } finally {
    // Always clean up request tracking
    activeRequests.delete(requestId)

    const duration = Date.now() - startTime
    console.log(`Request ${requestId} completed in ${duration}ms`)
  }
}

function cleanupRequestTracking() {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minutes

  for (const [requestId, info] of activeRequests.entries()) {
    if (now - info.timestamp > maxAge) {
      activeRequests.delete(requestId)
    }
  }
}

export async function GET() {
  return NextResponse.json({
    message: "AI Suggestions API is running",
    version: "1.0.0",
    activeRequests: activeRequests.size,
    memoryUsage: process.memoryUsage ? process.memoryUsage() : "unavailable",
  })
}
