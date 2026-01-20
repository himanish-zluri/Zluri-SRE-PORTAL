import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ProcessingContextType {
  processingQueries: Set<string>;
  addProcessingQuery: (queryId: string) => void;
  removeProcessingQuery: (queryId: string) => void;
  isQueryProcessing: (queryId: string) => boolean;
  clearAllProcessing: () => void;
}

const ProcessingContext = createContext<ProcessingContextType | null>(null);

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [processingQueries, setProcessingQueries] = useState<Set<string>>(new Set());

  const addProcessingQuery = useCallback((queryId: string) => {
    setProcessingQueries(prev => new Set([...prev, queryId]));
  }, []);

  const removeProcessingQuery = useCallback((queryId: string) => {
    setProcessingQueries(prev => {
      const newSet = new Set(prev);
      newSet.delete(queryId);
      return newSet;
    });
  }, []);

  const isQueryProcessing = useCallback((queryId: string) => {
    return processingQueries.has(queryId);
  }, [processingQueries]);

  const clearAllProcessing = useCallback(() => {
    setProcessingQueries(new Set());
  }, []);

  return (
    <ProcessingContext.Provider value={{
      processingQueries,
      addProcessingQuery,
      removeProcessingQuery,
      isQueryProcessing,
      clearAllProcessing
    }}>
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error('useProcessing must be used within a ProcessingProvider');
  }
  return context;
}