import assert from 'node:assert/strict';

import { describe, it } from 'node:test';

import {

  findProductByTextClient,

  interpretPosCartClient,

  splitProductSegments,

} from '../src/core/pos/posAiRulesClient';



const stocks = [

  { id: 'c1', nombre: 'Cafe Tradicional', sku: 'CAF-TRAD', precio: 2500, stock_actual: 20 },

  { id: 'p1', nombre: 'Empanada de queso', sku: 'EMP-Q', precio: 1500, stock_actual: 10 },

  { id: 'p2', nombre: 'Empanada de pino', sku: 'EMP-P', precio: 2800, stock_actual: 10 },

  { id: 'p3', nombre: 'Empanada napolitana', sku: 'EMP-N', precio: 3000, stock_actual: 10 },

  { id: 'b1', nombre: 'Coca Cola 350ml', sku: 'BEB-C', precio: 1200, stock_actual: 5 },

];



describe('posAiRulesClient', () => {

  it('encuentra cafe tradicional por tokens', () => {

    const p = findProductByTextClient('2 cafe tradicional', stocks);

    assert.equal(p?.id, 'c1');

  });



  it('distingue empanada de queso vs napolitana', () => {

    assert.equal(findProductByTextClient('empanada de queso', stocks)?.id, 'p1');

    assert.equal(findProductByTextClient('empanada napolitana', stocks)?.id, 'p3');

    assert.equal(findProductByTextClient('empanada de pino', stocks)?.id, 'p2');

  });



  it('divide segmentos con y y coma', () => {

    const segs = splitProductSegments('2 empanadas de pino y 2 cafes tradicionales');

    assert.equal(segs.length, 2);

    assert.match(segs[0], /pino/);

    assert.match(segs[1], /cafe/);

  });



  it('agrega 2 cafe tradicional al carrito', () => {

    const r = interpretPosCartClient({

      userText: 'agrega 2 cafe tradicional',

      stocks,

      cart: [],

    });

    assert.equal(r.intent, 'ADD_TO_CART');

    assert.equal(r.actions[0]?.product_id, 'c1');

    assert.equal(r.actions[0]?.quantity, 2);

  });



  it('agrega dos productos en un comando', () => {

    const r = interpretPosCartClient({

      userText: 'agrega 1 empanda de queso y una empanda napolitana',

      stocks,

      cart: [],

    });

    assert.equal(r.intent, 'ADD_TO_CART');

    assert.equal(r.actions.length, 2);

    assert.equal(r.actions[0]?.product_id, 'p1');

    assert.equal(r.actions[1]?.product_id, 'p3');

  });



  it('splitProductSegments divide lista con comas sin cantidad inicial', () => {
    const segs = splitProductSegments('empanda de pino, cafe tradicional, 2 empandas de queso');
    assert.equal(segs.length, 3, segs.join(' | '));
  });

  it('agrega lista separada por comas (caso QA)', () => {
    const r = interpretPosCartClient({
      userText: 'agrega empanda de pino, cafe tradicional, 2 empandas de queso',
      stocks,
      cart: [],
    });
    assert.equal(r.actions.length, 3, `got: ${JSON.stringify(r.actions)} msg: ${r.response_message}`);
    assert.equal(r.actions[0]?.product_id, 'p2');
    assert.equal(r.actions[0]?.quantity, 1);
    assert.equal(r.actions[1]?.product_id, 'c1');
    assert.equal(r.actions[1]?.quantity, 1);
    assert.equal(r.actions[2]?.product_id, 'p1');
    assert.equal(r.actions[2]?.quantity, 2);
  });

  it('agrega pino y cafe separados por coma', () => {

    const r = interpretPosCartClient({

      userText: 'agrega 2 empanadas de pino, 2 cafe tradicional',

      stocks,

      cart: [],

    });

    assert.equal(r.actions.length, 2);

    assert.equal(r.actions[0]?.product_id, 'p2');

    assert.equal(r.actions[0]?.quantity, 2);

    assert.equal(r.actions[1]?.product_id, 'c1');

    assert.equal(r.actions[1]?.quantity, 2);

  });



  it('quita empanda de pino del carrito', () => {

    const r = interpretPosCartClient({

      userText: 'quita empanda de pino',

      stocks,

      cart: [

        { id_producto: 'p2', cantidad: 2, precio_unitario: 2800 },

        { id_producto: 'c1', cantidad: 2, precio_unitario: 2500 },

      ],

    });

    assert.equal(r.intent, 'REMOVE_FROM_CART');

    assert.equal(r.actions[0]?.product_id, 'p2');

  });



  it('quitar sin nombre quita el ultimo del carrito', () => {

    const r = interpretPosCartClient({

      userText: 'quitar',

      stocks,

      cart: [

        { id_producto: 'p2', cantidad: 2, precio_unitario: 2800 },

        { id_producto: 'c1', cantidad: 2, precio_unitario: 2500 },

      ],

    });

    assert.equal(r.actions[0]?.product_id, 'c1');

    assert.equal(r.actions[0]?.action, 'REMOVE');

  });



  it('deja 3 cafe tradicional actualiza cantidad', () => {

    const r = interpretPosCartClient({

      userText: 'deja 3 cafe tradicional',

      stocks,

      cart: [{ id_producto: 'c1', cantidad: 4, precio_unitario: 2500 }],

    });

    assert.equal(r.actions[0]?.action, 'UPDATE');

    assert.equal(r.actions[0]?.quantity, 3);

  });



  it('cambia empanada de pino a 1', () => {

    const r = interpretPosCartClient({

      userText: 'cambia empanada de pino a 1',

      stocks,

      cart: [{ id_producto: 'p2', cantidad: 2, precio_unitario: 2800 }],

    });

    assert.equal(r.actions[0]?.action, 'UPDATE');

    assert.equal(r.actions[0]?.quantity, 1);

  });

});


