import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import Parser from 'tree-sitter';
import ts from 'tree-sitter-typescript/typescript';
import js from 'tree-sitter-javascript';
import { glob } from 'glob';
import { createClient } from '@/lib/supabase/server';

const getLanguage = (filePath: string) => {
  const extension = path.extname(filePath);
  if (['.ts', '.tsx'].includes(extension)) {
    return ts;
  }
  if (['.js', '.jsx'].includes(extension)) {
    return js;
  }
  return null;
};

function extractFunctionNames(filePath: string, fileContent: string) {
  const language = getLanguage(filePath);
  if (!language) {
    return [];
  }

  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse(fileContent);
  const functions: { functionName: string; lineNumber: number }[] = [];

  function findFunctions(node: Parser.SyntaxNode) {
    if (
      node.type === 'function_declaration' ||
      node.type === 'arrow_function' ||
      node.type === 'function_expression'
    ) {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        functions.push({
          functionName: nameNode.text,
          lineNumber: nameNode.startPosition.row + 1,
        });
      }
    }
    node.children.forEach(findFunctions);
  }

  findFunctions(tree.rootNode);
  return functions;
}

export async function runIndexingJob(workspaceId: string) {
  const supabase = createClient();
  console.log(`[Indexing Job] Starting for workspace: ${workspaceId}`);

  try {
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('github_repo_url, git_commit_sha')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) throw new Error('Workspace not found');

    const { github_repo_url, git_commit_sha } = workspace;
    if (!github_repo_url || !git_commit_sha) throw new Error('Repo URL not configured');
    
    await supabase.from('workspaces').update({ indexing_status: 'INDEXING' }).eq('id', workspaceId);

    const tempDir = await fs.mkdtemp(path.join('/tmp', 'repo-'));
    
    // 1. Clone the repository
    await simpleGit().clone(github_repo_url, tempDir);
    console.log(`[Indexing Job] Cloned repo ${github_repo_url} successfully.`);

    // 2. Checkout the specific commit
    const git = simpleGit(tempDir);
    await git.checkout(git_commit_sha);
    console.log(`[Indexing Job] Checked out commit ${git_commit_sha}.`);
    
    const files = await glob('**/*.{js,jsx,ts,tsx}', { cwd: tempDir, ignore: '**/node_modules/**' });
    console.log(`[Indexing Job] Found ${files.length} files to process.`);

    const allFunctions: any[] = [];
    for (const [index, file] of files.entries()) {
      if ((index + 1) % 25 === 0) {
        console.log(`[Indexing Job] Processing file ${index + 1}/${files.length}: ${file}`);
      }
      const filePath = path.join(tempDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const extractedFunctions = extractFunctionNames(filePath, fileContent);

      for (const { functionName, lineNumber } of extractedFunctions) {
        allFunctions.push({ workspace_id: workspaceId, function_name: functionName, file_path: file, line_number: lineNumber });
      }
    }

    if (allFunctions.length > 0) {
      console.log(`[Indexing Job] Found ${allFunctions.length} function declarations. Inserting into database.`);
      await supabase.from('function_declarations').insert(allFunctions);
    }

    await supabase.from('workspaces').update({ indexing_status: 'COMPLETED' }).eq('id', workspaceId);
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log(`[Indexing Job] Successfully completed for workspace: ${workspaceId}`);

  } catch (error) {
    console.error(`[Indexing Job] Failed for workspace ${workspaceId}:`, error);
    await supabase.from('workspaces').update({ indexing_status: 'FAILED' }).eq('id', workspaceId);
  }
}

/**
 * Retrieves the file path for a given function in a workspace.
 * 
 * @param {string} workspaceId - The ID of the workspace.
 * @param {string} functionName - The name of the function.
 * @returns {Promise<string>} A promise that resolves to the file path of the function.
 * @throws Will throw an error if the function location cannot be found.
 */
export async function getFunctionLocation(workspaceId: string, functionName: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('function_declarations')
    .select('file_path')
    .eq('workspace_id', workspaceId)
    .eq('function_name', functionName)
    .limit(1)
    .single();

  if (error || !data) {
    console.error(`Error fetching location for function "${functionName}" in workspace ${workspaceId}:`, error);
    throw new Error(`Could not find location for function "${functionName}".`);
  }

  return data.file_path;
} 