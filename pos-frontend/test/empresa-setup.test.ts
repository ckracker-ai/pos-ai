import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEmpresaSetupSteps, empresaSetupProgress } from '../src/core/config/empresa-setup.ts';
import type { Empresa } from '../src/core/interfaces/index.ts';

const baseEmpresa = {
  id: 'e1',
  rutEmpresa: '76.000.000-0',
  razonSocial: 'Costa Azul SpA',
  nombreFantasia: 'Costa Azul',
  giroSii: 'Comida',
  direccionComercial: 'Calle 1',
  correoFacturacion: 'fac@demo.cl',
  urlLogo: null,
  slug: 'costa',
  estado: 'ACTIVO',
  estadoTributario: 'FORMAL',
  rubroNegocio: null,
  telefonoNegocio: null,
  formalizacionProgreso: null,
  formalizacionPorcentaje: 0,
  esNegocioEnMarcha: false,
  planId: 'p1',
  plan: {
    id: 'p1',
    codigo: 'ESTANDAR',
    nombre: 'Estándar',
    descripcion: null,
    valor: 1,
    metodoPago: 'TRANSFERENCIA',
    activo: true,
    maxSucursales: 3,
    maxUsuarios: 10,
    features: {
      modulosCore: true,
      assistantWhatsapp: true,
      assistantVoz: false,
      pagosOnline: false,
    },
  },
  transferBankName: 'BancoEstado',
  transferAccountType: 'Cuenta vista',
  transferAccount: '123',
  transferHolderName: 'Costa',
  transferRut: '76.000.000-0',
  suscripcion: {
    id: 's1',
    estado: 'ACTIVA',
    origen: 'SEED',
    periodo: 'MENSUAL',
    inicioEn: '2026-01-01',
    proximoCobroEn: null,
    venceEn: null,
    graceHasta: null,
    notas: null,
  },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
} as Empresa;

test('setup incluye QR WhatsApp en plan Estándar y cuenta progreso', () => {
  const steps = buildEmpresaSetupSteps(baseEmpresa, { wspMenuEnabled: false });
  assert.ok(steps.some((s) => s.id === 'wsp' && s.done === false));
  const { done, total } = empresaSetupProgress(steps);
  assert.equal(total, 7);
  assert.ok(done >= 4);
  assert.ok(steps.some((s) => s.id === 'rubro' && s.done === false));
});
