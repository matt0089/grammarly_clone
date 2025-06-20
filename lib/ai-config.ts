import { createOpenAI } from "@ai-sdk/openai"

// Validate API key exists
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY environment variable is not set. AI suggestions will not work.")
}

export const openaiClient = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

export const isAIEnabled = !!process.env.OPENAI_API_KEY
