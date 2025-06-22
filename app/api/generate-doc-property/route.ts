import { NextRequest, NextResponse } from 'next/server';
import { generateDocumentProperty } from '@/lib/ai.server';

export async function POST(req: NextRequest) {
  try {
    const { documentContent, propertyToGenerate } = await req.json();

    if (!documentContent || !propertyToGenerate) {
      return NextResponse.json({ error: 'Missing documentContent or propertyToGenerate' }, { status: 400 });
    }

    const wordCount = documentContent.trim().split(/\s+/).length;
    if (wordCount < 30 || wordCount > 5000) {
      return NextResponse.json({ error: 'Document content must be between 30 and 5000 words.' }, { status: 400 });
    }

    const generatedValue = await generateDocumentProperty(documentContent, propertyToGenerate);

    return NextResponse.json({ generatedValue });
  } catch (error) {
    console.error('Error generating document property:', error);
    return NextResponse.json({ error: 'Failed to generate document property' }, { status: 500 });
  }
} 