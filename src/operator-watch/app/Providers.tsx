import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClient } from '../api/queries';
import { ToastProvider } from '../components/Toast';
import { UiStateProvider } from './UiState';

/** In-memory routing: the site's own sidebar picks the page (see OperatorWatch.tsx), so the URL bar is left alone. */
export function Providers({ initialPath = '/', children }: { initialPath?: string; children: React.ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <UiStateProvider>
          <ToastProvider>{children}</ToastProvider>
        </UiStateProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
