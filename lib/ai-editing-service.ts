import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export interface EditingSuggestion {
  id: string
  original: string
  suggested: string
  reason: string
  priority: 1 | 2 | 3
  startIndex: number
  endIndex: number
  chunkIndex: number
}

export interface ChunkAnalysis {
  chunkIndex: number
  chunkText: string
  suggestions: EditingSuggestion[]
  error?: string
}

export interface DocumentAnalysis {
  totalChunks: number
  completedChunks: number
  suggestions: EditingSuggestion[]
  isComplete: boolean
  errors: string[]
}

interface ChunkData {
  text: string
  startIndex: number
  endIndex: number
  chunkIndex: number
}

export class AIEditingService {
  private static readonly CHUNK_SIZE = 450
  private static readonly OVERLAP_SIZE = 25
  private static readonly MAX_SUGGESTIONS_PER_CHUNK = 10

  /**
   * Analyzes a document and returns editing suggestions
   */
  static async analyzeDocument(
    text: string,
    onProgress?: (analysis: DocumentAnalysis) => void,
  ): Promise<DocumentAnalysis> {
    if (!text.trim()) {
      return {
        totalChunks: 0,
        completedChunks: 0,
        suggestions: [],
        isComplete: true,
        errors: [],
      }
    }

    const chunks = this.chunkDocument(text)
    const analysis: DocumentAnalysis = {
      totalChunks: chunks.length,
      completedChunks: 0,
      suggestions: [],
      isComplete: false,
      errors: [],
    }

    // Process chunks sequentially to avoid rate limiting
    for (const chunk of chunks) {
      try {
        const chunkAnalysis = await this.analyzeChunk(chunk, text)

        if (chunkAnalysis.suggestions.length > 0) {
          analysis.suggestions.push(...chunkAnalysis.suggestions)
        }

        if (chunkAnalysis.error) {
          analysis.errors.push(chunkAnalysis.error)
        }
      } catch (error) {
        console.error(`Error analyzing chunk ${chunk.chunkIndex}:`, error)
        analysis.errors.push(`Failed to analyze section ${chunk.chunkIndex + 1}`)
      }

      analysis.completedChunks++

      // Call progress callback if provided
      if (onProgress) {
        onProgress({ ...analysis })
      }

      // Add delay between requests to respect rate limits
      if (chunk.chunkIndex < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    analysis.isComplete = true

    // Sort suggestions by priority and position
    analysis.suggestions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority // Higher priority first (1 < 2 < 3)
      }
      return a.startIndex - b.startIndex // Then by position
    })

    return analysis
  }

  /**
   * Splits document into manageable chunks with overlap
   */
  private static chunkDocument(text: string): ChunkData[] {
    const words = text.split(/\s+/)

    // If document is small enough, return as single chunk
    if (words.length <= 500) {
      return [
        {
          text: text,
          startIndex: 0,
          endIndex: text.length,
          chunkIndex: 0,
        },
      ]
    }

    const chunks: ChunkData[] = []
    let currentIndex = 0
    let chunkIndex = 0

    while (currentIndex < words.length) {
      const startWordIndex = Math.max(0, currentIndex - this.OVERLAP_SIZE)
      const endWordIndex = Math.min(words.length, currentIndex + this.CHUNK_SIZE)

      const chunkWords = words.slice(startWordIndex, endWordIndex)
      const chunkText = chunkWords.join(" ")

      // Find character positions in original text
      const beforeText = words.slice(0, startWordIndex).join(" ")
      const startIndex = beforeText.length + (beforeText.length > 0 ? 1 : 0)
      const endIndex = startIndex + chunkText.length

      chunks.push({
        text: chunkText,
        startIndex,
        endIndex,
        chunkIndex,
      })

      currentIndex += this.CHUNK_SIZE
      chunkIndex++
    }

    return chunks
  }

  /**
   * Analyzes a single chunk and returns suggestions
   */
  private static async analyzeChunk(chunk: ChunkData, fullText: string): Promise<ChunkAnalysis> {
    try {
      const prompt = this.buildPrompt(chunk.text)

      const { text: response } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
        temperature: 0.3,
        maxTokens: 1000,
      })

      const suggestions = this.parseResponse(response, chunk, fullText)

      return {
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.text,
        suggestions,
      }
    } catch (error) {
      console.error("Error in chunk analysis:", error)
      return {
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.text,
        suggestions: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Builds the prompt for the AI model
   */
  private static buildPrompt(text: string): string {
    return `You are a professional editor. Analyze this text and provide EXACTLY up to ${this.MAX_SUGGESTIONS_PER_CHUNK} high-priority editing suggestions.

PRIORITY ORDER:
1. Critical grammar/spelling errors
2. Clarity and readability issues  
3. Conciseness improvements
4. Consistency problems

FORMAT: Return as JSON array with:
- "original": exact text to replace (must match exactly)
- "suggested": improved version
- "reason": brief explanation (max 25 words)
- "priority": 1-3 (1=critical, 2=important, 3=minor)

RULES:
- Focus on highest impact changes only
- Preserve technical terms and proper nouns
- Maximum ${this.MAX_SUGGESTIONS_PER_CHUNK} suggestions
- Be specific and actionable
- Only suggest changes that significantly improve the text
- Return valid JSON array format

TEXT TO ANALYZE:
${text}

Return only the JSON array, no other text:`
  }

  /**
   * Parses the AI response and creates suggestion objects
   */
  private static parseResponse(response: string, chunk: ChunkData, fullText: string): EditingSuggestion[] {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.warn("No JSON array found in response")
        return []
      }

      const suggestions = JSON.parse(jsonMatch[0])

      if (!Array.isArray(suggestions)) {
        console.warn("Response is not an array")
        return []
      }

      return suggestions
        .filter(this.validateSuggestion)
        .map((suggestion, index) => {
          // Find the position of the original text in the full document
          const originalText = suggestion.original.trim()
          const startIndex = fullText.indexOf(originalText, chunk.startIndex)

          return {
            id: `${chunk.chunkIndex}-${index}-${Date.now()}`,
            original: originalText,
            suggested: suggestion.suggested.trim(),
            reason: suggestion.reason,
            priority: suggestion.priority,
            startIndex: startIndex >= 0 ? startIndex : chunk.startIndex,
            endIndex: startIndex >= 0 ? startIndex + originalText.length : chunk.startIndex + originalText.length,
            chunkIndex: chunk.chunkIndex,
          }
        })
        .filter((suggestion) => suggestion.startIndex >= 0) // Only include suggestions we can locate
        .slice(0, this.MAX_SUGGESTIONS_PER_CHUNK) // Ensure we don't exceed limit
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return []
    }
  }

  /**
   * Validates a suggestion object
   */
  private static validateSuggestion(suggestion: any): boolean {
    return (
      suggestion &&
      typeof suggestion.original === "string" &&
      typeof suggestion.suggested === "string" &&
      typeof suggestion.reason === "string" &&
      typeof suggestion.priority === "number" &&
      suggestion.priority >= 1 &&
      suggestion.priority <= 3 &&
      suggestion.original.trim().length > 0 &&
      suggestion.suggested.trim().length > 0 &&
      suggestion.original !== suggestion.suggested
    )
  }
}
