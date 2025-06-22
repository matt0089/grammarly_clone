/**
 * @file This file contains server-side AI utilities.
 * Functions in this file should only be used in server environments.
 */

import 'server-only';

import { streamText, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * Generates a stream of documentation for a function using OpenAI.
 *
 * @param {string} functionName - The name of the function to document.
 * @param {string} fileContent - The content of the file containing the function.
 * @param {string} docFormat - The format of the documentation to generate (e.g., 'JSDoc').
 * @param {string} documentType - The type of document this will be part of.
 * @param {string | null} documentGoal - The overall goal of the document.
 * @returns {Promise<ReadableStream<string>>} A promise that resolves to a readable stream of strings.
 */
export async function generateFunctionDocumentationStream(
  functionName: string,
  fileContent: string,
  docFormat: string,
  documentType: string,
  documentGoal: string | null,
): Promise<ReadableStream<string>> {
  const prompt = `
    what does the function ${functionName} do, based on the code listing below?  Please answer as ${documentType || 'generic documentation'} for the function.  The description should have a tone and style in line with the document's goal: ${documentGoal || 'to be general purpose documentation'}

    Output the documentation only, no other text.

    \`\`\`
    ${fileContent}
    \`\`\`
  `;

  const { textStream } = await streamText({
    model: openai('chatgpt-4o-latest'),
    prompt,
  });

  return textStream;
}

/**
 * Generates a value for a document property using AI.
 *
 * @param {string} content - The content of the document.
 * @param {'title' | 'type' | 'goal'} property - The property to generate.
 * @returns {Promise<string>} The generated value.
 */
export async function generateDocumentProperty(
  content: string,
  property: 'title' | 'type' | 'goal',
): Promise<string> {
  const propertyConstraints = {
    title: 'no more than 6 words',
    type: 'no more than 4 words',
    goal: 'a concise description of around 30 words',
  };

  const prompt = `
    Based on the following document content, generate a suitable value for the document's "${property}".

    The generated ${property} should be ${propertyConstraints[property]}.

    Return only the generated text, with no extra formatting, labels, or quotation marks.

    Document Content:
    """
    ${content}
    """
  `;

  const { text } = await generateText({
    model: openai('chatgpt-4o-latest'),
    prompt,
  });

  return text;
} 