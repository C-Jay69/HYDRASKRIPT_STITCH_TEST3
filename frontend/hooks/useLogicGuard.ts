import { useState, useEffect } from 'react';
import hydraAPI from '../lib/api';

export interface LogicGuardAlert {
  id: string;
  type: 'Lore Conflict' | 'Character Continuity' | 'Timeline Error' | 'Style Inconsistency';
  message: string;
  severity: 'low' | 'medium' | 'high';
  context?: string;
  suggestedFix?: string;
  location?: {
    chapter?: string;
    page?: number;
    paragraph?: number;
  };
}

export interface LogicGuardState {
  alerts: LogicGuardAlert[];
  integrityStats: {
    loreSync: number;
    timeline: 'Stable' | 'Unstable' | 'Critical';
    characterConsistency: number;
    styleConsistency: number;
  };
  isScanning: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useLogicGuard() {
  const [logicGuardState, setLogicGuardState] = useState<LogicGuardState>({
    alerts: [],
    integrityStats: {
      loreSync: 94,
      timeline: 'Stable',
      characterConsistency: 87,
      styleConsistency: 92
    },
    isScanning: false,
    isLoading: false,
    error: null
  });

  useEffect(() => {
    // Simulate loading logic guard data
    loadLogicGuardData();
  }, []);

  const loadLogicGuardData = async () => {
    setLogicGuardState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // In a real implementation, this would fetch from the backend
      // For now, simulate with mock data
      const mockAlerts: LogicGuardAlert[] = [
        {
          id: '1',
          type: 'Lore Conflict',
          message: 'Character Elias is currently established in London (Page 14), not The Weeping Woods.',
          severity: 'high',
          context: 'Current chapter places Elias in the forest, but previous chapter established him in London.',
          suggestedFix: 'Update timeline to show travel or use flashback narrative.',
          location: { chapter: 'Chapter 2: The Forest', page: 3, paragraph: 2 }
        },
        {
          id: '2',
          type: 'Character Continuity',
          message: 'Elias lost his Story Bible in the Prologue. Current text suggests he still possesses it.',
          severity: 'medium',
          context: 'Prologue: Elias drops the Story Bible during the chase. Chapter 2: He references having it.',
          suggestedFix: 'Either have him recover it or remove references to possessing it.',
          location: { chapter: 'Chapter 2: The Forest', page: 1, paragraph: 1 }
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setLogicGuardState(prev => ({
        ...prev,
        alerts: mockAlerts,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load logic guard data';
      setLogicGuardState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  };

  const startScan = async () => {
    setLogicGuardState(prev => ({ ...prev, isScanning: true, error: null }));

    try {
      // Simulate scanning process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate updated stats after scan
      const updatedStats = {
        loreSync: Math.min(100, logicGuardState.integrityStats.loreSync + Math.floor(Math.random() * 5)),
        timeline: 'Stable' as const,
        characterConsistency: Math.min(100, logicGuardState.integrityStats.characterConsistency + Math.floor(Math.random() * 3)),
        styleConsistency: Math.min(100, logicGuardState.integrityStats.styleConsistency + Math.floor(Math.random() * 2))
      };

      setLogicGuardState(prev => ({
        ...prev,
        integrityStats: updatedStats,
        isScanning: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scan failed';
      setLogicGuardState(prev => ({ ...prev, error: errorMessage, isScanning: false }));
    }
  };

  const applyQuickFix = async (alertId: string, fixType: string) => {
    setLogicGuardState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Simulate applying fix
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Remove the alert after fix
      setLogicGuardState(prev => ({
        ...prev,
        alerts: prev.alerts.filter(alert => alert.id !== alertId),
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply fix';
      setLogicGuardState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  };

  const dismissAlert = (alertId: string) => {
    setLogicGuardState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(alert => alert.id !== alertId)
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  return {
    ...logicGuardState,
    startScan,
    applyQuickFix,
    dismissAlert,
    getSeverityColor,
    getSeverityBg,
    refreshData: loadLogicGuardData
  };
}