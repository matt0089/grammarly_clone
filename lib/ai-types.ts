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

// Zod schema for LLM response validation with better error handling
export const SuggestionSchema = z.object({
  suggestions: z
    .array(
      z
        .object({
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
          originalText: z.string().min(1, "Original text cannot be empty"),
          suggestedText: z.string().min(1, "Suggested text cannot be empty"),
          explanation: z.string().min(1, "Explanation cannot be empty"),
          startIndex: z.number().int().min(0, "Start index must be non-negative"),
          endIndex: z.number().int().min(0, "End index must be non-negative"),
          confidence: z.number().min(0).max(1, "Confidence must be between 0 and 1"),
          contextualReason: z.string().optional(),
          alternativeOptions: z.array(z.string()).optional(),
        })
        .refine((data) => data.endIndex > data.startIndex, {
          message: "End index must be greater than start index",
          path: ["endIndex"],
        }),
    )
    .min(0, "Suggestions array cannot be negative length"),
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
