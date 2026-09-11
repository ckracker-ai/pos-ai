import assert from 'node:assert/strict';
import test from 'node:test';
import { answerBusinessQuestion, type BusinessInsights } from '../src/core/pos/businessAgent.ts';

const sample: BusinessInsights = {
  mix7d: [
    { productName: 'Empanada de pino', qtySold: 40 },
    { productName: 'Cafe Tradicional', qtySold: 22 },
  ],
  peakHour: 13,
  peakSaleCount: 9,
  mermaQty7d: 3,
  mermaQty28d: 8,
  todaySales: 2,
  todayRevenue: 9900,
};

test('BI-3 mix cita agregados y no inventa platos', () => {
  const text = answerBusinessQuestion('cuál es el mix', sample);
  assert.match(text, /Empanada de pino/);
  assert.match(text, /7 días/);
  assert.ok(!text.toLowerCase().includes('invent'));
});

test('BI-3 pico cita hora de agregados', () => {
  const text = answerBusinessQuestion('hora pico', sample);
  assert.match(text, /13:00/);
  assert.match(text, /9 ventas/);
});

test('BI-3 merma cita unidades aprobadas', () => {
  const text = answerBusinessQuestion('cómo va la merma', sample);
  assert.match(text, /3 u/);
  assert.match(text, /no stock/i);
});

test('BI-3 sin mix no inventa productos', () => {
  const text = answerBusinessQuestion('mix', { ...sample, mix7d: [] });
  assert.match(text.toLowerCase(), /no hay mix/);
  assert.ok(!text.includes('Empanada'));
});

test('BI-3 no inventa stock', () => {
  const text = answerBusinessQuestion('cuánto stock de empanadas hay', sample);
  assert.match(text.toLowerCase(), /no invento stock/);
  assert.ok(!/\d+\s*u/.test(text));
});

test('BI-3 pregunta fuera de alcance no inventa', () => {
  const text = answerBusinessQuestion('quién es el mejor vendedor', sample);
  assert.match(text.toLowerCase(), /no lo sé/);
});
