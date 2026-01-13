/**
 * AI Assistant Context
 *
 * Provides global state for the AI Assistant sidebar
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';

interface AIAssistantContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  // Context for queries
  clientId?: number;
  projectId?: number;
  setContext: (context: { clientId?: number; projectId?: number }) => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(
  undefined,
);

export function AIAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState<number | undefined>();
  const [projectId, setProjectId] = useState<number | undefined>();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const setContext = useCallback(
    (context: { clientId?: number; projectId?: number }) => {
      setClientId(context.clientId);
      setProjectId(context.projectId);
    },
    [],
  );

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      clientId,
      projectId,
      setContext,
    }),
    [isOpen, open, close, toggle, clientId, projectId, setContext],
  );

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant(): AIAssistantContextType {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider');
  }
  return context;
}
