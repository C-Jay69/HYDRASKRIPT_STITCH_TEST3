import { prisma, redis } from '../server';
import { OpenAI } from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateBookContent(
  bookId: string,
  universeId: string,
  title: string,
  genre: string,
  targetLength: number,
  styleId?: string
) {
  try {
    const universe = await prisma.universe.findUnique({
      where: { id: universeId }
    });

    if (!universe) {
      throw new Error('Universe not found');
    }

    const prompt = `Generate a ${genre} book titled "${title}" with approximately ${targetLength} words. 
    
Story Bible Context:
${JSON.stringify(universe.globalLore, null, 2)}

Global Characters:
${JSON.stringify(universe.globalCharacters, null, 2)}

Please create a compelling narrative that:
1. Maintains consistency with the established lore and characters
2. Follows the ${genre} genre conventions
3. Reaches the target word count
4. Has engaging plot progression and character development

Return the book content as a JSON object with the following structure:
{
  "title": "${title}",
  "chapters": [
    {
      "index": 0,
      "title": "Chapter 1",
      "content": "Chapter content here...",
      "wordCount": 2500
    }
  ],
  "totalWordCount": ${targetLength}
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional book author. Create engaging, well-structured content that maintains narrative consistency and follows genre conventions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No content generated');
    }

    const parsedContent = JSON.parse(responseContent);
    
    // Update book status and create chapters
    await prisma.book.update({
      where: { id: bookId },
      data: { currentStatus: 'Complete' }
    });

    for (const chapter of parsedContent.chapters) {
      await prisma.chapter.create({
        data: {
          bookId,
          ownerId: universe.ownerId,
          chapterIndex: chapter.index,
          title: chapter.title,
          content: chapter.content,
          wordCount: chapter.wordCount,
          sequenceData: {
            generatedAt: new Date().toISOString(),
            aiModel: 'gpt-4-turbo-preview'
          }
        }
      });
    }

    return {
      success: true,
      chapters: parsedContent.chapters.length,
      totalWordCount: parsedContent.totalWordCount
    };

  } catch (error) {
    console.error('Book generation error:', error);
    
    await prisma.book.update({
      where: { id: bookId },
      data: { currentStatus: 'Failed' }
    });

    throw error;
  }
}

export async function generateChapterContent(
  chapterId: string,
  bookId: string,
  chapterIndex: number,
  prompt: string,
  context?: string
) {
  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        universe: true,
        chapters: {
          where: { chapterIndex: { lt: chapterIndex } },
          orderBy: { chapterIndex: 'desc' },
          take: 3
        }
      }
    });

    if (!book) {
      throw new Error('Book not found');
    }

    const previousChapters = book.chapters.map(ch => ({
      index: ch.chapterIndex,
      title: ch.title,
      content: ch.content.substring(0, 1000) // First 1000 chars for context
    }));

    const generationPrompt = `Generate Chapter ${chapterIndex + 1} for the book "${book.title}" (${book.genre}).

Previous chapters context:
${JSON.stringify(previousChapters, null, 2)}

Story Bible:
${JSON.stringify(book.universe.globalLore, null, 2)}

Character states:
${JSON.stringify(book.universe.globalCharacters, null, 2)}

Chapter prompt: ${prompt}
${context ? `Additional context: ${context}` : ''}

Create engaging content that:
1. Continues naturally from previous chapters
2. Maintains character consistency
3. Advances the plot meaningfully
4. Matches the book's genre and tone

Return as JSON:
{
  "title": "Chapter ${chapterIndex + 1}",
  "content": "Chapter content here...",
  "wordCount": number
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional author. Write engaging chapter content that maintains narrative continuity and character consistency.'
        },
        {
          role: 'user',
          content: generationPrompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.7
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No content generated');
    }

    const parsedContent = JSON.parse(responseContent);

    // Update chapter with generated content
    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        title: parsedContent.title,
        content: parsedContent.content,
        wordCount: parsedContent.wordCount,
        sequenceData: {
          prompt,
          context,
          generatedAt: new Date().toISOString(),
          aiModel: 'gpt-4-turbo-preview'
        }
      }
    });

    return {
      success: true,
      title: parsedContent.title,
      wordCount: parsedContent.wordCount
    };

  } catch (error) {
    console.error('Chapter generation error:', error);
    throw error;
  }
}

export async function trainStyle(
  styleId: string,
  trainingData: string
) {
  try {
    const style = await prisma.style.findUnique({
      where: { id: styleId }
    });

    if (!style) {
      throw new Error('Style not found');
    }

    const analysisPrompt = `Analyze this writing sample and extract style characteristics:

${trainingData.substring(0, 2000)}

Return a JSON object with:
{
  "sentenceLengthAvg": average words per sentence (number),
  "paragraphLengthAvg": average sentences per paragraph (number),
  "complexityScore": 1-10 scale (number),
  "tone": "descriptive tone words",
  "commonPhrases": ["phrase1", "phrase2"],
  "vocabularyLevel": "simple/moderate/complex",
  "pacing": "slow/moderate/fast"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a literary analyst. Analyze writing style and provide structured metrics.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No analysis generated');
    }

    const metrics = JSON.parse(responseContent);

    await prisma.style.update({
      where: { id: styleId },
      data: {
        trainingDataRef: trainingData.substring(0, 1000),
        structureMetrics: metrics
      }
    });

    return {
      success: true,
      metrics
    };

  } catch (error) {
    console.error('Style training error:', error);
    throw error;
  }
}