import { useState, useEffect } from 'react';
import hydraAPI from '../lib/api';

export interface GenerationTask {
  id: string;
  taskType: 'Book' | 'Chapter' | 'StyleTraining' | 'Audiobook' | 'CoverArt';
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  creditsCost: number;
  metadata?: any;
  error?: string;
}

export interface GenerationState {
  activeTasks: GenerationTask[];
  completedTasks: GenerationTask[];
  isLoading: boolean;
  error: string | null;
}

export function useGeneration() {
  const [generationState, setGenerationState] = useState<GenerationState>({
    activeTasks: [],
    completedTasks: [],
    isLoading: false,
    error: null
  });

  useEffect(() => {
    loadActiveTasks();
    loadCompletedTasks();

    // Listen for WebSocket updates
    const handleGenerationUpdate = (event: CustomEvent) => {
      const update = event.detail;
      updateTaskStatus(update.taskId, update.status, update.progress);
    };

    const handleGenerationCompleted = (event: CustomEvent) => {
      const completed = event.detail;
      moveTaskToCompleted(completed.taskId);
    };

    const handleGenerationFailed = (event: CustomEvent) => {
      const failed = event.detail;
      updateTaskStatus(failed.taskId, 'Failed', 0, failed.error);
    };

    window.addEventListener('generationUpdate', handleGenerationUpdate as EventListener);
    window.addEventListener('generationCompleted', handleGenerationCompleted as EventListener);
    window.addEventListener('generationFailed', handleGenerationFailed as EventListener);

    return () => {
      window.removeEventListener('generationUpdate', handleGenerationUpdate as EventListener);
      window.removeEventListener('generationCompleted', handleGenerationCompleted as EventListener);
      window.removeEventListener('generationFailed', handleGenerationFailed as EventListener);
    };
  }, []);

  const loadActiveTasks = async () => {
    try {
      const tasks = await hydraAPI.getActiveTasks();
      setGenerationState(prev => ({ ...prev, activeTasks: tasks }));
    } catch (error) {
      console.error('Failed to load active tasks:', error);
    }
  };

  const loadCompletedTasks = async () => {
    try {
      const result = await hydraAPI.getQueueHistory(1, 10);
      setGenerationState(prev => ({ ...prev, completedTasks: result.tasks }));
    } catch (error) {
      console.error('Failed to load completed tasks:', error);
    }
  };

  const updateTaskStatus = (taskId: string, status: string, progress: number, error?: string) => {
    setGenerationState(prev => ({
      ...prev,
      activeTasks: prev.activeTasks.map(task =>
        task.id === taskId
          ? { ...task, status, progress, error }
          : task
      )
    }));
  };

  const moveTaskToCompleted = (taskId: string) => {
    setGenerationState(prev => {
      const task = prev.activeTasks.find(t => t.id === taskId);
      if (!task) return prev;

      return {
        ...prev,
        activeTasks: prev.activeTasks.filter(t => t.id !== taskId),
        completedTasks: [task, ...prev.completedTasks].slice(0, 10) // Keep only latest 10
      };
    });
  };

  const generateBook = async (params: {
    title: string;
    genre: string;
    targetLength: number;
    universeId: string;
    styleId?: string;
  }) => {
    setGenerationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await hydraAPI.generateBook(params);
      await loadActiveTasks();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setGenerationState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setGenerationState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const generateChapter = async (params: {
    bookId: string;
    chapterIndex: number;
    prompt: string;
    context?: string;
  }) => {
    setGenerationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await hydraAPI.generateChapter(params);
      await loadActiveTasks();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setGenerationState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setGenerationState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const generateAudiobook = async (params: {
    bookId: string;
    voice: string;
    speed: number;
  }) => {
    setGenerationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await hydraAPI.generateAudiobook(params);
      await loadActiveTasks();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setGenerationState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setGenerationState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const generateCoverArt = async (params: {
    bookId: string;
    style: string;
    prompt?: string;
  }) => {
    setGenerationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await hydraAPI.generateCoverArt(params);
      await loadActiveTasks();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setGenerationState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setGenerationState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const cancelTask = async (taskId: string) => {
    try {
      await hydraAPI.cancelTask(taskId);
      await loadActiveTasks();
      await loadCompletedTasks();
    } catch (error) {
      console.error('Failed to cancel task:', error);
      throw error;
    }
  };

  const refreshTasks = async () => {
    await Promise.all([loadActiveTasks(), loadCompletedTasks()]);
  };

  return {
    ...generationState,
    generateBook,
    generateChapter,
    generateAudiobook,
    generateCoverArt,
    cancelTask,
    refreshTasks
  };
}