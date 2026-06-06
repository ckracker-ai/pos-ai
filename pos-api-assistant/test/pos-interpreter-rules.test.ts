import assert from 'node:assert/strict';

import { describe, it } from 'node:test';

import { interpretPosCartRules } from '../src/pos/rulesInterpreter.js';



const stocks = [

  { id: 'p1', nombre: 'Empanada de queso', sku: 'EMP-Q', precio: 1500, stock_actual: 10 },

  { id: 'p2', nombre: 'Empanada de pino', sku: 'EMP-P', precio: 2800, stock_actual: 10 },

  { id: 'p3', nombre: 'Empanada napolitana', sku: 'EMP-N', precio: 3000, stock_actual: 10 },

  { id: 'c1', nombre: 'Cafe Tradicional', sku: 'CAF-TRAD', precio: 2500, stock_actual: 20 },

  { id: 'b1', nombre: 'Coca Cola 350ml', sku: 'BEB-C', precio: 1200, stock_actual: 5 },

];



describe('interpretPosCartRules', () => {

  it('agrega producto por nombre', () => {

    const r = interpretPosCartRules({

      userText: 'agrega 2 empanadas de queso',

      stocks,

      cart: [],

    });

    assert.equal(r.intent, 'ADD_TO_CART');

    assert.equal(r.actions[0]?.product_id, 'p1');

    assert.equal(r.actions[0]?.quantity, 2);

  });



  it('agrega lista con comas sin cantidad en cada item', () => {
    const r = interpretPosCartRules({
      userText: 'agrega empanda de pino, cafe tradicional, 2 empandas de queso',
      stocks,
      cart: [],
    });
    assert.equal(r.actions.length, 3);
    assert.equal(r.actions[0]?.product_id, 'p2');
    assert.equal(r.actions[0]?.quantity, 1);
    assert.equal(r.actions[1]?.product_id, 'c1');
    assert.equal(r.actions[1]?.quantity, 1);
    assert.equal(r.actions[2]?.product_id, 'p1');
    assert.equal(r.actions[2]?.quantity, 2);
  });

  it('agrega dos productos con y', () => {


    const r = interpretPosCartRules({

      userText: 'agrega 1 empanda de queso y una empanda napolitana',

      stocks,

      cart: [],

    });

    assert.equal(r.actions.length, 2);

    assert.equal(r.actions[0]?.product_id, 'p1');

    assert.equal(r.actions[1]?.product_id, 'p3');

  });



  it('vaciar carrito', () => {

    const r = interpretPosCartRules({

      userText: 'vaciar carrito',

      stocks,

      cart: [{ id_producto: 'p1', cantidad: 1, precio_unitario: 1500 }],

    });

    assert.equal(r.intent, 'CLEAR_CART');

  });



  it('actualiza cantidad con deja N', () => {

    const r = interpretPosCartRules({

      userText: 'deja 3 empanadas de queso',

      stocks,

      cart: [{ id_producto: 'p1', cantidad: 1, precio_unitario: 1500 }],

    });

    assert.equal(r.actions[0]?.action, 'UPDATE');

    assert.equal(r.actions[0]?.quantity, 3);

  });



  it('quita empanda de pino del carrito', () => {

    const r = interpretPosCartRules({

      userText: 'quita empanda de pino',

      stocks,

      cart: [

        { id_producto: 'p2', cantidad: 2, precio_unitario: 2800 },

        { id_producto: 'b1', cantidad: 1, precio_unitario: 1200 },

      ],

    });

    assert.equal(r.intent, 'REMOVE_FROM_CART');

    assert.equal(r.actions[0]?.product_id, 'p2');

  });



  it('quitar quita ultimo item', () => {

    const r = interpretPosCartRules({

      userText: 'quitar',

      stocks,

      cart: [

        { id_producto: 'p2', cantidad: 1, precio_unitario: 2800 },

        { id_producto: 'b1', cantidad: 1, precio_unitario: 1200 },

      ],

    });

    assert.equal(r.actions[0]?.product_id, 'b1');

  });



  it('producto inexistente → UNKNOWN', () => {

    const r = interpretPosCartRules({

      userText: 'agrega sushi premium',

      stocks,

      cart: [],

    });

    assert.equal(r.intent, 'UNKNOWN');

    assert.equal(r.actions.length, 0);

  });

});


