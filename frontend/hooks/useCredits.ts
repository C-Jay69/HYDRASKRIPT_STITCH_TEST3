import { useState, useEffect } from 'react';
import hydraAPI from '../lib/api';

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'Purchase' | 'Generation' | 'Refund';
  description: string;
  createdAt: string;
}

export interface CreditState {
  balance: number;
  transactions: CreditTransaction[];
  subscriptionTier: string;
  isLoading: boolean;
  error: string | null;
}

export function useCredits() {
  const [creditState, setCreditState] = useState<CreditState>({
    balance: 0,
    transactions: [],
    subscriptionTier: 'Starter',
    isLoading: false,
    error: null
  });

  useEffect(() => {
    loadCreditData();
  }, []);

  const loadCreditData = async () => {
    setCreditState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const balanceData = await hydraAPI.getCreditBalance();
      setCreditState(prev => ({
        ...prev,
        balance: balanceData.balance,
        subscriptionTier: balanceData.subscriptionTier,
        transactions: balanceData.recentTransactions || []
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load credit data';
      setCreditState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setCreditState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const purchaseCredits = async (amount: number, paymentMethodId: string) => {
    setCreditState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await hydraAPI.purchaseCredits(amount, paymentMethodId);
      await loadCreditData(); // Refresh credit data
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Credit purchase failed';
      setCreditState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setCreditState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const upgradeSubscription = async (tier: string) => {
    setCreditState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await hydraAPI.upgradeSubscription(tier);
      await loadCreditData(); // Refresh credit data
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Subscription upgrade failed';
      setCreditState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setCreditState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const canAfford = (cost: number): boolean => {
    return creditState.balance >= cost;
  };

  const getGenerationCost = (type: 'book' | 'chapter' | 'style' | 'audiobook' | 'cover', params?: any): number => {
    switch (type) {
      case 'book':
        // Cost based on target length (1 credit per 100 words, minimum 50)
        const targetLength = params?.targetLength || 50000;
        return Math.max(50, Math.ceil(targetLength / 100));
      
      case 'chapter':
        return 10; // Fixed cost per chapter
      
      case 'style':
        return 50; // Fixed cost for style training
      
      case 'audiobook':
        // Cost based on chapter count (5 credits per chapter)
        const chapterCount = params?.chapterCount || 1;
        return chapterCount * 5;
      
      case 'cover':
        return 25; // Fixed cost for cover art
      
      default:
        return 10;
    }
  };

  const refreshCredits = async () => {
    await loadCreditData();
  };

  return {
    ...creditState,
    purchaseCredits,
    upgradeSubscription,
    canAfford,
    getGenerationCost,
    refreshCredits
  };
}