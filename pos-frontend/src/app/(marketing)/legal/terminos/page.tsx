import Link from 'next/link';
import { LegalDocumentView } from '@/components/molecules/LegalDocumentView';
import { fetchPublicLegalCurrent } from '@/core/api/public-legal';

export const metadata = {
  title: 'Términos de Servicio — POS-AI',
};

export default async function TerminosPage() {
  const legal = await fetchPublicLegalCurrent();
  const terms = legal?.terms;

  return (
    <div className="min-h-screen bg-brand-vanilla px-4 py-12">
      <div className="mb-6 text-center">
        <Link href="/" className="text-sm font-semibold text-brand-olive hover:underline">
          ← Volver al inicio
        </Link>
      </div>
      {terms ? (
        <LegalDocumentView
          title={terms.title}
          version={terms.version}
          contentMd={terms.contentMd}
        />
      ) : (
        <p className="text-center text-brand-ink-muted">
          No se pudieron cargar los términos. Intenta más tarde.
        </p>
      )}
    </div>
  );
}
