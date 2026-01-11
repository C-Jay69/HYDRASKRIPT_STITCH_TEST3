import { prisma } from '../server';
import fetch from 'node-fetch';

export async function generateCoverArt(
  bookId: string,
  style: string = 'digital-art',
  customPrompt?: string
) {
  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { universe: true }
    });

    if (!book) {
      throw new Error('Book not found');
    }

    let prompt = customPrompt;
    
    if (!prompt) {
      // Generate prompt based on book metadata
      const genrePrompts = {
        'fantasy': 'magical, mystical, epic fantasy landscape',
        'sci-fi': 'futuristic, technological, space setting',
        'romance': 'romantic, emotional, intimate atmosphere',
        'mystery': 'dark, mysterious, suspenseful mood',
        'thriller': 'intense, dramatic, high-stakes scene',
        'horror': 'dark, scary, atmospheric horror',
        'historical': 'period-accurate, authentic historical setting'
      };

      const basePrompt = genrePrompts[book.genre.toLowerCase() as keyof typeof genrePrompts] || 'compelling book cover design';
      
      prompt = `Book cover for "${book.title}" - ${basePrompt}, professional book cover design, high quality, ${style} style`;
    }

    // Using FAL.ai API for image generation
    const response = await fetch('https://api.fal.ai/v1/image-generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FAL_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        style,
        aspect_ratio: '3:4',
        num_images: 1,
        guidance_scale: 7.5,
        num_inference_steps: 50
      })
    });

    if (!response.ok) {
      throw new Error(`FAL.ai API error: ${response.statusText}`);
    }

    const result = await response.json() as any;
    
    if (!result.images || result.images.length === 0) {
      throw new Error('No images generated');
    }

    const imageUrl = result.images[0].url;
    
    // In a real implementation, you would:
    // 1. Download the image from the URL
    // 2. Upload it to your cloud storage (R2/S3)
    // 3. Update the book record with the cover art URL
    // 4. Return the permanent storage URL

    // For now, return the FAL.ai URL
    return {
      success: true,
      imageUrl,
      prompt,
      style,
      bookTitle: book.title
    };

  } catch (error) {
    console.error('Cover art generation error:', error);
    throw error;
  }
}

export async function generateMultipleCovers(
  bookId: string,
  variations: number = 4
) {
  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      throw new Error('Book not found');
    }

    const styles = ['digital-art', 'photorealistic', 'illustration', 'minimalist'];
    const promises = [];

    for (let i = 0; i < Math.min(variations, styles.length); i++) {
      promises.push(generateCoverArt(bookId, styles[i]));
    }

    const results = await Promise.allSettled(promises);
    
    const successfulResults = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    const failedResults = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason);

    return {
      success: true,
      covers: successfulResults,
      failed: failedResults.length,
      total: results.length
    };

  } catch (error) {
    console.error('Multiple cover generation error:', error);
    throw error;
  }
}