export const FORMALIZACION_PASOS = [
  {
    id: 'sii' as const,
    title: 'Inicio de actividades (SII)',
    hint: 'Registra tu negocio en el Servicio de Impuestos Internos cuando vendas de forma habitual.',
  },
  {
    id: 'municipalidad' as const,
    title: 'Patente municipal',
    hint: 'Consulta en tu municipalidad si necesitas patente comercial para tu rubro.',
  },
  {
    id: 'cuentaBancaria' as const,
    title: 'Cuenta bancaria del negocio',
    hint: 'Separa finanzas personales y del negocio; facilita transferencias y pasarela.',
  },
] as const;

export type FormalizacionPasoId = (typeof FORMALIZACION_PASOS)[number]['id'];
