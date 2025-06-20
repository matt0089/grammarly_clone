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

export interface SuggestionState {
  isAnalyzing: boolean
  analysis: DocumentAnalysis | null
  error: string | null
  lastAnalyzedContent: string
}
