/**
 * @file This file contains the GitHub service, which is responsible for
 * all interactions with the GitHub API, such as fetching file content.
 */

/**
 * Fetches the raw content of a file from a GitHub repository at a specific commit.
 * 
 * @param {string} githubUrl - The base URL of the GitHub repository (e.g., https://github.com/owner/repo).
 * @param {string} commitSha - The SHA of the commit to fetch the file from.
 * @param {string} filePath - The path to the file within the repository.
 * @returns {Promise<string>} A promise that resolves to the raw text content of the file.
 * @throws Will throw an error if the file cannot be fetched.
 */
export async function getRawFileContent(githubUrl: string, commitSha: string, filePath: string): Promise<string> {
  const url = githubUrl
    .replace('github.com', 'raw.githubusercontent.com')
    .replace(/\.git$/, ''); // Remove .git suffix if present
  const rawUrl = `${url}/${commitSha}/${filePath}`;

  try {
    const response = await fetch(rawUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching raw file content from ${rawUrl}:`, error);
    throw new Error('Could not download file content from GitHub.');
  }
} 