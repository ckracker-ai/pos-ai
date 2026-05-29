'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { ApiInitializer } from './ApiInitializer';
import { RouteGuard } from '@/components/organisms/RouteGuard';
import { ToastViewport } from '@/components/organisms/ToastViewport';

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiInitializer />
      <RouteGuard>
        {children}
      </RouteGuard>
      <ToastViewport />
    </QueryClientProvider>
  );
}
