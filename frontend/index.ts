// Main integration file for HydraSkript Frontend-Backend Connection
// This file provides the complete integration setup

import hydraAPI from './lib/api';
import { useAuth } from './hooks/useAuth';
import { useGeneration } from './hooks/useGeneration';
import { useCredits } from './hooks/useCredits';
import { useLogicGuard } from './hooks/useLogicGuard';
import { useLibrary } from './hooks/useLibrary';

export {
  hydraAPI,
  useAuth,
  useGeneration,
  useCredits,
  useLogicGuard,
  useLibrary
};

// Global integration setup
export const setupHydraSkriptIntegration = () => {
  // Initialize WebSocket connection
  hydraAPI.setupWebSocket();
  
  // Setup global error handling
  window.addEventListener('error', (event) => {
    console.error('HydraSkript Integration Error:', event.error);
  });
  
  // Setup global unhandled rejection handling
  window.addEventListener('unhandledrejection', (event) => {
    console.error('HydraSkript Integration Promise Rejection:', event.reason);
  });
  
  return {
    api: hydraAPI,
    hooks: {
      useAuth,
      useGeneration,
      useCredits,
      useLogicGuard,
      useLibrary
    }
  };
};

// Component integration helpers
export const withHydraSkript = (Component: React.ComponentType) => {
  return (props: any) => {
    const auth = useAuth();
    const generation = useGeneration();
    const credits = useCredits();
    const logicGuard = useLogicGuard();
    const library = useLibrary();
    
    return (
      <Component
        {...props}
        hydra={{
          auth,
          generation,
          credits,
          logicGuard,
          library
        }}
      />
    );
  };
};

// Utility functions for common operations
export const generateChapterWithAI = async (
  bookId: string,
  chapterIndex: number,
  prompt: string,
  context?: string
) => {
  try {
    // Check credits first
    const credits = await hydraAPI.getCreditBalance();
    const cost = 10; // Chapter generation cost
    
    if (credits.balance < cost) {
      throw new Error('Insufficient credits for chapter generation');
    }
    
    // Check Logic Guard if available
    const logicGuardCheck = await hydraAPI.checkLogicGuard({
      bookId,
      chapterIndex,
      prompt,
      context
    });
    
    if (logicGuardCheck.hasConflicts) {
      console.warn('Logic Guard conflicts detected:', logicGuardCheck.conflicts);
    }
    
    // Generate chapter
    const result = await hydraAPI.generateChapter({
      bookId,
      chapterIndex,
      prompt,
      context
    });
    
    return result;
  } catch (error) {
    console.error('Chapter generation failed:', error);
    throw error;
  }
};

export const createAudiobookWithProgress = async (
  bookId: string,
  options: any
) => {
  try {
    // Check credits
    const credits = await hydraAPI.getCreditBalance();
    const chapterCount = options.chapterCount || 1;
    const cost = chapterCount * 5; // 5 credits per chapter
    
    if (credits.balance < cost) {
      throw new Error('Insufficient credits for audiobook generation');
    }
    
    // Start audiobook generation
    const result = await hydraAPI.generateAudiobook({
      bookId,
      chapterCount,
      voice: options.voice || 'default',
      format: options.format || 'm4b'
    });
    
    // Monitor progress via WebSocket
    return new Promise((resolve, reject) => {
      const handleProgress = (event: CustomEvent) => {
        if (event.detail.taskId === result.taskId) {
          if (event.detail.status === 'completed') {
            window.removeEventListener('generationUpdate', handleProgress as EventListener);
            resolve(event.detail);
          } else if (event.detail.status === 'failed') {
            window.removeEventListener('generationUpdate', handleProgress as EventListener);
            reject(new Error(event.detail.error || 'Audiobook generation failed'));
          }
        }
      };
      
      window.addEventListener('generationUpdate', handleProgress as EventListener);
      
      // Timeout after 30 minutes
      setTimeout(() => {
        window.removeEventListener('generationUpdate', handleProgress as EventListener);
        reject(new Error('Audiobook generation timeout'));
      }, 30 * 60 * 1000);
    });
  } catch (error) {
    console.error('Audiobook generation failed:', error);
    throw error;
  }
};

// Default export
export default {
  setupHydraSkriptIntegration,
  withHydraSkript,
  generateChapterWithAI,
  createAudiobookWithProgress
};