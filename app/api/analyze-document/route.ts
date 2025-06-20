import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/database.types"
import { getDocument } from "@/lib/document-service"

export interface DocumentSuggestion {
  id: string
  type: "grammar" | "style" | "clarity" | "tone"
  severity: "low" | "medium" | "high"
  title: string
  description: string
  originalText: string
  suggestedText: string
  startIndex: number
  endIndex: number
  explanation: string
}

export interface SuggestionResponse {
  suggestions: DocumentSuggestion[]
  summary: {
    totalIssues: number
    grammarIssues: number
    styleIssues: number
    clarityIssues: number
    toneIssues: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, documentId, workspaceId } = await request.json()

    console.log("API Request received:", {
      contentLength: content?.length,
      documentId,
      hasContent: !!content,
      hasDocumentId: !!documentId,
      hasWorkspaceId: !!workspaceId,
    })

    // Validate input
    if (!content || typeof content !== "string") {
      console.log("Invalid content provided")
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    if (!documentId || typeof documentId !== "string") {
      console.log("Invalid documentId provided")
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    if (!workspaceId || typeof workspaceId !== "string") {
      console.log("Invalid workspaceId provided")
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 })
    }

    // Use the new server-side client to get the user
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check content length
    if (content.trim().length < 50) {
      console.log("Content too short, returning empty suggestions")
      return NextResponse.json({
        suggestions: [],
        summary: {
          totalIssues: 0,
          grammarIssues: 0,
          styleIssues: 0,
          clarityIssues: 0,
          toneIssues: 0,
        },
      })
    }

    // Verify user owns the document within the workspace using our service
    // This leverages RLS as the supabase client is user-aware
    const document = await getDocument(supabase, documentId, workspaceId)

    if (!document) {
      console.log("Document not found or access denied")
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 })
    }

    console.log("Authorization successful, performing AI analysis")

    // Perform AI analysis
    const analysisResult = await performAnalysis(content, document)

    console.log("Analysis completed:", {
      suggestionsCount: analysisResult.suggestions.length,
      totalIssues: analysisResult.summary.totalIssues,
    })

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function performAnalysis(
  content: string,
  document?: { document_type?: string | null; document_goal?: string | null },
): Promise<SuggestionResponse> {
  try {
    console.log("Starting AI analysis for content length:", content.length)

    // Build dynamic context based on document metadata
    let contextualInfo = ""

    if (document?.document_type) {
      contextualInfo += `The document you are analyzing is a "${document.document_type}" type document. `
    }

    if (document?.document_goal) {
      contextualInfo += `The purpose of this document is: ${document.document_goal}. `
    }

    if (contextualInfo) {
      contextualInfo += "Please tailor your suggestions to be appropriate for this document type and purpose. "
    }

    const prompt = `You are an expert writing assistant. ${contextualInfo}Analyze the following text and provide specific, actionable suggestions for improvement. Focus on:

1. Grammar errors (subject-verb agreement, punctuation, etc.)
2. Style improvements (word choice, sentence structure)
3. Clarity issues (unclear phrasing, ambiguous references)
4. Tone consistency (formal/informal, active/passive voice)

For each suggestion, provide:
- The exact text that needs improvement
- A specific replacement suggestion
- A brief explanation of why the change improves the writing
- The character positions where the issue occurs

Text to analyze:
"""
${content}
"""

Respond with a JSON object in this exact format:
{
  "suggestions": [
    {
      "id": "unique_id",
      "type": "grammar|style|clarity|tone",
      "severity": "low|medium|high",
      "title": "Brief title of the issue",
      "description": "Short description",
      "originalText": "exact text from document",
      "suggestedText": "improved version",
      "startIndex": number,
      "endIndex": number,
      "explanation": "why this change helps"
    }
  ]
}

Limit to the 5 most important suggestions. Ensure all character indices are accurate.`

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.3,
      maxTokens: 2000,
    })

    console.log("AI response received, parsing...")

    // Parse the AI response
    const aiResponse = parseAIResponse(text, content)

    // Generate summary
    const summary = generateSummary(aiResponse.suggestions)

    console.log("Analysis parsing completed:", {
      validSuggestions: aiResponse.suggestions.length,
    })

    return {
      suggestions: aiResponse.suggestions,
      summary,
    }
  } catch (error) {
    console.error("AI analysis error:", error)
    return {
      suggestions: [],
      summary: {
        totalIssues: 0,
        grammarIssues: 0,
        styleIssues: 0,
        clarityIssues: 0,
        toneIssues: 0,
      },
    }
  }
}

function parseAIResponse(aiText: string, originalContent: string): { suggestions: DocumentSuggestion[] } {
  try {
    // Extract JSON from the AI response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response")
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and clean up suggestions
    const validSuggestions: DocumentSuggestion[] = []

    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      for (const suggestion of parsed.suggestions) {
        // Validate required fields
        if (!suggestion.originalText || !suggestion.suggestedText) {
          continue
        }

        // Find the actual position of the text in the document
        const startIndex = originalContent.indexOf(suggestion.originalText)
        if (startIndex === -1) {
          // Try to find a close match
          const words = suggestion.originalText.split(" ")
          const firstWord = words[0]
          const possibleStart = originalContent.indexOf(firstWord)
          if (possibleStart !== -1) {
            suggestion.startIndex = possibleStart
            suggestion.endIndex = possibleStart + suggestion.originalText.length
          } else {
            continue // Skip if we can't find the text
          }
        } else {
          suggestion.startIndex = startIndex
          suggestion.endIndex = startIndex + suggestion.originalText.length
        }

        // Ensure required fields have defaults
        validSuggestions.push({
          id: suggestion.id || `suggestion_${Date.now()}_${Math.random()}`,
          type: suggestion.type || "style",
          severity: suggestion.severity || "medium",
          title: suggestion.title || "Improvement suggestion",
          description: suggestion.description || "Consider this improvement",
          originalText: suggestion.originalText,
          suggestedText: suggestion.suggestedText,
          startIndex: suggestion.startIndex,
          endIndex: suggestion.endIndex,
          explanation: suggestion.explanation || "This change improves readability",
        })
      }
    }

    return { suggestions: validSuggestions }
  } catch (error) {
    console.error("Error parsing AI response:", error)
    return { suggestions: [] }
  }
}

function generateSummary(suggestions: DocumentSuggestion[]) {
  const summary = {
    totalIssues: suggestions.length,
    grammarIssues: 0,
    styleIssues: 0,
    clarityIssues: 0,
    toneIssues: 0,
  }

  suggestions.forEach((suggestion) => {
    switch (suggestion.type) {
      case "grammar":
        summary.grammarIssues++
        break
      case "style":
        summary.styleIssues++
        break
      case "clarity":
        summary.clarityIssues++
        break
      case "tone":
        summary.toneIssues++
        break
    }
  })

  return summary
}
