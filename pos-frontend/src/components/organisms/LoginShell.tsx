import type { ReactNode } from 'react';

type LoginShellProps = {
  children: ReactNode;
};

/** Contenedor de pantallas de login con degradado de estudio (CSS nativo). */
export function LoginShell({ children }: LoginShellProps) {
  return (
    <main className="background-login relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(74,83,60,0.09),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(209,199,189,0.35),transparent_40%)]"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg">{children}</div>
    </main>
  );
}
