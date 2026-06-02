import type { ReactNode } from 'react';

type AppPageContentProps = {
  children: ReactNode;
  className?: string;
  /** Ancho máximo del contenido (default 80rem). */
  narrow?: boolean;
};

export function AppPageContent({ children, className = '', narrow = false }: AppPageContentProps) {
  return (
    <div
      className={`app-page-content mx-auto w-full ${narrow ? 'max-w-3xl' : 'max-w-7xl'} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
