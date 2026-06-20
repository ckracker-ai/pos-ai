import type { Metadata } from 'next';
import { GastronomicMenuView, type PublicMenuData } from '@/components/organisms/GastronomicMenuView';
import { posProxyPath } from '@/core/constants/api-path';

type PageProps = {
  params: Promise<{ slug: string }>;
};

const BFF_INTERNAL = (process.env.BFF_INTERNAL_URL || 'http://127.0.0.1:2020').replace(/\/$/, '');

async function fetchPublicMenu(slug: string): Promise<PublicMenuData | null> {
  const url = `${BFF_INTERNAL}${posProxyPath(`public/menu/${encodeURIComponent(slug)}`)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: { menu?: PublicMenuData } };
    return json.data?.menu ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const menu = await fetchPublicMenu(slug);
  if (!menu) {
    return { title: 'Menú no disponible · POS-AI' };
  }
  return {
    title: `${menu.title} · ${menu.empresaNombre}`,
    description: menu.subtitle ?? `Carta digital de ${menu.branchName}`,
  };
}

export default async function PublicMenuPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await fetchPublicMenu(slug);

  if (!menu) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f3] px-6 text-center">
        <div>
          <p className="text-4xl">🍽️</p>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-[#4a533c]">Menú no disponible</h1>
          <p className="mt-2 text-sm text-[#6b7362]">
            Este código QR no está activo o el local aún no publicó su carta.
          </p>
        </div>
      </div>
    );
  }

  return <GastronomicMenuView menu={menu} />;
}
