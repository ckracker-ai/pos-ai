import Link from 'next/link';
import { LegalDocumentView } from '@/components/molecules/LegalDocumentView';
import { fetchPublicLegalCurrent } from '@/core/api/public-legal';

export const metadata = {
  title: 'Política de Privacidad — POS-AI',
};

export default async function PrivacidadPage() {
  const legal = await fetchPublicLegalCurrent();
  const privacy = legal?.privacy;

  return (
    <div className="min-h-screen bg-brand-vanilla px-4 py-12">
      <div className="mb-6 text-center">
        <Link href="/" className="text-sm font-semibold text-brand-olive hover:underline">
          ← Volver al inicio
        </Link>
      </div>
      {privacy ? (
        <LegalDocumentView
          title={privacy.title}
          version={privacy.version}
          contentMd={privacy.contentMd}
        />
      ) : (
        <p className="text-center text-brand-ink-muted">
          No se pudo cargar la política de privacidad. Intenta más tarde.
        </p>
      )}
    </div>
  );
}
