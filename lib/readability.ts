/**
 * Calculate Flesch Reading Ease score
 * Formula: 206.835 - (1.015 × ASL) - (84.6 × ASW)
 * Where ASL = Average Sentence Length, ASW = Average Syllables per Word
 */
export function calculateFleschReadingEase(text: string): number {
  // Handle edge cases
  if (!text || text.trim().length === 0) {
    return 0
  }

  const cleanText = text.trim()

  // Count sentences (periods, exclamation marks, question marks)
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const sentenceCount = Math.max(sentences.length, 1) // Avoid division by zero

  // Count words (split by whitespace, filter out empty strings)
  const words = cleanText.split(/\s+/).filter((word) => word.length > 0)
  const wordCount = words.length

  // Handle very short texts
  if (wordCount === 0) {
    return 0
  }

  if (wordCount < 3) {
    return 100 // Very short texts are considered easy to read
  }

  // Count syllables
  let syllableCount = 0
  for (const word of words) {
    syllableCount += countSyllables(word)
  }

  // Calculate averages
  const averageSentenceLength = wordCount / sentenceCount
  const averageSyllablesPerWord = syllableCount / wordCount

  // Calculate Flesch Reading Ease score
  const score = 206.835 - 1.015 * averageSentenceLength - 84.6 * averageSyllablesPerWord

  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10))
}

/**
 * Count syllables in a word using a simplified algorithm
 */
function countSyllables(word: string): number {
  if (!word || word.length === 0) return 0

  // Convert to lowercase and remove non-alphabetic characters for counting
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "")

  if (cleanWord.length === 0) return 0
  if (cleanWord.length <= 2) return 1

  // Count vowel groups (consecutive vowels count as one syllable)
  let syllables = 0
  let previousWasVowel = false

  for (let i = 0; i < cleanWord.length; i++) {
    const isVowel = "aeiouy".includes(cleanWord[i])

    if (isVowel && !previousWasVowel) {
      syllables++
    }

    previousWasVowel = isVowel
  }

  // Handle silent 'e' at the end
  if (cleanWord.endsWith("e") && syllables > 1) {
    syllables--
  }

  // Every word has at least one syllable
  return Math.max(1, syllables)
}

/**
 * Get color indicator for Flesch Reading Ease score
 */
export function getReadabilityColor(score: number): "red" | "yellow" | "green" {
  if (score >= 60) return "green" // Easy to read
  if (score >= 30) return "yellow" // Fairly difficult
  return "red" // Very difficult
}

/**
 * Get descriptive text for Flesch Reading Ease score
 */
export function getReadabilityDescription(score: number): string {
  if (score >= 90) return "Very Easy"
  if (score >= 80) return "Easy"
  if (score >= 70) return "Fairly Easy"
  if (score >= 60) return "Standard"
  if (score >= 50) return "Fairly Difficult"
  if (score >= 30) return "Difficult"
  return "Very Difficult"
}
