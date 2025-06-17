/**
 * Calculates the Flesch Reading Ease score for a given text
 * Formula: 206.835 - (1.015 × ASL) - (84.6 × ASW)
 * Where ASL = Average Sentence Length, ASW = Average Syllables per Word
 */

export interface ReadabilityResult {
  score: number
  level: "very-easy" | "easy" | "fairly-easy" | "standard" | "fairly-difficult" | "difficult" | "very-difficult"
  color: "green" | "yellow" | "red"
  description: string
}

export function calculateFleschReadingEase(text: string): ReadabilityResult | null {
  // Clean and preprocess text
  const cleanText = preprocessText(text)

  // Count words (excluding punctuation and formatting)
  const words = getWords(cleanText)
  const wordCount = words.length

  // Return null if less than 30 words
  if (wordCount < 30) {
    return null
  }

  // Count sentences
  const sentenceCount = getSentenceCount(cleanText)

  // Count syllables
  const totalSyllables = words.reduce((total, word) => total + countSyllables(word), 0)

  // Calculate averages
  const averageSentenceLength = wordCount / sentenceCount
  const averageSyllablesPerWord = totalSyllables / wordCount

  // Calculate Flesch Reading Ease score
  const score = Math.round(206.835 - 1.015 * averageSentenceLength - 84.6 * averageSyllablesPerWord)

  // Ensure score is within 0-100 range
  const clampedScore = Math.max(0, Math.min(100, score))

  return {
    score: clampedScore,
    ...getScoreMetadata(clampedScore),
  }
}

function preprocessText(text: string): string {
  // Remove extra whitespace and normalize
  return text
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[""'']/g, '"') // Normalize quotes
    .trim()
}

function getWords(text: string): string[] {
  // Extract words, removing punctuation and formatting
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .replace(/\s+/g, " ") // Normalize spaces
    .trim()
    .split(" ")
    .filter((word) => word.length > 0)
}

function getSentenceCount(text: string): number {
  // Count sentences by looking for sentence-ending punctuation
  const sentences = text.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0)

  // Ensure at least 1 sentence for calculation
  return Math.max(1, sentences.length)
}

function countSyllables(word: string): number {
  // Simple syllable counting algorithm
  word = word.toLowerCase()

  // Handle empty or very short words
  if (word.length <= 2) return 1

  // Remove common endings that don't add syllables
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
  word = word.replace(/^y/, "")

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g)
  const syllableCount = vowelGroups ? vowelGroups.length : 1

  // Ensure at least 1 syllable
  return Math.max(1, syllableCount)
}

function getScoreMetadata(score: number): Pick<ReadabilityResult, "level" | "color" | "description"> {
  if (score >= 90) {
    return {
      level: "very-easy",
      color: "green",
      description: "Very Easy",
    }
  } else if (score >= 80) {
    return {
      level: "easy",
      color: "green",
      description: "Easy",
    }
  } else if (score >= 70) {
    return {
      level: "fairly-easy",
      color: "yellow",
      description: "Fairly Easy",
    }
  } else if (score >= 60) {
    return {
      level: "standard",
      color: "yellow",
      description: "Standard",
    }
  } else if (score >= 50) {
    return {
      level: "fairly-difficult",
      color: "red",
      description: "Fairly Difficult",
    }
  } else if (score >= 30) {
    return {
      level: "difficult",
      color: "red",
      description: "Difficult",
    }
  } else {
    return {
      level: "very-difficult",
      color: "red",
      description: "Very Difficult",
    }
  }
}
