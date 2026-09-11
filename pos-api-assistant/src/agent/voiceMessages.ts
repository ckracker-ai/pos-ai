/** Copys canal voz — cortos, sin markdown ni emojis. */

import { buscarExample } from './rubroGlossary.js';

export function voiceHelp(empresaNombre: string, rubroNegocio?: string | null): string {
  const buscar = buscarExample(rubroNegocio);
  return (
    `Hola, soy el asistente de ${empresaNombre}. ` +
    `Di sucursales para elegir local, luego ${buscar}, ` +
    `pedido 1 por 2, y confirmar. ` +
    `El pago te lo envío por WhatsApp al mismo número.`
  );
}

export function voicePaymentRedirect(): string {
  return (
    'Para pagar necesito WhatsApp. Te enviaré los datos al mismo número cuando confirmes el pedido.'
  );
}

export function voicePlanRequired(): string {
  return 'Este negocio no tiene plan Full con asistente telefónico. Contacta al comercio.';
}

export function voiceBindingMissing(): string {
  return 'Número no registrado en POS-AI. Contacta al comercio para activar la línea.';
}
