import express from 'express';
import { prisma, redis } from '../server';
import { authenticateToken } from './auth';
import { z } from 'zod';
import { OpenAI } from 'openai';
import { generateBookContent, generateChapterContent } from '../services/generation';

const router = express.Router();

const bookGenerationSchema = z.object({
  universeId: z.string(),
  title: z.string().min(1),
  genre: z.string().min(1),
  targetLength: z.number().min(1000).max(100000),
  styleId: z.string().optional(),
  description: z.string().optional()
});

const chapterGenerationSchema = z.object({
  bookId: z.string(),
  chapterIndex: z.number().min(0),
  prompt: z.string().min(10),
  context: z.string().optional()
});

const styleTrainingSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trainingData: z.string().min(100)
});

router.post('/book', authenticateToken, async (req: any, res) => {
  try {
    const { universeId, title, genre, targetLength, styleId, description } = bookGenerationSchema.parse(req.body);
    
    const universe = await prisma.universe.findFirst({
      where: { id: universeId, ownerId: req.user.id }
    });

    if (!universe) {
      return res.status(404).json({ error: 'Universe not found' });
    }

    const creditCost = Math.ceil(targetLength / 100);
    
    if (req.user.profile.creditBalance < creditCost) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    const book = await prisma.book.create({
      data: {
        universeId,
        ownerId: req.user.id,
        title,
        genre,
        targetLength,
        styleId,
        currentStatus: 'Queued',
        metadata: { description }
      }
    });

    const queueItem = await prisma.generationQueue.create({
      data: {
        profileId: req.user.id,
        bookId: book.id,
        taskType: 'Book',
        status: 'Pending',
        creditsCost: creditCost,
        metadata: { targetLength, genre }
      }
    });

    await redis.lpush('generation_queue', JSON.stringify({
      id: queueItem.id,
      profileId: req.user.id,
      bookId: book.id,
      taskType: 'Book',
      creditsCost: creditCost
    }));

    await prisma.profile.update({
      where: { id: req.user.id },
      data: { creditBalance: { decrement: creditCost } }
    });

    await prisma.creditTransaction.create({
      data: {
        profileId: req.user.id,
        amount: -creditCost,
        type: 'Generation',
        description: `Book generation: ${title}`
      }
    });

    res.json({
      book,
      queueId: queueItem.id,
      message: 'Book generation queued successfully',
      creditsRemaining: req.user.profile.creditBalance - creditCost
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Book generation error:', error);
    res.status(500).json({ error: 'Book generation failed' });
  }
});

router.post('/chapter', authenticateToken, async (req: any, res) => {
  try {
    const { bookId, chapterIndex, prompt, context } = chapterGenerationSchema.parse(req.body);
    
    const book = await prisma.book.findFirst({
      where: { id: bookId, ownerId: req.user.id }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const existingChapter = await prisma.chapter.findFirst({
      where: { bookId, chapterIndex }
    });

    if (existingChapter) {
      return res.status(409).json({ error: 'Chapter already exists' });
    }

    const creditCost = 10;
    
    if (req.user.profile.creditBalance < creditCost) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    const chapter = await prisma.chapter.create({
      data: {
        bookId,
        ownerId: req.user.id,
        chapterIndex,
        title: `Chapter ${chapterIndex + 1}`,
        content: '',
        sequenceData: { prompt, context },
        wordCount: 0
      }
    });

    const queueItem = await prisma.generationQueue.create({
      data: {
        profileId: req.user.id,
        bookId,
        chapterId: chapter.id,
        taskType: 'Chapter',
        status: 'Pending',
        creditsCost: creditCost,
        metadata: { prompt, context, chapterIndex }
      }
    });

    await redis.lpush('generation_queue', JSON.stringify({
      id: queueItem.id,
      profileId: req.user.id,
      bookId,
      chapterId: chapter.id,
      taskType: 'Chapter',
      creditsCost: creditCost
    }));

    await prisma.profile.update({
      where: { id: req.user.id },
      data: { creditBalance: { decrement: creditCost } }
    });

    await prisma.creditTransaction.create({
      data: {
        profileId: req.user.id,
        amount: -creditCost,
        type: 'Generation',
        description: `Chapter ${chapterIndex + 1} generation`
      }
    });

    res.json({
      chapter,
      queueId: queueItem.id,
      message: 'Chapter generation queued successfully',
      creditsRemaining: req.user.profile.creditBalance - creditCost
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Chapter generation error:', error);
    res.status(500).json({ error: 'Chapter generation failed' });
  }
});

router.post('/style', authenticateToken, async (req: any, res) => {
  try {
    const { name, description, trainingData } = styleTrainingSchema.parse(req.body);
    
    const creditCost = 50;
    
    if (req.user.profile.creditBalance < creditCost) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    const style = await prisma.style.create({
      data: {
        ownerId: req.user.id,
        name,
        description,
        trainingDataRef: trainingData.substring(0, 1000)
      }
    });

    const queueItem = await prisma.generationQueue.create({
      data: {
        profileId: req.user.id,
        taskType: 'StyleTraining',
        status: 'Pending',
        creditsCost: creditCost,
        metadata: { styleId: style.id, trainingData }
      }
    });

    await redis.lpush('generation_queue', JSON.stringify({
      id: queueItem.id,
      profileId: req.user.id,
      styleId: style.id,
      taskType: 'StyleTraining',
      creditsCost: creditCost
    }));

    await prisma.profile.update({
      where: { id: req.user.id },
      data: { creditBalance: { decrement: creditCost } }
    });

    await prisma.creditTransaction.create({
      data: {
        profileId: req.user.id,
        amount: -creditCost,
        type: 'Generation',
        description: `Style training: ${name}`
      }
    });

    res.json({
      style,
      queueId: queueItem.id,
      message: 'Style training queued successfully',
      creditsRemaining: req.user.profile.creditBalance - creditCost
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Style training error:', error);
    res.status(500).json({ error: 'Style training failed' });
  }
});

export default router;