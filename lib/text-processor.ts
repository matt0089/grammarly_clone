import type { TextChunk } from "./ai-types"

export class TextProcessor {
  private readonly MAX_CHUNK_SIZE = 500 // Reduced from 1000 to save memory
  private readonly CONTEXT_OVERLAP = 50 // Reduced from 100

  /**
   * Split text into logical chunks with context overlap
   */
  chunkText(text: string): TextChunk[] {
    if (text.length <= this.MAX_CHUNK_SIZE) {
      return [{ text, startIndex: 0, endIndex: text.length }]
    }

    const chunks: TextChunk[] = []
    let currentIndex = 0

    // Limit total chunks to prevent memory issues
    const maxChunks = 5
    let chunkCount = 0

    while (currentIndex < text.length && chunkCount < maxChunks) {
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

      // Simplified context to reduce memory usage
      const context = this.getSimpleContext(text, currentIndex, actualEndIndex)

      chunks.push({
        text: chunkText,
        startIndex: currentIndex,
        endIndex: actualEndIndex,
        context,
      })

      currentIndex = actualEndIndex - this.CONTEXT_OVERLAP
      if (currentIndex >= actualEndIndex) break
      chunkCount++
    }

    return chunks
  }

  /**
   * Find the end of a sentence near the target position
   */
  private findSentenceEnd(text: string, start: number, target: number): number {
    const searchText = text.slice(start, Math.min(target + 50, text.length)) // Reduced search range
    const sentenceEnders = /[.!?]\s+/g
    let match
    let lastEnd = target

    while ((match = sentenceEnders.exec(searchText)) !== null) {
      const absolutePos = start + match.index + match[0].length
      if (absolutePos <= target + 25) {
        // Reduced tolerance
        lastEnd = absolutePos
      } else {
        break
      }
    }

    return lastEnd
  }

  /**
   * Get simplified context for a text chunk
   */
  private getSimpleContext(text: string, start: number, end: number): string {
    const contextStart = Math.max(0, start - this.CONTEXT_OVERLAP)
    const contextEnd = Math.min(text.length, end + this.CONTEXT_OVERLAP)

    // Simplified context without markers to reduce memory
    return text.slice(contextStart, contextEnd)
  }

  /**
   * Generate a hash for text content
   */
  generateTextHash(text: string): string {
    let hash = 0
    // Process only first 1000 chars for hash to save memory
    const hashText = text.slice(0, 1000)
    for (let i = 0; i < hashText.length; i++) {
      const char = hashText.charCodeAt(i)
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

    // Simplified word comparison to save memory
    const newWords = newText.slice(0, 500).toLowerCase().split(/\s+/) // Only check first 500 chars
    const oldWords = oldText.slice(0, 500).toLowerCase().split(/\s+/)

    const wordDiff = Math.abs(newWords.length - oldWords.length)
    return wordDiff > Math.max(2, oldWords.length * 0.1) // 10% or 2 words
  }
}

export const textProcessor = new TextProcessor()
