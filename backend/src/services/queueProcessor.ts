import { prisma } from '../server';
import { generateBookContent, generateChapterContent, trainStyle } from './generation';
import { generateAudiobook } from './audiobook';
import { generateCoverArt } from './coverArt';
import { WebSocketServer } from 'ws';

export function startQueueProcessor() {
  console.log('Starting queue processor...');
  
  setInterval(async () => {
    try {
      await processQueueItem();
    } catch (error) {
      console.error('Queue processing error:', error);
    }
  }, 5000); // Process every 5 seconds
}

async function processQueueItem() {
  const queueItem = await prisma.generationQueue.findFirst({
    where: { status: 'Pending' },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ]
  });

  if (!queueItem) {
    return;
  }

  await prisma.generationQueue.update({
    where: { id: queueItem.id },
    data: { 
      status: 'Processing',
      startedAt: new Date()
    }
  });

  try {
    let result;

    switch (queueItem.taskType) {
      case 'Book':
        if (!queueItem.bookId) throw new Error('Book ID required');
        
        const book = await prisma.book.findUnique({
          where: { id: queueItem.bookId },
          include: { universe: true }
        });

        if (!book) throw new Error('Book not found');

        result = await generateBookContent(
          book.id,
          book.universeId,
          book.title,
          book.genre,
          book.targetLength,
          book.styleId || undefined
        );
        break;

      case 'Chapter':
        if (!queueItem.chapterId) throw new Error('Chapter ID required');
        
        const chapter = await prisma.chapter.findUnique({
          where: { id: queueItem.chapterId }
        });

        if (!chapter) throw new Error('Chapter not found');

        const metadata = queueItem.metadata as any;
        result = await generateChapterContent(
          chapter.id,
          chapter.bookId,
          chapter.chapterIndex,
          metadata.prompt,
          metadata.context
        );
        break;

      case 'StyleTraining':
        const styleMetadata = queueItem.metadata as any;
        if (!styleMetadata.styleId) throw new Error('Style ID required');
        
        result = await trainStyle(
          styleMetadata.styleId,
          styleMetadata.trainingData
        );
        break;

      case 'Audiobook':
        if (!queueItem.bookId) throw new Error('Book ID required');
        
        const audiobookMetadata = queueItem.metadata as any;
        result = await generateAudiobook(
          queueItem.bookId,
          audiobookMetadata.voice,
          audiobookMetadata.speed
        );
        break;

      case 'CoverArt':
        if (!queueItem.bookId) throw new Error('Book ID required');
        
        const coverMetadata = queueItem.metadata as any;
        result = await generateCoverArt(
          queueItem.bookId,
          coverMetadata.style,
          coverMetadata.prompt
        );
        break;

      default:
        throw new Error(`Unknown task type: ${queueItem.taskType}`);
    }

    await prisma.generationQueue.update({
      where: { id: queueItem.id },
      data: { 
        status: 'Completed',
        completedAt: new Date(),
        metadata: { 
          ...queueItem.metadata as any,
          result 
        }
      }
    });

    // Notify user via WebSocket
    await notifyUser(queueItem.profileId, {
      type: 'generation_completed',
      taskId: queueItem.id,
      taskType: queueItem.taskType,
      result
    });

  } catch (error) {
    console.error(`Task ${queueItem.id} failed:`, error);
    
    await prisma.generationQueue.update({
      where: { id: queueItem.id },
      data: { 
        status: 'Failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    // Refund credits for failed tasks
    await prisma.profile.update({
      where: { id: queueItem.profileId },
      data: { creditBalance: { increment: queueItem.creditsCost } }
    });

    await prisma.creditTransaction.create({
      data: {
        profileId: queueItem.profileId,
        amount: queueItem.creditsCost,
        type: 'Refund',
        description: `Failed task refund: ${queueItem.taskType}`
      }
    });

    // Notify user of failure
    await notifyUser(queueItem.profileId, {
      type: 'generation_failed',
      taskId: queueItem.id,
      taskType: queueItem.taskType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function notifyUser(profileId: string, message: any) {
  // This would integrate with WebSocket notifications
  // For now, just log it
  console.log(`Notification for ${profileId}:`, message);
}