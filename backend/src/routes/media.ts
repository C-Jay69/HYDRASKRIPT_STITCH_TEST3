import express from 'express';
import multer from 'multer';
import { prisma } from '../server';
import { authenticateToken } from './auth';
import { z } from 'zod';
import { generateAudiobook } from '../services/audiobook';
import { generateCoverArt } from '../services/coverArt';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const audiobookSchema = z.object({
  bookId: z.string(),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).optional().default(1.0)
});

const coverArtSchema = z.object({
  bookId: z.string(),
  style: z.string().optional(),
  prompt: z.string().min(10).optional()
});

router.post('/audiobook', authenticateToken, async (req: any, res) => {
  try {
    const { bookId, voice, speed } = audiobookSchema.parse(req.body);
    
    const book = await prisma.book.findFirst({
      where: { id: bookId, ownerId: req.user.id }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const chapters = await prisma.chapter.findMany({
      where: { bookId },
      orderBy: { chapterIndex: 'asc' }
    });

    if (chapters.length === 0) {
      return res.status(400).json({ error: 'No chapters found for audiobook generation' });
    }

    const creditCost = chapters.length * 5;
    
    if (req.user.profile.creditBalance < creditCost) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    const queueItem = await prisma.generationQueue.create({
      data: {
        profileId: req.user.id,
        bookId,
        taskType: 'Audiobook',
        status: 'Pending',
        creditsCost: creditCost,
        metadata: { voice, speed, chapterCount: chapters.length }
      }
    });

    await prisma.profile.update({
      where: { id: req.user.id },
      data: { creditBalance: { decrement: creditCost } }
    });

    await prisma.creditTransaction.create({
      data: {
        profileId: req.user.id,
        amount: -creditCost,
        type: 'Generation',
        description: `Audiobook generation: ${book.title}`
      }
    });

    res.json({
      queueId: queueItem.id,
      message: 'Audiobook generation queued successfully',
      creditsRemaining: req.user.profile.creditBalance - creditCost,
      estimatedDuration: chapters.length * 2 // Rough estimate in minutes
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Audiobook generation error:', error);
    res.status(500).json({ error: 'Audiobook generation failed' });
  }
});

router.post('/cover-art', authenticateToken, async (req: any, res) => {
  try {
    const { bookId, style, prompt } = coverArtSchema.parse(req.body);
    
    const book = await prisma.book.findFirst({
      where: { id: bookId, ownerId: req.user.id }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const creditCost = 25;
    
    if (req.user.profile.creditBalance < creditCost) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    const queueItem = await prisma.generationQueue.create({
      data: {
        profileId: req.user.id,
        bookId,
        taskType: 'CoverArt',
        status: 'Pending',
        creditsCost: creditCost,
        metadata: { style, prompt, bookTitle: book.title }
      }
    });

    await prisma.profile.update({
      where: { id: req.user.id },
      data: { creditBalance: { decrement: creditCost } }
    });

    await prisma.creditTransaction.create({
      data: {
        profileId: req.user.id,
        amount: -creditCost,
        type: 'Generation',
        description: `Cover art generation: ${book.title}`
      }
    });

    res.json({
      queueId: queueItem.id,
      message: 'Cover art generation queued successfully',
      creditsRemaining: req.user.profile.creditBalance - creditCost
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Cover art generation error:', error);
    res.status(500).json({ error: 'Cover art generation failed' });
  }
});

router.get('/download/:bookId/:type', authenticateToken, async (req: any, res) => {
  try {
    const { bookId, type } = req.params;
    
    if (!['pdf', 'epub', 'audiobook'].includes(type)) {
      return res.status(400).json({ error: 'Invalid download type' });
    }

    const book = await prisma.book.findFirst({
      where: { id: bookId, ownerId: req.user.id }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // This would typically fetch from cloud storage
    // For now, return a placeholder URL
    const downloadUrl = `${process.env.STORAGE_ENDPOINT}/${bookId}/${type}`;

    res.json({
      downloadUrl,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;