import type { EnhancedSuggestion } from "./ai-types"
import { aiSuggestionService } from "./ai-suggestion-service"
import { textProcessor } from "./text-processor"

// Import the original regex rules
const GRAMMAR_RULES = [
  {
    pattern: /\bthere\s+is\s+(\w+)\s+(\w+s)\b/gi,
    replacement: "there are $1 $2",
    type: "grammar" as const,
    explanation: 'Use "there are" with plural nouns',
  },
  {
    pattern: /\byour\s+welcome\b/gi,
    replacement: "you're welcome",
    type: "grammar" as const,
    explanation: 'Use "you\'re" (you are) instead of "your"',
  },
  {
    pattern: /\bits\s+a\s+good\s+idea\b/gi,
    replacement: "it's a good idea",
    type: "grammar" as const,
    explanation: 'Use "it\'s" (it is) instead of "its"',
  },
  {
    pattern: /\b(recieve|recieved|recieving)\b/gi,
    replacement: (match: string) => match.replace("ie", "ei"),
    type: "spelling" as const,
    explanation: 'Remember: "i before e except after c"',
  },
  {
    pattern: /\bvery\s+(\w+)\b/gi,
    replacement: "$1",
    type: "style" as const,
    explanation: 'Consider removing "very" for more concise writing',
  },
  {
    pattern: /\bin\s+order\s+to\b/gi,
    replacement: "to",
    type: "clarity" as const,
    explanation: 'Simply use "to" instead of "in order to"',
  },
]

export class HybridProcessor {
  private lastProcessedText = ""
  private isProcessingAI = false

  /**
   * Get suggestions using hybrid approach: fast regex + AI enhancement
   */
  async getSuggestions(text: string): Promise<{
    suggestions: EnhancedSuggestion[]
    isProcessingAI: boolean
  }> {
    // Always get quick regex suggestions first
    const quickSuggestions = this.getQuickSuggestions(text)

    // Check if we should process with AI
    const shouldProcessAI = textProcessor.hasSignificantChanges(text, this.lastProcessedText)

    if (!shouldProcessAI && !this.isProcessingAI) {
      return { suggestions: quickSuggestions, isProcessingAI: false }
    }

    // Start AI processing if not already running
    if (shouldProcessAI && !this.isProcessingAI) {
      this.processWithAI(text, quickSuggestions)
    }

    return {
      suggestions: quickSuggestions,
      isProcessingAI: this.isProcessingAI,
    }
  }

  /**
   * Get immediate regex-based suggestions
   */
  private getQuickSuggestions(text: string): EnhancedSuggestion[] {
    const suggestions: EnhancedSuggestion[] = []

    GRAMMAR_RULES.forEach((rule, ruleIndex) => {
      let match
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags)

      while ((match = regex.exec(text)) !== null) {
        const replacement =
          typeof rule.replacement === "function"
            ? rule.replacement(match[0])
            : rule.replacement.replace(/\$(\d+)/g, (_, num) => match[Number.parseInt(num)] || "")

        suggestions.push({
          id: `regex-${ruleIndex}-${match.index}`,
          type: rule.type,
          severity: rule.type === "spelling" || rule.type === "grammar" ? "error" : "suggestion",
          text: match[0],
          replacement,
          explanation: rule.explanation,
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.9, // High confidence for regex rules
          category: rule.type === "spelling" || rule.type === "grammar" ? "critical" : "minor",
          aiGenerated: false,
        })
      }
    })

    return suggestions
  }

  /**
   * Process text with AI asynchronously
   */
  private async processWithAI(text: string, quickSuggestions: EnhancedSuggestion[]): Promise<void> {
    this.isProcessingAI = true
    this.lastProcessedText = text

    try {
      const aiSuggestions = await aiSuggestionService.generateSuggestions(text)
      const mergedSuggestions = this.mergeSuggestions(quickSuggestions, aiSuggestions)

      // Emit event with enhanced suggestions
      this.emitSuggestionsUpdate(mergedSuggestions)
    } catch (error) {
      console.error("AI processing failed:", error)
      // Keep using regex suggestions as fallback
    } finally {
      this.isProcessingAI = false
    }
  }

  /**
   * Merge regex and AI suggestions, removing duplicates
   */
  private mergeSuggestions(
    regexSuggestions: EnhancedSuggestion[],
    aiSuggestions: EnhancedSuggestion[],
  ): EnhancedSuggestion[] {
    const merged = [...regexSuggestions]

    // Add AI suggestions that don't overlap with regex suggestions
    for (const aiSuggestion of aiSuggestions) {
      const hasOverlap = regexSuggestions.some((regexSuggestion) =>
        this.suggestionsOverlap(regexSuggestion, aiSuggestion),
      )

      if (!hasOverlap) {
        merged.push(aiSuggestion)
      }
    }

    // Sort by importance
    return merged.sort((a, b) => {
      const categoryOrder = { critical: 0, important: 1, minor: 2 }
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category]
      if (categoryDiff !== 0) return categoryDiff

      return a.position.start - b.position.start
    })
  }

  /**
   * Check if two suggestions overlap
   */
  private suggestionsOverlap(a: EnhancedSuggestion, b: EnhancedSuggestion): boolean {
    return !(a.position.end <= b.position.start || b.position.end <= a.position.start)
  }

  /**
   * Emit suggestions update event
   */
  private emitSuggestionsUpdate(suggestions: EnhancedSuggestion[]): void {
    // Custom event for suggestion updates
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("suggestionsUpdated", {
          detail: { suggestions },
        }),
      )
    }
  }
}

export const hybridProcessor = new HybridProcessor()
