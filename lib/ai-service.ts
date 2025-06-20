import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export interface SuggestionEdit {
  id: string
  type: "grammar" | "style" | "clarity" | "conciseness" | "tone"
  original: string
  suggested: string
  explanation: string
  startIndex: number
  endIndex: number
  confidence: "high" | "medium" | "low"
}

export interface DocumentAnalysis {
  suggestions: SuggestionEdit[]
  overallScore: number
  summary: string
}

export class AIService {
  private static instance: AIService
  private requestQueue: Map<string, Promise<DocumentAnalysis>> = new Map()

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  async analyzeDocument(content: string, documentId?: string): Promise<DocumentAnalysis> {
    // Use document ID as cache key, fallback to content hash
    const cacheKey = documentId || this.hashContent(content)

    // Return existing promise if analysis is in progress
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey)!
    }

    // Create new analysis promise
    const analysisPromise = this.performAnalysis(content)
    this.requestQueue.set(cacheKey, analysisPromise)

    try {
      const result = await analysisPromise
      return result
    } finally {
      // Clean up completed request
      this.requestQueue.delete(cacheKey)
    }
  }

  private async performAnalysis(content: string): Promise<DocumentAnalysis> {
    if (!content.trim() || content.trim().split(/\s+/).length < 10) {
      return {
        suggestions: [],
        overallScore: 100,
        summary: "Document too short for analysis. Write at least 10 words to get suggestions.",
      }
    }

    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: `You are an expert writing assistant. Analyze the provided text and suggest specific improvements for grammar, style, clarity, conciseness, and tone.

Return your response as a JSON object with this exact structure:
{
  "suggestions": [
    {
      "id": "unique_id",
      "type": "grammar|style|clarity|conciseness|tone",
      "original": "exact text to replace",
      "suggested": "improved version",
      "explanation": "brief explanation why this is better",
      "startIndex": number,
      "endIndex": number,
      "confidence": "high|medium|low"
    }
  ],
  "overallScore": number (0-100),
  "summary": "brief overall assessment"
}

Guidelines:
- Only suggest changes that genuinely improve the text
- Be specific with original text matches
- Provide clear, actionable explanations
- Focus on the most impactful improvements
- Limit to 8 suggestions maximum
- Calculate accurate start/end indices for text replacement`,
        prompt: `Please analyze this text and provide improvement suggestions:\n\n${content}`,
        temperature: 0.3,
      })

      const analysis = JSON.parse(text) as DocumentAnalysis

      // Validate and sanitize the response
      return this.validateAnalysis(analysis, content)
    } catch (error) {
      console.error("AI analysis failed:", error)
      return {
        suggestions: [],
        overallScore: 85,
        summary: "Analysis temporarily unavailable. Please try again later.",
      }
    }
  }

  private validateAnalysis(analysis: DocumentAnalysis, content: string): DocumentAnalysis {
    // Ensure suggestions have valid indices and exist in content
    const validSuggestions = analysis.suggestions
      .filter((suggestion) => {
        const { startIndex, endIndex, original } = suggestion
        if (startIndex < 0 || endIndex > content.length || startIndex >= endIndex) {
          return false
        }
        const actualText = content.slice(startIndex, endIndex)
        return actualText === original
      })
      .slice(0, 8) // Limit to 8 suggestions
      .map((suggestion, index) => ({
        ...suggestion,
        id: suggestion.id || `suggestion_${index}`,
      }))

    return {
      suggestions: validSuggestions,
      overallScore: Math.max(0, Math.min(100, analysis.overallScore || 85)),
      summary: analysis.summary || "Analysis complete.",
    }
  }

  private hashContent(content: string): string {
    // Simple hash function for caching
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }

  // Method to apply a suggestion to content
  applySuggestion(content: string, suggestion: SuggestionEdit): string {
    const { startIndex, endIndex, suggested } = suggestion
    return content.slice(0, startIndex) + suggested + content.slice(endIndex)
  }

  // Method to get suggestion types with colors
  getSuggestionTypeInfo(type: SuggestionEdit["type"]) {
    const typeMap = {
      grammar: { label: "Grammar", color: "red", bgColor: "bg-red-50", textColor: "text-red-700" },
      style: { label: "Style", color: "blue", bgColor: "bg-blue-50", textColor: "text-blue-700" },
      clarity: { label: "Clarity", color: "green", bgColor: "bg-green-50", textColor: "text-green-700" },
      conciseness: { label: "Conciseness", color: "purple", bgColor: "bg-purple-50", textColor: "text-purple-700" },
      tone: { label: "Tone", color: "orange", bgColor: "bg-orange-50", textColor: "text-orange-700" },
    }
    return typeMap[type] || typeMap.style
  }
}

export const aiService = AIService.getInstance()
