'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

export type LandingFeatureSlide = {
  src: string;
  alt: string;
  label: string;
};

type LandingFeatureCarouselProps = {
  slides: readonly LandingFeatureSlide[];
};

const AUTOPLAY_MS = 7000;

export function LandingFeatureCarousel({ slides }: LandingFeatureCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex((next + count) % count);
    },
    [count],
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [paused, count]);

  if (count === 0) return null;

  return (
    <div
      className="landing-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div
        className="mb-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        role="tablist"
        aria-label="Capacidades POS-AI"
      >
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`landing-slide-panel-${i}`}
              id={`landing-slide-tab-${i}`}
              onClick={() => goTo(i)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-brand-olive text-white shadow-sm'
                  : 'border border-brand-linen bg-white text-brand-ink-muted hover:border-brand-olive/40 hover:text-brand-ink'
              }`}
            >
              {slide.label}
            </button>
          );
        })}
      </div>

      <div className="landing-carousel-viewport relative overflow-hidden rounded-2xl border border-brand-linen/70 bg-[#f8f7f5] shadow-[0_12px_40px_rgba(74,83,60,0.08)]">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
          aria-live="polite"
        >
          {slides.map((slide, i) => (
            <figure
              key={slide.src}
              id={`landing-slide-panel-${i}`}
              role="tabpanel"
              aria-labelledby={`landing-slide-tab-${i}`}
              aria-hidden={i !== index}
              className="relative min-w-full shrink-0"
            >
              <div className="relative aspect-[3/2] w-full sm:aspect-[16/10]">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  className="object-contain object-center p-2 sm:p-3"
                  sizes="(max-width: 1024px) 100vw, 896px"
                  priority={i === 0}
                />
              </div>
            </figure>
          ))}
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="landing-carousel-arrow landing-carousel-arrow--prev"
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="landing-carousel-arrow landing-carousel-arrow--next"
              aria-label="Siguiente"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2" aria-hidden>
          {slides.map((slide, i) => (
            <button
              key={`dot-${slide.src}`}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-brand-olive' : 'w-2 bg-brand-linen hover:bg-brand-olive/40'
              }`}
              aria-label={slide.label}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
