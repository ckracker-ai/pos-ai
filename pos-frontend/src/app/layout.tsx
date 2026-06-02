import type { Metadata } from 'next';
import './global.css';

export const metadata: Metadata = {
  title: 'POS-AI — Punto de venta Inteligente',
  description:
    'ERP en la nube para PYMEs: punto de venta, inventario, comandas y asistente WhatsApp con IA. Planes Básico, Estándar y Full.',
  icons: {
    icon: '/logo/pos-ai-logo.png',
    apple: '/logo/pos-ai-logo.png',
  },
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
      <body>{children}</body>
    </html>
  );
}
