import React, { createContext, useContext, useMemo, useState } from 'react';
import { type Client } from '../api/clients';
import { type Project } from '../api/projects';

interface ClientProjectContextValue {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  reset: () => void;
}

const ClientProjectContext = createContext<
  ClientProjectContextValue | undefined
>(undefined);

export function useClientProjectContext(): ClientProjectContextValue {
  const context = useContext(ClientProjectContext);

  if (!context) {
    throw new Error(
      'useClientProjectContext must be used within a ClientProjectProvider',
    );
  }

  return context;
}

export function ClientProjectProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const reset = () => {
    setSelectedClient(null);
    setSelectedProject(null);
  };

  const value = useMemo(
    () => ({
      selectedClient,
      setSelectedClient,
      selectedProject,
      setSelectedProject,
      reset,
    }),
    [selectedClient, selectedProject],
  );

  return (
    <ClientProjectContext.Provider value={value}>
      {children}
    </ClientProjectContext.Provider>
  );
}
