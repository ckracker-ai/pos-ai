import assert from 'node:assert/strict';
import test from 'node:test';
import { wantsVirtualMenuCommand } from '../src/agent/virtualMenuFlow.js';
import {
  wspVirtualMenuLink,
  wspVirtualMenuNotEnabled,
  wspVirtualMenuEmpty,
} from '../src/agent/wspMessages.js';

test('wantsVirtualMenuCommand reconoce variantes de carta web', () => {
  assert.equal(wantsVirtualMenuCommand('menu'), true);
  assert.equal(wantsVirtualMenuCommand('menu web'), true);
  assert.equal(wantsVirtualMenuCommand('ver menu'), true);
  assert.equal(wantsVirtualMenuCommand('carta digital'), true);
  assert.equal(wantsVirtualMenuCommand('ayuda'), false);
  assert.equal(wantsVirtualMenuCommand('menu categorias'), false);
});

test('wspVirtualMenuLink incluye URL sin markdown de enlace', () => {
  const msg = wspVirtualMenuLink({
    title: 'Menú Costa Azul',
    branchName: 'Central',
    url: 'https://example.com/menu/costa-azul',
  });
  assert.match(msg, /Menú Costa Azul/);
  assert.match(msg, /https:\/\/example\.com\/menu\/costa-azul/);
});

test('wspVirtualMenuNotEnabled no envía URL', () => {
  const msg = wspVirtualMenuNotEnabled('Maipú');
  assert.match(msg, /Maipú/);
  assert.doesNotMatch(msg, /https?:\/\//);
});

test('wspVirtualMenuEmpty incluye URL aunque esté vacío', () => {
  const msg = wspVirtualMenuEmpty({
    branchName: 'Central',
    url: 'https://example.com/menu/x',
  });
  assert.match(msg, /https:\/\/example\.com\/menu\/x/);
});
