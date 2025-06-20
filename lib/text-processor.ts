import type { TextChunk } from "./ai-types"

export class TextProcessor {
  private readonly MAX_CHUNK_SIZE = 500 // Reduced from 1000
  private readonly CONTEXT_OVERLAP = 50 // Reduced from 100

  /**
   * Split text into logical chunks with context overlap
   */
  chunkText(text: string): TextChunk[] {
    // Limit total text size to prevent memory issues
    const MAX_TEXT_LENGTH = 5000
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.slice(0, MAX_TEXT_LENGTH)
    }

    if (text.length <= this.MAX_CHUNK_SIZE) {
      return [{ text, startIndex: 0, endIndex: text.length }]
    }

    const chunks: TextChunk[] = []
    let currentIndex = 0

    while (currentIndex < text.length) {
      const endIndex = Math.min(currentIndex + this.MAX_CHUNK_SIZE, text.length)

      // Try to break at sentence boundaries
      let actualEndIndex = endIndex
      if (endIndex < text.length) {
        const sentenceEnd = this.findSentenceEnd(text, currentIndex, endIndex)
        if (sentenceEnd > currentIndex + this.MAX_CHUNK_SIZE / 2) {
          actualEndIndex = sentenceEnd
        }
      }

      const chunkText = text.slice(currentIndex, actualEndIndex)
      const context = this.getContext(text, currentIndex, actualEndIndex)

      chunks.push({
        text: chunkText,
        startIndex: currentIndex,
        endIndex: actualEndIndex,
        context,
      })

      currentIndex = actualEndIndex - this.CONTEXT_OVERLAP
      if (currentIndex >= actualEndIndex) break
    }

    return chunks
  }

  /**
   * Find the end of a sentence near the target position
   */
  private findSentenceEnd(text: string, start: number, target: number): number {
    const searchText = text.slice(start, Math.min(target + 100, text.length))
    const sentenceEnders = /[.!?]\s+/g
    let match
    let lastEnd = target

    while ((match = sentenceEnders.exec(searchText)) !== null) {
      const absolutePos = start + match.index + match[0].length
      if (absolutePos <= target + 50) {
        lastEnd = absolutePos
      } else {
        break
      }
    }

    return lastEnd
  }

  /**
   * Get surrounding context for a text chunk
   */
  private getContext(text: string, start: number, end: number): string {
    const contextStart = Math.max(0, start - this.CONTEXT_OVERLAP)
    const contextEnd = Math.min(text.length, end + this.CONTEXT_OVERLAP)

    const beforeContext = text.slice(contextStart, start)
    const afterContext = text.slice(end, contextEnd)

    return `${beforeContext}[FOCUS]${text.slice(start, end)}[/FOCUS]${afterContext}`
  }

  /**
   * Generate a hash for text content
   */
  generateTextHash(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Check if text has significant changes
   */
  hasSignificantChanges(newText: string, oldText: string): boolean {
    if (!oldText) return true

    const lengthDiff = Math.abs(newText.length - oldText.length)
    const lengthThreshold = Math.max(10, oldText.length * 0.05) // 5% or 10 chars

    if (lengthDiff > lengthThreshold) return true

    // Check for substantial word changes
    const newWords = newText.toLowerCase().split(/\s+/)
    const oldWords = oldText.toLowerCase().split(/\s+/)

    const wordDiff = Math.abs(newWords.length - oldWords.length)
    return wordDiff > Math.max(2, oldWords.length * 0.1) // 10% or 2 words
  }
}

export const textProcessor = new TextProcessor()
