export const LANDING_HERO_BG = '/images/landing-hero-bg.png';

export const LANDING_AI_PILLARS = [
  {
    title: 'Asistente en WhatsApp',
    desc: 'Responde consultas, arma pedidos y cruza stock por sucursal en tiempo real — sin bots genéricos desconectados de tu caja.',
    icon: '◈',
  },
  {
    title: 'Validación de comprobantes',
    desc: 'La IA lee transferencias, compara monto y datos bancarios de tu empresa, y avisa al vendedor o admin para confirmar.',
    icon: '◎',
  },
  {
    title: 'Un solo cerebro operativo',
    desc: 'Ventas, inventario y canal digital comparten la misma verdad: menos errores, menos planillas, más velocidad.',
    icon: '◇',
  },
] as const;

export const LANDING_STATS = [
  { value: '10+', label: 'módulos en un solo SaaS' },
  { value: 'IA', label: 'nativa en plan Estándar' },
  { value: '24/7', label: 'nube multi-sucursal' },
  { value: 'CLP', label: 'precios claros + IVA' },
] as const;

export const LANDING_AI_STEPS = [
  {
    step: '01',
    title: 'Configura tu negocio',
    desc: 'RUT, sucursales, catálogo y datos de transferencia que la IA usará para validar pagos.',
  },
  {
    step: '02',
    title: 'Conecta WhatsApp',
    desc: 'El asistente atiende con tu stock real y deriva comprobantes al flujo de confirmación.',
  },
  {
    step: '03',
    title: 'Vende y controla',
    desc: 'Caja, cocina y reportes en el ERP; el canal digital no compite con tu operación — la extiende.',
  },
] as const;
