'use client';

import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterProvider } from '@/hooks/useFilters';
import { Sidebar } from '@/components/layout/Sidebar';
import { useState } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <html lang="ja" data-theme="dark">
      <head>
        <title>AI Driven Analytics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <FilterProvider>
            <div className="page-layout">
              <Sidebar />
              <div className="main-content">
                {children}
              </div>
            </div>
          </FilterProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
