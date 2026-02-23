'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ProjectContextType {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('selectedProjectId');
    if (saved) setSelectedProjectId(saved);
  }, []);

  const handleSetSelectedProjectId = (id: string | null) => {
    setSelectedProjectId(id);
    if (id) {
      localStorage.setItem('selectedProjectId', id);
    } else {
      localStorage.removeItem('selectedProjectId');
    }
  };

  return (
    <ProjectContext.Provider 
      value={{ 
        selectedProjectId, 
        setSelectedProjectId: handleSetSelectedProjectId 
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
