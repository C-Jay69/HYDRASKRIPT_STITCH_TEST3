import { useState, useEffect } from 'react';
import hydraAPI from '../lib/api';

export interface Universe {
  id: string;
  name: string;
  description: string;
  globalLore: any;
  globalCharacters: any[];
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  genre: string;
  targetLength: number;
  currentStatus: 'Draft' | 'Queued' | 'Generating' | 'Complete';
  universeId: string;
  styleId?: string;
  createdAt: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  bookId: string;
  chapterIndex: number;
  title: string;
  content: string;
  wordCount: number;
  sequenceData: any;
  createdAt: string;
}

export interface Style {
  id: string;
  name: string;
  trainingDataRef?: string;
  structureMetrics: any;
  createdAt: string;
}

export interface LibraryState {
  universes: Universe[];
  books: Book[];
  styles: Style[];
  currentBook: Book | null;
  currentChapter: Chapter | null;
  isLoading: boolean;
  error: string | null;
}

export function useLibrary() {
  const [libraryState, setLibraryState] = useState<LibraryState>({
    universes: [],
    books: [],
    styles: [],
    currentBook: null,
    currentChapter: null,
    isLoading: false,
    error: null
  });

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    setLibraryState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // In a real implementation, these would be separate API calls
      // For now, simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockUniverses: Universe[] = [
        {
          id: 'universe_1',
          name: 'The Weeping Woods Universe',
          description: 'A mystical forest realm where stories come alive',
          globalLore: {
            setting: 'Ancient forest with magical properties',
            rules: 'Magic follows natural cycles, characters must respect the woods'
          },
          globalCharacters: [
            { id: 'char_1', name: 'Elias', currentLocation: 'London', traits: ['curious', 'determined'] }
          ],
          createdAt: new Date().toISOString()
        }
      ];

      const mockBooks: Book[] = [
        {
          id: 'book_1',
          title: 'The Weeping Woods',
          genre: 'Fantasy',
          targetLength: 75000,
          currentStatus: 'Generating',
          universeId: 'universe_1',
          createdAt: new Date().toISOString(),
          chapters: [
            {
              id: 'chapter_1',
              bookId: 'book_1',
              chapterIndex: 0,
              title: 'Prologue: The Awakening',
              content: 'The forest was ancient, older than memory itself...',
              wordCount: 2500,
              sequenceData: { generatedAt: new Date().toISOString() },
              createdAt: new Date().toISOString()
            },
            {
              id: 'chapter_2',
              bookId: 'book_1',
              chapterIndex: 1,
              title: 'Chapter 1: The Forest',
              content: 'The canopy above was a dense weave of emerald and shadow...',
              wordCount: 3200,
              sequenceData: { generatedAt: new Date().toISOString() },
              createdAt: new Date().toISOString()
            }
          ]
        }
      ];

      const mockStyles: Style[] = [
        {
          id: 'style_1',
          name: 'Mystical Prose',
          trainingDataRef: 'Sample of mystical writing style',
          structureMetrics: {
            sentenceLengthAvg: 18,
            paragraphLengthAvg: 5,
            complexityScore: 7
          },
          createdAt: new Date().toISOString()
        }
      ];

      setLibraryState(prev => ({
        ...prev,
        universes: mockUniverses,
        books: mockBooks,
        styles: mockStyles,
        currentBook: mockBooks[0],
        currentChapter: mockBooks[0].chapters[1],
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load library data';
      setLibraryState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  };

  const createUniverse = async (params: {
    name: string;
    description: string;
    globalLore: any;
    globalCharacters: any[];
  }) => {
    setLibraryState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // In a real implementation, this would call the API
      // For now, simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newUniverse: Universe = {
        id: 'universe_new',
        name: params.name,
        description: params.description,
        globalLore: params.globalLore,
        globalCharacters: params.globalCharacters,
        createdAt: new Date().toISOString()
      };

      setLibraryState(prev => ({
        ...prev,
        universes: [...prev.universes, newUniverse],
        isLoading: false
      }));

      return newUniverse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create universe';
      setLibraryState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw error;
    }
  };

  const createBook = async (params: {
    title: string;
    genre: string;
    targetLength: number;
    universeId: string;
    styleId?: string;
  }) => {
    setLibraryState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // In a real implementation, this would call the API
      // For now, simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newBook: Book = {
        id: 'book_new',
        title: params.title,
        genre: params.genre,
        targetLength: params.targetLength,
        currentStatus: 'Draft',
        universeId: params.universeId,
        styleId: params.styleId,
        createdAt: new Date().toISOString(),
        chapters: []
      };

      setLibraryState(prev => ({
        ...prev,
        books: [...prev.books, newBook],
        currentBook: newBook,
        isLoading: false
      }));

      return newBook;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create book';
      setLibraryState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw error;
    }
  };

  const createStyle = async (params: {
    name: string;
    trainingData: string;
  }) => {
    setLibraryState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // In a real implementation, this would call the API
      // For now, simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newStyle: Style = {
        id: 'style_new',
        name: params.name,
        trainingDataRef: params.trainingData,
        structureMetrics: {
          sentenceLengthAvg: 15,
          paragraphLengthAvg: 4,
          complexityScore: 6
        },
        createdAt: new Date().toISOString()
      };

      setLibraryState(prev => ({
        ...prev,
        styles: [...prev.styles, newStyle],
        isLoading: false
      }));

      return newStyle;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create style';
      setLibraryState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw error;
    }
  };

  const setCurrentBook = (book: Book | null) => {
    setLibraryState(prev => ({ ...prev, currentBook: book, currentChapter: null }));
  };

  const setCurrentChapter = (chapter: Chapter | null) => {
    setLibraryState(prev => ({ ...prev, currentChapter: chapter }));
  };

  const refreshLibrary = async () => {
    await loadLibraryData();
  };

  return {
    ...libraryState,
    createUniverse,
    createBook,
    createStyle,
    setCurrentBook,
    setCurrentChapter,
    refreshLibrary
  };
}