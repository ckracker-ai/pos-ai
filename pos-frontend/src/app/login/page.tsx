'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { LoginForm } from '@/components/organisms/LoginForm';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Redirigir si ya está autenticado
  useEffect(() => {
    // Si venimos por un 401/token expirado, limpiar flag y permitir ver el login.
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth-redirecting');
    }

    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);


  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 px-4">
      <LoginForm />
    </main>
  );
}
