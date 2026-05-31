'use client';

import { PlatformGuard } from '@/components/organisms/PlatformGuard';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformGuard>{children}</PlatformGuard>;
}
