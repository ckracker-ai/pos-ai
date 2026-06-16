'use client';

import { useEffect, useRef, useState } from 'react';
import { LANDING_MEDIA } from '@/core/constants/landing-content';

type LandingHeroVideoProps = {
  className?: string;
};

/** Poster al instante; autoplay solo en desktop para no bloquear móvil con el MP4 (~12 MB). */
export function LandingHeroVideo({ className = '' }: LandingHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const tryPlay = () => {
      const el = videoRef.current;
      if (!el || !mq.matches) return;
      el.play().catch(() => undefined);
    };
    setReady(true);
    tryPlay();
    mq.addEventListener('change', tryPlay);
    return () => mq.removeEventListener('change', tryPlay);
  }, []);

  return (
    <div
      className={`relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-white/15 bg-brand-ink shadow-[0_24px_64px_rgba(0,0,0,0.35)] ${className}`}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        controls
        preload="none"
        poster={LANDING_MEDIA.videoPoster}
        aria-label="Video promocional POS-AI"
      >
        <source src={LANDING_MEDIA.video} type="video/mp4" />
      </video>
      {!ready ? (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${LANDING_MEDIA.videoPoster})` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
