'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { ApiInitializer } from './ApiInitializer';
import { ToastViewport } from '@/components/organisms/ToastViewport';

const queryClient = new QueryClient();

/** Solo rutas ERP `(app)` y plataforma — no usar en `(marketing)`. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiInitializer />
      {children}
      <ToastViewport />
    </QueryClientProvider>
  );
}
