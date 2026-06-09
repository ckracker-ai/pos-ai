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

  const burgerStocks = [
    {
      id: 'hb-carne',
      nombre: 'Hamburguesa Italiana',
      sku: 'HB-IT-C',
      precio: 3500,
      stock_actual: 10,
      categoria: 'Hamburguesa Carne',
    },
    {
      id: 'hb-pollo',
      nombre: 'Hamburguesa Italiana',
      sku: 'HB-IT-P',
      precio: 3500,
      stock_actual: 10,
      categoria: 'Hamburguesa Pollo',
    },
  ];

  it('pide variante si hay dos hamburguesas italianas', () => {
    const r = interpretPosCartClient({
      userText: 'amburguesa italiana',
      stocks: burgerStocks,
      cart: [],
    });
    assert.equal(r.intent, 'UNKNOWN');
    assert.equal(r.actions.length, 0);
    assert.equal(r.product_options?.length, 2);
  });

  it('agrega hamburguesa italiana de carne aunque el precio sea igual', () => {
    const r = interpretPosCartClient({
      userText: 'agregar hamburguesa italiana de carne',
      stocks: burgerStocks,
      cart: [],
    });
    assert.equal(r.intent, 'ADD_TO_CART');
    assert.equal(r.actions[0]?.product_id, 'hb-carne');
  });

  it('agrega pizza española familiar', () => {
    const stocks = [
      { id: 'es-p', nombre: 'Pizza Española', sku: 'PE-S', precio: 7000, stock_actual: 20, categoria: 'Pizza Personal' },
      { id: 'es-f', nombre: 'Pizza Española', sku: 'PE-F', precio: 13500, stock_actual: 20, categoria: 'Pizza Familiar' },
    ];
    const r = interpretPosCartClient({
      userText: 'agrega pizza española familiar',
      stocks,
      cart: [],
    });
    assert.equal(r.actions[0]?.product_id, 'es-f');
  });

  it('agrega hamburguesa italiana de carne con subcategoria en arbol', () => {
    const fusionBurgers = [
      {
        id: 'hb-c-p',
        nombre: 'Hamburguesa Italiana',
        sku: 'HB-C-P',
        precio: 3500,
        stock_actual: 20,
        categoria: 'Hamburguesas › Carne',
      },
      {
        id: 'hb-c-f',
        nombre: 'Hamburguesa Italiana',
        sku: 'HB-C-F',
        precio: 7000,
        stock_actual: 15,
        categoria: 'Hamburguesas › Carne',
      },
      {
        id: 'hb-p-p',
        nombre: 'Hamburguesa Italiana',
        sku: 'HB-P-P',
        precio: 3500,
        stock_actual: 20,
        categoria: 'Hamburguesas › Pollo',
      },
      {
        id: 'hb-p-f',
        nombre: 'Hamburguesa Italiana',
        sku: 'HB-P-F',
        precio: 7000,
        stock_actual: 15,
        categoria: 'Hamburguesas › Pollo',
      },
    ];
    const r = interpretPosCartClient({
      userText: 'agregar hamburguesa italiana de carne',
      stocks: fusionBurgers,
      cart: [],
    });
    assert.equal(r.intent, 'ADD_TO_CART');
    assert.equal(r.actions[0]?.product_id, 'hb-c-p');
  });

  it('no agrega pollo al pedir hamburguesa italiana de carne', () => {
    const fusionBurgers = [
      {
        id: 'hb-c-p',
        nombre: 'Hamburguesa Italiana',
        sku: 'HB-C-P',
        precio: 3500,
        stock_actual: 20,
        categoria: 'Hamburguesas › Carne',
      },
      {
        id: 'hb-p-p',
        nombre: 'Hamburguesa Italiana',
        sku: 'HB-P-P',
        precio: 3500,
        stock_actual: 20,
        categoria: 'Hamburguesas › Pollo',
      },
    ];
    const r = interpretPosCartClient({
      userText: 'agregar hamburguesa italiana de carne',
      stocks: fusionBurgers,
      cart: [],
    });
    assert.equal(r.intent, 'ADD_TO_CART');
    assert.equal(r.actions[0]?.product_id, 'hb-c-p');
  });

  it('agrega hamburguesa italiana de pollo con cantidad', () => {
    const r = interpretPosCartClient({
      userText: 'agregar 2 hamburguesa italiana de pollo',
      stocks: burgerStocks,
      cart: [],
    });
    assert.equal(r.intent, 'ADD_TO_CART');
    assert.equal(r.actions[0]?.product_id, 'hb-pollo');
    assert.equal(r.actions[0]?.quantity, 2);
  });

  it('elige hamburguesa italiana de pollo por categoria', () => {
    const r = interpretPosCartClient({
      userText: 'agrega hamburguesa italiana de pollo',
      stocks: burgerStocks,
      cart: [],
    });
    assert.equal(r.intent, 'ADD_TO_CART');
    assert.equal(r.actions[0]?.product_id, 'hb-pollo');
  });

  it('buscar no agrega al carrito y lista opciones', () => {
    const r = interpretPosCartClient({
      userText: 'buscar amburguesa',
      stocks: burgerStocks,
      cart: [],
    });
    assert.equal(r.intent, 'UNKNOWN');
    assert.equal(r.actions.length, 0);
    assert.ok((r.product_options?.length ?? 0) >= 2);
  });

  it('ayuda lista comandos con producto del tenant', () => {
    const r = interpretPosCartClient({
      userText: 'ayuda',
      stocks: burgerStocks,
      cart: [],
    });
    assert.match(r.response_message, /Comandos POS IA/i);
    assert.match(r.response_message, /Hamburguesa Italiana/i);
  });

  const pizzaStocks = [
    {
      id: 'pz-peq',
      nombre: 'Pizza Pepperonni',
      sku: 'PZ-P-S',
      precio: 3500,
      stock_actual: 20,
      categoria: 'Pizza Personal',
    },
    {
      id: 'pz-fam',
      nombre: 'Pizza Pepperonni',
      sku: 'PZ-P-F',
      precio: 7000,
      stock_actual: 20,
      categoria: 'Pizza Familiar',
    },
  ];

  it('agrega pizza pepperonni familiar por tamano', () => {
    const r = interpretPosCartClient({
      userText: 'agrega pizza pepperonni familiar',
      stocks: pizzaStocks,
      cart: [],
    });
    assert.equal(r.intent, 'ADD_TO_CART');
    assert.equal(r.actions[0]?.product_id, 'pz-fam');
  });

  it('agrega pizza pepperonni familiar aunque haya muchas pizzas en catalogo', () => {
    const manyPizzas = [
      { id: 'ch', nombre: 'Pizza Champiñón', sku: 'PZ-CH', precio: 8000, stock_actual: 10 },
      { id: 'es-p', nombre: 'Pizza Española', sku: 'PZ-ES-P', precio: 7000, stock_actual: 10 },
      { id: 'es-f', nombre: 'Pizza Española', sku: 'PZ-ES-F', precio: 13500, stock_actual: 10 },
      { id: 'it-p', nombre: 'Pizza Italiana', sku: 'PZ-IT-P', precio: 7500, stock_actual: 10 },
      { id: 'pe-p', nombre: 'Pizza Pepperonni', sku: 'PZ-PE-P', precio: 3500, stock_actual: 20 },
      { id: 'pe-f', nombre: 'Pizza Pepperonni', sku: 'PZ-PE-F', precio: 13500, stock_actual: 20 },
    ];
    const r = interpretPosCartClient({
      userText: 'pizza pepperonni familiar',
      stocks: manyPizzas,
      cart: [],
    });
    assert.equal(r.intent, 'ADD_TO_CART');
    assert.equal(r.actions[0]?.product_id, 'pe-f');
  });

  it('agrega pizza pepperonni familiar solo por precio si no hay categoria', () => {
    const stocks = [
      { id: 'a', nombre: 'Pizza Pepperonni', sku: 'A', precio: 3500, stock_actual: 20 },
      { id: 'b', nombre: 'Pizza Pepperonni', sku: 'B', precio: 7000, stock_actual: 20 },
    ];
    const r = interpretPosCartClient({
      userText: 'pizza pepperonni familiar',
      stocks,
      cart: [],
    });
    assert.equal(r.actions[0]?.product_id, 'b');
  });

  it('ignora sin tomate al buscar producto', () => {
    const r = interpretPosCartClient({
      userText: 'hamburguesa italiana de carne sin tomate',
      stocks: burgerStocks,
      cart: [],
    });
    assert.equal(r.intent, 'ADD_TO_CART');
    assert.equal(r.actions[0]?.product_id, 'hb-carne');
  });

});


