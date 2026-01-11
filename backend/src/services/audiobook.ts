import { prisma } from '../server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateAudiobook(
  bookId: string,
  voice: string = 'alloy',
  speed: number = 1.0
) {
  try {
    const chapters = await prisma.chapter.findMany({
      where: { bookId },
      orderBy: { chapterIndex: 'asc' }
    });

    if (chapters.length === 0) {
      throw new Error('No chapters found for audiobook generation');
    }

    const audioSegments = [];

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      
      // Split chapter into manageable chunks (OpenAI TTS has limits)
      const chunks = splitTextIntoChunks(chapter.content, 4000);
      
      for (let j = 0; j < chunks.length; j++) {
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1',
          voice: voice as any,
          input: chunks[j],
          speed: speed
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        audioSegments.push({
          chapterIndex: i,
          chunkIndex: j,
          audio: buffer
        });

        // Add small pause between chunks
        if (j < chunks.length - 1) {
          audioSegments.push({
            chapterIndex: i,
            chunkIndex: -1, // Indicates pause
            audio: Buffer.alloc(16000 * 0.5) // 0.5 second silence
          });
        }
      }

      // Add longer pause between chapters
      if (i < chapters.length - 1) {
        audioSegments.push({
          chapterIndex: i,
          chunkIndex: -1,
          audio: Buffer.alloc(16000 * 2) // 2 second silence
        });
      }
    }

    // Combine all audio segments
    const combinedAudio = combineAudioSegments(audioSegments);

    // Generate metadata
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { universe: true }
    });

    const metadata = {
      title: book?.title || 'Unknown Title',
      author: 'HydraSkript AI',
      genre: book?.genre || 'Unknown',
      chapters: chapters.length,
      totalDuration: audioSegments.length * 2, // Rough estimate
      generatedAt: new Date().toISOString()
    };

    // In a real implementation, you would:
    // 1. Save the combined audio to cloud storage
    // 2. Create M4B format with chapters
    // 3. Add metadata tags
    // 4. Return the storage URL

    return {
      success: true,
      segments: audioSegments.length,
      metadata,
      storageUrl: `https://storage.example.com/audiobooks/${bookId}.m4b`
    };

  } catch (error) {
    console.error('Audiobook generation error:', error);
    throw error;
  }
}

function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks = [];
  let currentChunk = '';
  
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (trimmedSentence.length === 0) continue;
    
    if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
      currentChunk = trimmedSentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }
  
  return chunks;
}

function combineAudioSegments(segments: any[]): Buffer {
  // This is a simplified implementation
  // In reality, you'd need proper audio processing libraries
  // to combine MP3 files and create proper M4B format
  
  let totalLength = 0;
  for (const segment of segments) {
    totalLength += segment.audio.length;
  }
  
  const combined = Buffer.alloc(totalLength);
  let offset = 0;
  
  for (const segment of segments) {
    segment.audio.copy(combined, offset);
    offset += segment.audio.length;
  }
  
  return combined;
}