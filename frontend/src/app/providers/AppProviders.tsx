import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { LanguageFontProvider } from '@/app/providers/LanguageFontProvider';

function shouldRetryRequest(failureCount: number, error: unknown) {
  const status = (error as { response?: { status?: number } } | undefined)?.response?.status;

  if (status && status < 500) {
    return false;
  }

  return failureCount < 1;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: shouldRetryRequest,
      staleTime: 120_000,
      gcTime: 10 * 60_000,
      networkMode: 'online'
    },
    mutations: {
      retry: false,
      networkMode: 'online'
    }
  }
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <LanguageFontProvider>{children}</LanguageFontProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
