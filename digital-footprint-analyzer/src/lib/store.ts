'use client';

import { Transaction } from '@/types/transaction';

const STORAGE_KEY = 'digital-footprint-analyzer-data';

let transactions: Transaction[] = [];
let listeners: (() => void)[] = [];

function deserializeTransactions(data: string): Transaction[] {
  const parsed = JSON.parse(data);
  return parsed.map((t: any) => ({
    ...t,
    date: new Date(t.date)
  }));
}

export const transactionStore = {
  getTransactions: () => transactions,
  
  setTransactions: (newTransactions: Transaction[]) => {
    transactions = newTransactions;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTransactions));
    listeners.forEach(listener => listener());
  },
  
  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        transactions = deserializeTransactions(stored);
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  },
  
  clearTransactions: () => {
    transactions = [];
    localStorage.removeItem(STORAGE_KEY);
    listeners.forEach(listener => listener());
  },
  
  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};
