/**
 * @file This page serves as the main editor interface for a specific workspace.
 * It fetches workspace and document data and renders the core editor layout,
 * including the document manager and the text editor area.
 */

"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DocumentManager } from '@/components/document-manager';
import { DocumentMetadataModal } from '@/components/document-metadata-modal';
import { ReadabilityDisplay } from '@/components/readability-display';
import { SuggestedEdits } from '@/components/suggested-edits';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { Database } from '@/lib/database.types';
import { calculateFleschReadingEase, type ReadabilityResult } from '@/lib/readability';
import { type DocumentSuggestion } from '@/lib/ai-service';
import { Settings, LogOut, FileText, Info } from 'lucide-react';
import Link from 'next/link';

type Document = Database['public']['Tables']['documents']['Row'];
type Workspace = Database['public']['Tables']['workspaces']['Row'];

/**
 * The main component for the workspace editor page.
 * It orchestrates the different parts of the editor UI.
 *
 * @returns {React.ReactNode} The rendered editor page.
 */
export default function WorkspacePage() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [readabilityResult, setReadabilityResult] = useState<ReadabilityResult | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const supabase = createClient();

  useEffect(() => {
    if (!workspaceId) return;

    // Fetch initial workspace data
    const fetchWorkspace = async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();
      
      if (error) {
        console.error('Error fetching workspace:', error);
        toast.error('Failed to load workspace data.');
      } else {
        setWorkspace(data);
      }
    };

    fetchWorkspace();

    // Set up a real-time subscription
    const channel = supabase
      .channel(`workspace-${workspaceId}`)
      .on<Workspace>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'workspaces', filter: `id=eq.${workspaceId}` },
        (payload) => {
          setWorkspace(payload.new as Workspace);
          if (payload.new.indexing_status === 'COMPLETED') {
            toast.success('Repository indexing complete!');
          } else if (payload.new.indexing_status === 'FAILED') {
            toast.error('Repository indexing failed.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [workspaceId, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // The middleware will handle redirection
  };

  // Auto-save logic
  useEffect(() => {
    if (!selectedDocument) return;

    const handler = setTimeout(() => {
      if (documentContent !== selectedDocument.content) {
        handleSave();
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(handler);
  }, [documentContent, selectedDocument]);

  // Readability calculation logic
  useEffect(() => {
    const result = calculateFleschReadingEase(documentContent);
    setReadabilityResult(result);
  }, [documentContent]);

  const handleSelectDocument = (document: Document | null) => {
    setSelectedDocument(document);
    const newContent = document?.content || '';
    setDocumentContent(newContent);
  };

  const handleSave = async () => {
    if (!selectedDocument) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('documents')
      .update({ content: documentContent, updated_at: new Date().toISOString() })
      .eq('id', selectedDocument.id);

    if (error) {
      toast.error('Failed to save document.');
      console.error('Error saving:', error);
    } else {
      toast.success('Document saved!');
      setSelectedDocument({ ...selectedDocument, content: documentContent });
    }
    setIsSaving(false);
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocumentContent(e.target.value);
  };

  const handleApplySuggestion = (suggestion: DocumentSuggestion) => {
    const newText =
      documentContent.substring(0, suggestion.startIndex) +
      suggestion.suggestedText +
      documentContent.substring(suggestion.endIndex);
    setDocumentContent(newText);
    // The auto-save will pick this change up
  };

  const handleMetadataUpdate = (updatedDocument: Document) => {
    setSelectedDocument(updatedDocument);
    toast.success("Document metadata saved!");
  }

  const handleTextSelection = () => {
    const textarea = editorRef.current;
    if (textarea) {
      const text = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
      setSelectedText(text);
    }
  };
  
  const handleGenerateDocs = async () => {
    if (!selectedText || !workspaceId || !selectedDocument) {
      toast.error('Please select a function name first.');
      return;
    }

    setIsGeneratingDocs(true);
    const textarea = editorRef.current;
    if (!textarea) {
      setIsGeneratingDocs(false);
      return;
    }

    const { selectionStart, selectionEnd } = textarea;

    try {
      const response = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          functionName: selectedText,
          docFormat: selectedDocument.file_type === 'ts' ? 'TSDoc' : 'JSDoc',
          documentType: selectedDocument.document_type || 'General',
          documentGoal: selectedDocument.document_goal,
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate documentation.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let generatedText = '';

      // Streaming the response
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        generatedText += chunk;
        
        const newContent = 
          documentContent.substring(0, selectionStart) +
          generatedText +
          documentContent.substring(selectionEnd);
        
        setDocumentContent(newContent);
      }

    } catch (error) {
      console.error('Error generating documentation:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Failed to generate docs: ${errorMessage}`);
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading workspace...</p>
      </div>
    );
  }
  
  const wordCount = documentContent.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster />
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white dark:bg-gray-950">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">DocWise AI</h1>
          {workspace && (workspace.indexing_status === 'PENDING' || workspace.indexing_status === 'INDEXING') && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <span>Indexing repository...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" passHref>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Document Manager */}
        <div className="w-1/4 min-w-[350px] max-w-[400px] border-r bg-white dark:bg-gray-950 overflow-y-auto">
          <DocumentManager
            workspaceId={workspaceId}
            onSelectDocument={handleSelectDocument}
            selectedDocument={selectedDocument}
          />
        </div>

        {/* Center Panel: Text Editor */}
        <main className="flex-1 flex flex-col p-6 overflow-y-auto">
          {selectedDocument ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{selectedDocument.title}</h1>
                <div className="flex items-center gap-2">
                  <DocumentMetadataModal document={selectedDocument} onMetadataUpdate={handleMetadataUpdate} />
                  <Button variant="outline" size="sm">
                    <Info className="w-4 h-4 mr-2" />
                    Doc Info
                  </Button>
                  <Button onClick={handleGenerateDocs} disabled={!selectedText || isGeneratingDocs}>
                    {isGeneratingDocs ? 'Generating...' : 'Generate Docs'}
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
              <Textarea
                ref={editorRef}
                value={documentContent}
                onChange={handleContentChange}
                onSelect={handleTextSelection}
                className="flex-1 w-full h-full p-4 text-lg border rounded-md"
                placeholder="Start writing..."
              />
              <ReadabilityDisplay result={readabilityResult} wordCount={wordCount} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-medium">Welcome to your workspace!</h2>
                <p className="text-muted-foreground">Select a document to start editing or create a new one.</p>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel: AI Suggestions */}
        <aside className="w-1/4 min-w-[350px] max-w-[400px] border-l p-4 overflow-y-auto bg-white dark:bg-gray-950">
          <SuggestedEdits
            workspaceId={workspaceId}
            documentId={selectedDocument?.id || null}
            content={documentContent}
            onApplySuggestion={handleApplySuggestion}
            isEnabled={!!selectedDocument}
          />
        </aside>
      </div>
    </div>
  );
}
