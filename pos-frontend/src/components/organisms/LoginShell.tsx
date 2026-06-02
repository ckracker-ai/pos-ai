import type { ReactNode } from 'react';

type LoginShellProps = {
  children: ReactNode;
};

/** Contenedor de pantallas de login con degradado de estudio (CSS nativo). */
export function LoginShell({ children }: LoginShellProps) {
  return (
    <main className="background-login flex min-h-screen items-center justify-center px-4 py-10">
      {children}
    </main>
  );
}
