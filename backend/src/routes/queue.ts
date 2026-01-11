import express from 'express';
import { prisma } from '../server';
import { authenticateToken } from './auth';
import { z } from 'zod';

const router = express.Router();

router.get('/status/:taskId', authenticateToken, async (req: any, res) => {
  try {
    const { taskId } = req.params;
    
    const queueItem = await prisma.generationQueue.findFirst({
      where: { 
        id: taskId,
        profileId: req.user.id 
      }
    });

    if (!queueItem) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      id: queueItem.id,
      status: queueItem.status,
      taskType: queueItem.taskType,
      bookId: queueItem.bookId,
      chapterId: queueItem.chapterId,
      startedAt: queueItem.startedAt,
      completedAt: queueItem.completedAt,
      error: queueItem.error,
      progress: queueItem.metadata?.progress || 0
    });

  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

router.get('/active', authenticateToken, async (req: any, res) => {
  try {
    const activeTasks = await prisma.generationQueue.findMany({
      where: { 
        profileId: req.user.id,
        status: { in: ['Pending', 'Processing'] }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        taskType: true,
        bookId: true,
        chapterId: true,
        startedAt: true,
        progress: true,
        metadata: true,
        createdAt: true
      }
    });

    res.json({ tasks: activeTasks });

  } catch (error) {
    console.error('Active tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch active tasks' });
  }
});

router.get('/history', authenticateToken, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      prisma.generationQueue.findMany({
        where: { profileId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          status: true,
          taskType: true,
          bookId: true,
          chapterId: true,
          creditsCost: true,
          startedAt: true,
          completedAt: true,
          error: true,
          createdAt: true
        }
      }),
      prisma.generationQueue.count({
        where: { profileId: req.user.id }
      })
    ]);

    res.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Queue history error:', error);
    res.status(500).json({ error: 'Failed to fetch queue history' });
  }
});

router.post('/cancel/:taskId', authenticateToken, async (req: any, res) => {
  try {
    const { taskId } = req.params;
    
    const queueItem = await prisma.generationQueue.findFirst({
      where: { 
        id: taskId,
        profileId: req.user.id,
        status: { in: ['Pending', 'Processing'] }
      }
    });

    if (!queueItem) {
      return res.status(404).json({ error: 'Task not found or cannot be cancelled' });
    }

    await prisma.generationQueue.update({
      where: { id: taskId },
      data: { status: 'Cancelled' }
    });

    await prisma.profile.update({
      where: { id: req.user.id },
      data: { creditBalance: { increment: queueItem.creditsCost } }
    });

    await prisma.creditTransaction.create({
      data: {
        profileId: req.user.id,
        amount: queueItem.creditsCost,
        type: 'Refund',
        description: `Cancelled task: ${queueItem.taskType}`
      }
    });

    res.json({ 
      success: true, 
      message: 'Task cancelled and credits refunded',
      refundedCredits: queueItem.creditsCost
    });

  } catch (error) {
    console.error('Task cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel task' });
  }
});

export default router;