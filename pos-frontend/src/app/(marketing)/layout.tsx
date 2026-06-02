/**
 * Landing, login, registro y checkout — sin AppProviders, sin RouteGuard,
 * sin ApiInitializer (evita redirección al login por token vencido).
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
