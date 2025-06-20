import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { promises as fs } from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import Parser from 'tree-sitter';
import ts from 'tree-sitter-typescript/typescript';
import js from 'tree-sitter-javascript';
import { glob } from 'glob';

/**
 * Extracts function names from a given code file using tree-sitter.
 * @param filePath The path to the file.
 * @param fileContent The content of the file.
 * @returns A list of function names.
 */
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

// Dynamically import the correct tree-sitter language based on file type
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

export async function POST(request: Request) {
  const { workspaceId } = await request.json();

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
  }

  const supabase = createClient();

  try {
    // 1. Fetch the repository URL and commit SHA from the database
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('github_repo_url, git_commit_sha')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      throw new Error('Workspace not found');
    }

    const { github_repo_url, git_commit_sha } = workspace;

    if (!github_repo_url || !git_commit_sha) {
      return NextResponse.json({ error: 'Repository URL or commit SHA not configured' }, { status: 400 });
    }
    
    // 2. Update the indexing_status for the workspace to INDEXING
    await supabase
      .from('workspaces')
      .update({ indexing_status: 'INDEXING' })
      .eq('id', workspaceId);

    // 3. Clone the repository into a temporary directory
    const tempDir = await fs.mkdtemp(path.join('/tmp', 'repo-'));
    const git = simpleGit();
    await git.clone(github_repo_url, tempDir, ['--depth', '1', '--branch', git_commit_sha]);
    
    // 4. Discover all relevant files
    const files = await glob('**/*.{js,jsx,ts,tsx}', {
      cwd: tempDir,
      ignore: '**/node_modules/**',
    });

    const allFunctions: {
      workspace_id: string;
      function_name: string;
      file_path: string;
      line_number: number;
    }[] = [];

    // 5. Parse files and extract function declarations
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const extractedFunctions = extractFunctionNames(filePath, fileContent);

      for (const { functionName, lineNumber } of extractedFunctions) {
        allFunctions.push({
          workspace_id: workspaceId,
          function_name: functionName,
          file_path: file,
          line_number: lineNumber,
        });
      }
    }

    // 6. Bulk insert function data
    if (allFunctions.length > 0) {
      await supabase.from('function_declarations').insert(allFunctions);
    }

    // 7. Update workspace status to COMPLETED
    await supabase
      .from('workspaces')
      .update({ indexing_status: 'COMPLETED' })
      .eq('id', workspaceId);

    // 8. Clean up the temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    return NextResponse.json({ message: 'Indexing completed successfully' });
  } catch (error) {
    console.error('Indexing failed:', error);
    // Update workspace status to FAILED
    await supabase
      .from('workspaces')
      .update({ indexing_status: 'FAILED' })
      .eq('id', workspaceId);

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 