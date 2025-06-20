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

export const getSuggestionIcon = (type: DocumentSuggestion["type"]) => {
  switch (type) {
    case "grammar":
      return "📝"
    case "style":
      return "✨"
    case "clarity":
      return "🔍"
    case "tone":
      return "🎯"
    default:
      return "💡"
  }
}

export const getSuggestionColor = (severity: DocumentSuggestion["severity"]) => {
  switch (severity) {
    case "high":
      return "text-red-600 bg-red-50 border-red-200"
    case "medium":
      return "text-orange-600 bg-orange-50 border-orange-200"
    case "low":
      return "text-blue-600 bg-blue-50 border-blue-200"
    default:
      return "text-gray-600 bg-gray-50 border-gray-200"
  }
}
