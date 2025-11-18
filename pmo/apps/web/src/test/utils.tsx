import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    path = '/',
    queryClient = createTestQueryClient(),
  }: { route?: string; path?: string; queryClient?: QueryClient } = {},
) {
  window.history.pushState({}, 'Test page', route);

  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
