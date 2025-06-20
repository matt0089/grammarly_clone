/**
 * @file This file contains server-side AI utilities.
 * Functions in this file should only be used in server environments.
 */

import 'server-only';

import { streamText } from 'ai';
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
    Based on the following code, what does the function "${functionName}" do? 
    Please provide the answer in the form of a complete ${docFormat} block.
    
    The documentation will be part of a larger document with the following properties:
    - Document Type: ${documentType}
    - Document Goal: ${documentGoal || 'Not specified'}

    Use this context to tailor the tone and level of detail in the documentation.
    Do not include any other text or explanation, only the documentation block itself.

    \`\`\`
    ${fileContent}
    \`\`\`
  `;

  const { textStream } = await streamText({
    model: openai('gpt-4-turbo'),
    prompt,
  });

  return textStream;
} 