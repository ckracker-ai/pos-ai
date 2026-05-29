// Initialize API client on app startup
'use client';

import { useEffect } from 'react';
import { initializeApiClient } from '@/lib/api-client';

export function ApiInitializer() {
  useEffect(() => {
    initializeApiClient();
  }, []);

  return null;
}
