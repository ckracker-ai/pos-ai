import Link from 'next/link';
import { LegalDocumentView } from '@/components/molecules/LegalDocumentView';
import { fetchPublicLegalSla } from '@/core/api/public-legal';

export const metadata = {
  title: 'SLA — POS-AI',
};

export default async function SlaPage() {
  const legal = await fetchPublicLegalSla();
  const sla = legal?.sla;

  return (
    <div className="min-h-screen bg-brand-vanilla px-4 py-12">
      <div className="mb-6 text-center">
        <Link href="/" className="text-sm font-semibold text-brand-olive hover:underline">
          ← Volver al inicio
        </Link>
      </div>
      {sla ? (
        <LegalDocumentView title={sla.title} version={sla.version} contentMd={sla.contentMd} />
      ) : (
        <p className="text-center text-brand-ink-muted">
          No se pudo cargar el SLA. Intenta más tarde.
        </p>
      )}
    </div>
  );
}
