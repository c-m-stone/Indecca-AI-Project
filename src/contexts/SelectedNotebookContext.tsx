import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SelectedNotebookContextType {
  selectedNotebookId: string | null;
  setSelectedNotebookId: (id: string | null) => void;
}

const SelectedNotebookContext = createContext<SelectedNotebookContextType | undefined>(undefined);

export const useSelectedNotebook = () => {
  const context = useContext(SelectedNotebookContext);
  if (context === undefined) {
    throw new Error('useSelectedNotebook must be used within a SelectedNotebookProvider');
  }
  return context;
};

interface SelectedNotebookProviderProps {
  children: ReactNode;
}

export const SelectedNotebookProvider = ({ children }: SelectedNotebookProviderProps) => {
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);

  const value: SelectedNotebookContextType = {
    selectedNotebookId,
    setSelectedNotebookId,
  };

  return (
    <SelectedNotebookContext.Provider value={value}>
      {children}
    </SelectedNotebookContext.Provider>
  );
};