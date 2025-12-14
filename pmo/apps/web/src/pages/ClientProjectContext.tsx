import React, { createContext, useContext, useMemo, useState } from 'react';
import { type Account } from '../api/accounts';
import { type Project } from '../api/projects';

/**
 * @deprecated Use useAccountProjectContext instead
 */
export interface ClientProjectContextValue {
  selectedClient: Account | null;
  setSelectedClient: (account: Account | null) => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  reset: () => void;
}

// Renamed interface for CRM migration
export interface AccountProjectContextValue {
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  reset: () => void;
}

const AccountProjectContext = createContext<
  AccountProjectContextValue | undefined
>(undefined);

/**
 * @deprecated Use useAccountProjectContext instead
 */
export function useClientProjectContext(): ClientProjectContextValue {
  const context = useContext(AccountProjectContext);

  if (!context) {
    throw new Error(
      'useClientProjectContext must be used within an AccountProjectProvider',
    );
  }

  // Return with legacy naming for backwards compatibility
  return {
    selectedClient: context.selectedAccount,
    setSelectedClient: context.setSelectedAccount,
    selectedProject: context.selectedProject,
    setSelectedProject: context.setSelectedProject,
    reset: context.reset,
  };
}

export function useAccountProjectContext(): AccountProjectContextValue {
  const context = useContext(AccountProjectContext);

  if (!context) {
    throw new Error(
      'useAccountProjectContext must be used within an AccountProjectProvider',
    );
  }

  return context;
}

/**
 * @deprecated Use AccountProjectProvider instead
 */
export function ClientProjectProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <AccountProjectProvider>{children}</AccountProjectProvider>;
}

export function AccountProjectProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const reset = () => {
    setSelectedAccount(null);
    setSelectedProject(null);
  };

  const value = useMemo(
    () => ({
      selectedAccount,
      setSelectedAccount,
      selectedProject,
      setSelectedProject,
      reset,
    }),
    [selectedAccount, selectedProject],
  );

  return (
    <AccountProjectContext.Provider value={value}>
      {children}
    </AccountProjectContext.Provider>
  );
}
