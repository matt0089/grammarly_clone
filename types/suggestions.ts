export interface WritingSuggestion {
  id: string
  type: "grammar" | "style" | "clarity" | "tone" | "word-choice"
  severity: "low" | "medium" | "high"
  originalText: string
  suggestedText: string
  explanation: string
  startIndex: number
  endIndex: number
}

export interface DocumentAnalysis {
  suggestions: WritingSuggestion[]
  overallScore: number
  summary: string
}

export interface SuggestionState {
  accepted: boolean
  dismissed: boolean
  timestamp: Date
}
