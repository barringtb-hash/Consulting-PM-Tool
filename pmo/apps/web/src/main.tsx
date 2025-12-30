/**
 * Application Entry Point
 *
 * This is the main entry point for the React frontend application.
 * It renders the root React component into the DOM with all necessary providers.
 *
 * Provider Hierarchy (outer to inner):
 * 1. React.StrictMode - Enables additional development checks
 * 2. BrowserRouter - React Router for client-side navigation
 * 3. QueryClientProvider - TanStack React Query for server state management
 * 4. ThemeProvider - Theme context (light/dark mode)
 * 5. ModuleProvider - Feature module availability from backend
 * 6. AuthProvider - Authentication state and user context
 * 7. ToastProvider - Global toast notifications
 * 8. App - Main application component with routing
 *
 * Provider Dependencies:
 * - QueryClientProvider must wrap AuthProvider (auth uses React Query)
 * - ModuleProvider must wrap routes (routes depend on enabled modules)
 * - AuthProvider must wrap App (routes check authentication)
 *
 * @module main
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { ModuleProvider } from './modules';
import { ThemeProvider } from './theme';
import App from './App';
import { queryClient } from './api/queries';
import { ToastProvider } from './ui/Toast';
import './index.css';

// Initialize error tracking for bug capture (auto-initializes on import)
import './utils/error-tracker';

// Get the root DOM element - fails fast if not found
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Render the application with React 18's concurrent features
createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ModuleProvider>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </ModuleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
