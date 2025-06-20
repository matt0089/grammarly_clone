import { z } from "zod"

// Enhanced suggestion interface
export interface EnhancedSuggestion {
  id: string
  type:
    | "grammar"
    | "spelling"
    | "style"
    | "clarity"
    | "conciseness"
    | "active-voice"
    | "word-choice"
    | "sentence-structure"
  severity: "error" | "warning" | "suggestion"
  text: string
  replacement: string
  explanation: string
  position: { start: number; end: number }
  confidence: number
  category: "critical" | "important" | "minor"
  aiGenerated: boolean
  contextualReason?: string
  alternativeOptions?: string[]
}

// Zod schema for LLM response validation
export const SuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum([
        "grammar",
        "spelling",
        "style",
        "clarity",
        "conciseness",
        "active-voice",
        "word-choice",
        "sentence-structure",
      ]),
      severity: z.enum(["error", "warning", "suggestion"]),
      originalText: z.string(),
      suggestedText: z.string(),
      explanation: z.string(),
      startIndex: z.number(),
      endIndex: z.number(),
      confidence: z.number().min(0).max(1),
      contextualReason: z.string().optional(),
      alternativeOptions: z.array(z.string()).optional(),
    }),
  ),
})

export type AISuggestionResponse = z.infer<typeof SuggestionSchema>

// Text chunk for processing
export interface TextChunk {
  text: string
  startIndex: number
  endIndex: number
  context?: string
}

// Cached suggestion
export interface CachedSuggestion {
  suggestions: EnhancedSuggestion[]
  timestamp: number
  textHash: string
}
