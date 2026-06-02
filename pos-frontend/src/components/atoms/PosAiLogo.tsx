import Image from 'next/image';
import { LOGO_PATH } from '@/core/constants/brand';

/** Dimensiones de `public/logo/pos-ai-logo.png` (recortado, sin cuadrícula) */
const LOGO_INTRINSIC_WIDTH = 593;
const LOGO_INTRINSIC_HEIGHT = 605;

type PosAiLogoProps = {
  /** Ancho de visualización en px (modo por defecto). */
  width?: number;
  /** Altura fija en px; el ancho escala (ideal para navbar / headers). */
  height?: number;
  className?: string;
  priority?: boolean;
  /** Marco blanco opcional (útil en fondos oscuros). */
  withBackground?: boolean;
};

export function PosAiLogo({
  width = 200,
  height,
  className = '',
  priority = false,
  withBackground = false,
}: PosAiLogoProps) {
  const displayHeight =
    height ?? Math.round((width * LOGO_INTRINSIC_HEIGHT) / LOGO_INTRINSIC_WIDTH);
  const displayWidth =
    height != null
      ? Math.round((height * LOGO_INTRINSIC_WIDTH) / LOGO_INTRINSIC_HEIGHT)
      : width;

  const image = (
    <Image
      src={LOGO_PATH}
      alt="POS-AI — Punto de venta Inteligente"
      width={LOGO_INTRINSIC_WIDTH}
      height={LOGO_INTRINSIC_HEIGHT}
      priority={priority}
      unoptimized
      className={`block shrink-0 object-contain object-center ${className}`.trim()}
      style={{ width: displayWidth, height: displayHeight, maxWidth: width }}
    />
  );

  if (!withBackground) return image;

  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-white px-0.5">
      {image}
    </span>
  );
}
