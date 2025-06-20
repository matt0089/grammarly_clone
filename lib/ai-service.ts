import OpenAI from "openai"

interface Suggestion {
  text: string
  score: number
}

interface DocumentAnalysis {
  suggestions: Suggestion[]
  overallScore: number
  summary: string
}

class AIService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async analyzeDocument(content: string): Promise<DocumentAnalysis> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        suggestions: [],
        overallScore: 0,
        summary: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.",
      }
    }

    if (!content.trim() || content.length < 50) {
      return {
        suggestions: [],
        overallScore: 0,
        summary: "Document too short for analysis. Write at least 50 characters to get suggestions.",
      }
    }

    try {
      const prompt = `Analyze the following document and provide suggestions for improvement.
      The suggestions should be concise and actionable.
      Also, provide an overall score (0-100) for the document's quality and a brief summary of its strengths and weaknesses.

      Document:
      ${content}

      Format your response as a JSON object with the following structure:
      {
        "suggestions": [
          {"text": "suggestion 1", "score": 0-100},
          {"text": "suggestion 2", "score": 0-100}
        ],
        "overallScore": 0-100,
        "summary": "A brief summary of the document's quality."
      }`

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      })

      const responseContent = completion.choices[0].message?.content

      if (!responseContent) {
        return {
          suggestions: [],
          overallScore: 0,
          summary: "Failed to get a response from OpenAI.",
        }
      }

      try {
        const analysis: DocumentAnalysis = JSON.parse(responseContent)
        return analysis
      } catch (error) {
        console.error("Error parsing OpenAI response:", error)
        return {
          suggestions: [],
          overallScore: 0,
          summary: "Failed to parse the OpenAI response.",
        }
      }
    } catch (error) {
      console.error("Error during OpenAI API call:", error)
      return {
        suggestions: [],
        overallScore: 0,
        summary: "An error occurred while calling the OpenAI API.",
      }
    }
  }
}

export default AIService
