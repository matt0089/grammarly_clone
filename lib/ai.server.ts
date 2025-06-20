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
 * @param {string} documentType - The type of documentation to generate (e.g., 'JSDoc').
 * @returns {Promise<ReadableStream<string>>} A promise that resolves to a readable stream of strings.
 */
export async function generateFunctionDocumentationStream(
  functionName: string,
  fileContent: string,
  documentType: string,
): Promise<ReadableStream<string>> {
  const prompt = `
    Based on the following code, what does the function "${functionName}" do? 
    Please provide the answer in the form of a complete ${documentType} block.
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