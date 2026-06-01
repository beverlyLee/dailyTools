'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@/types/transaction';
import { transactionStore } from '@/lib/store';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    transactionStore.loadFromStorage();
    setTransactions(transactionStore.getTransactions());
    setIsLoaded(true);
    
    const unsubscribe = transactionStore.subscribe(() => {
      setTransactions(transactionStore.getTransactions());
    });
    
    return unsubscribe;
  }, []);

  return {
    transactions,
    isLoaded,
    setTransactions: transactionStore.setTransactions,
    clearTransactions: transactionStore.clearTransactions
  };
}
