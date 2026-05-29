import type { Metadata } from 'next';
import { Providers } from './providers';
import './global.css';

export const metadata: Metadata = {
  title: 'SVM - Sistema de Ventas Multisucursal',
  description: 'Plataforma de gestión de ventas para múltiples sucursales',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
