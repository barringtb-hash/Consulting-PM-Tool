import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileMenu from './MobileMenu';
import {
  AIAssistantProvider,
  AIAssistantSidebar,
  useAIAssistant,
} from '../features/ai-assistant';
import { useModules } from '../modules';

export interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AI Assistant Toggle Button
 */
function AIAssistantToggle(): JSX.Element | null {
  const { toggle, isOpen } = useAIAssistant();
  const { isModuleEnabled } = useModules();

  if (!isModuleEnabled('mcp')) {
    return null;
  }

  return (
    <button
      onClick={toggle}
      className={`fixed bottom-6 right-6 z-30 p-4 rounded-full shadow-lg transition-all duration-200 ${
        isOpen
          ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
          : 'bg-primary-600 dark:bg-primary-500 text-white hover:bg-primary-700 dark:hover:bg-primary-600'
      }`}
      title="AI Assistant"
    >
      <Bot className="w-6 h-6" />
    </button>
  );
}

/**
 * Inner layout component that has access to AI Assistant context
 */
function AppLayoutInner({ children }: AppLayoutProps): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isModuleEnabled } = useModules();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenuClick={toggleMobileMenu} />
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
          {children}
        </main>
      </div>

      {/* AI Assistant */}
      {isModuleEnabled('mcp') && (
        <>
          <AIAssistantSidebar />
          <AIAssistantToggle />
        </>
      )}
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps): JSX.Element {
  return (
    <AIAssistantProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AIAssistantProvider>
  );
}

export default AppLayout;
