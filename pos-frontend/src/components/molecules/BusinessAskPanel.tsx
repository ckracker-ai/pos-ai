'use client';

import {
  answerBusinessQuestion,
  type BusinessInsights,
} from '@/core/pos/businessAgent';
import { useMemo, useState } from 'react';

const PRESETS = [
  { id: 'mix', label: 'Mix', question: 'cuál es el mix' },
  { id: 'peak', label: 'Hora pico', question: 'hora pico' },
  { id: 'merma', label: 'Merma', question: 'cómo va la merma' },
] as const;

type Props = {
  insights: BusinessInsights | null;
  loading?: boolean;
};

export function BusinessAskPanel({ insights, loading }: Props) {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');

  const answer = useMemo(() => {
    if (!asked) return '';
    return answerBusinessQuestion(asked, insights);
  }, [asked, insights]);

  const run = (text: string) => {
    const next = text.trim();
    if (!next) return;
    setQuestion(next);
    setAsked(next);
  };

  return (
    <div className="app-card mt-6 rounded-2xl p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-ink-muted">
        Preguntar al negocio
      </h2>
      <p className="mt-1 text-sm text-brand-ink-muted">
        Cita mix, hora pico o merma de los agregados. No inventa stock ni entrena el modelo con ventas.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="rounded-full border border-brand-linen bg-white px-3 py-1 text-sm font-medium text-brand-olive hover:border-brand-olive/50"
            onClick={() => run(p.question)}
            disabled={loading}
          >
            {p.label}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          run(question);
        }}
      >
        <input
          className="app-input flex-1"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ej. mix, hora pico, merma…"
          disabled={loading}
        />
        <button type="submit" className="app-btn-secondary shrink-0" disabled={loading}>
          Preguntar
        </button>
      </form>
      {answer ? (
        <p className="mt-4 rounded-xl bg-brand-olive/5 px-4 py-3 text-sm leading-relaxed text-brand-ink">
          {answer}
        </p>
      ) : (
        <p className="mt-4 text-sm text-brand-ink-muted">
          Elige un chip o escribe. Si no hay dato en el período, responderá que no lo sabe.
        </p>
      )}
    </div>
  );
}
