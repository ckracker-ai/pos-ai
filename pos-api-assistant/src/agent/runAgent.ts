import config from '../config/index.js';

import { coreClient, type AssistantChannel, type AssistantContext } from '../core/coreClient.js';

import { parsePedidoLines } from './orderText.js';
import {
  branchSelectedSearchPrompt,
  canAppendToOpenCart,
  formatAddedLinesReply,
  searchResultsFooter,
  type CartLineSummary,
} from './cartFlow.js';
import {
  formatComunaSearchResults,
  formatTerritoryResolveReply,
  parseComunaQuery,
  type ComunaOption,
} from './territoryFlow.js';

import { SYSTEM_PROMPT, VOICE_SYSTEM_PROMPT } from './systemPrompt.js';
import { formatVoiceReply, isVoiceChannel } from './voiceFormat.js';
import { voiceHelp } from './voiceMessages.js';
import {
  wspHelp,
  wspNoPendingToConfirm,
  wspNoPendingOrder,
  wspNoPendingToCancel,
  wspPendingPaymentBlock,
  wspShowPendingHeader,
  wspShowPendingConfirmStep,
  wspShowPendingProofStep,
  wspOrderCancelled,
  wspTransferProfileIncomplete,
} from './wspMessages.js';



export type AgentReply = { text: string };



export type CatalogItem = {

  producto_id: string;

  nombre: string;

  precio: number;

  cantidad_en_sucursal: number | null;

  categoria?: string;

};



export type Session = {

  context: AssistantContext;

  branchId: string | null;

  /** Última búsqueda — el cliente pide por número (1, 2…) sin UUID. */

  lastSearch: CatalogItem[];

  /** Tras *sucursales*, el cliente responde con el número. */

  lastBranches: Array<{ id: string; name: string }>;

  /** Tras *comuna …*, el cliente elige comuna por número. */

  lastComunas: ComunaOption[];

  /** Árbol compacto de categorías (familias / subcategorías) para el prompt IA. */

  categoryCatalogResumen: string | null;

};



const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;



function formatPrice(n: number): string {

  return `$${Math.round(n).toLocaleString('es-CL')}`;

}



function normalizeProduct(raw: Record<string, unknown>): CatalogItem {

  return {

    producto_id: String(raw.producto_id ?? raw.id ?? ''),

    nombre: String(raw.nombre ?? raw.name ?? 'Producto'),

    precio: Number(raw.precio ?? raw.price ?? 0),

    cantidad_en_sucursal:

      raw.cantidad_en_sucursal != null ? Number(raw.cantidad_en_sucursal) : null,

    categoria: raw.categoria != null ? String(raw.categoria) : undefined,

  };

}



function formatCatalogList(items: CatalogItem[], hasOpenCart: boolean): string {
  const lines = items.map((p, i) => {
    const qty = p.cantidad_en_sucursal;
    const stock =
      qty === null ? 'consulta sucursal' : qty > 0 ? `${qty} u.` : 'sin stock';
    const cat = p.categoria ? ` (${p.categoria})` : '';
    return `*${i + 1}.* ${p.nombre}${cat} — ${formatPrice(p.precio)} — ${stock}`;
  });

  return `${lines.join('\n')}${searchResultsFooter(hasOpenCart)}`;
}

async function hasOpenCart(context: AssistantContext): Promise<boolean> {
  try {
    const pedido = await coreClient.findPendingOrder(context.empresaId, context.phone);
    return canAppendToOpenCart(pedido.awaiting_customer_confirm);
  } catch {
    return false;
  }
}



function parseOrderQuantity(raw: string | undefined, fallback = 1): number | null {

  const qty = Number(raw ?? fallback);

  if (!Number.isFinite(qty) || qty < 1 || qty > 999) return null;

  return Math.floor(qty);

}



function resolveFromCatalogIndex(session: Session, index1Based: number): CatalogItem | null {

  const idx = index1Based - 1;

  if (idx < 0 || idx >= session.lastSearch.length) return null;

  return session.lastSearch[idx] ?? null;

}



async function addCartLines(
  session: Session,
  branchId: string,
  lines: Array<{ product: CatalogItem; qty: number }>
): Promise<AgentReply> {
  const { context } = session;

  const locked = await pendingOrderBlock(context);
  if (locked) return locked;

  for (const { product, qty } of lines) {
    const stock = await coreClient.getStock(context.empresaId, branchId, product.producto_id);
    const available = Number(stock.cantidad ?? 0);
    if (available < qty) {
      const otros = await coreClient.stockOther(context.empresaId, product.producto_id, branchId);
      if (otros.length > 0 && lines.length === 1) {
        const alt = otros[0] as Record<string, unknown>;
        return {
          text:
            `Solo hay ${available} u. de *${product.nombre}* aquí. ` +
            `En *${String(alt.sucursal_nombre ?? 'otra sucursal')}* hay ${alt.cantidad}. ` +
            '¿Cambiamos sucursal o apartamos lo disponible?',
        };
      }
      return {
        text: `No hay stock suficiente de *${product.nombre}* (hay ${available} u., pediste ${qty}).`,
      };
    }
  }

  const payloadItems = lines.map((l) => ({
    productId: l.product.producto_id,
    quantity: l.qty,
  }));

  let appended = false;
  let pedidoId: string;
  let total: number;
  let added: CartLineSummary[];

  let openCart = false;
  try {
    const pending = await coreClient.findPendingOrder(context.empresaId, context.phone);
    openCart = canAppendToOpenCart(pending.awaiting_customer_confirm);
  } catch {
    openCart = false;
  }

  if (openCart) {
    const result = await coreClient.appendPendingOrderItems(context.empresaId, {
      sucursal_id: branchId,
      cliente_telefono: context.phone,
      items: payloadItems,
    });
    appended = true;
    pedidoId = result.pedido_id;
    total = result.total;
    added = result.added;
  } else {
    const order = await coreClient.createOrder(context.empresaId, {
      sucursal_id: branchId,
      cliente_telefono: context.phone,
      items: payloadItems,
      metodo_pago: context.features?.pagosOnline ? 'WEBPAY' : 'TRANSFERENCIA',
    });
    pedidoId = order.pedido_id;
    total = order.total;
    added = lines.map((l) => ({
      nombre: l.product.nombre,
      quantity: l.qty,
      subtotal: l.product.precio * l.qty,
    }));
  }

  if (context.features?.pagosOnline && !appended) {
    const pay = await coreClient.paymentMessage(context.empresaId, pedidoId, total);
    const detailLines = added.map(
      (l) => `• ${l.quantity} × ${l.nombre} — ${formatPrice(l.subtotal)}`
    );
    return {
      text: `${appended ? 'Agregado' : 'Pedido registrado'} ✅\n${detailLines.join('\n')}\n\n${pay.mensaje}`,
    };
  }

  return {
    text: formatAddedLinesReply({
      pedidoId,
      total,
      addedLines: added,
      appended,
      formatPrice,
    }),
  };
}

async function placeOrder(
  session: Session,
  branchId: string,
  product: CatalogItem,
  qty: number
): Promise<AgentReply> {
  return addCartLines(session, branchId, [{ product, qty }]);
}

async function placeMultiOrder(
  session: Session,
  branchId: string,
  lines: Array<{ product: CatalogItem; qty: number }>
): Promise<AgentReply> {
  return addCartLines(session, branchId, lines);
}

async function resolveProductByName(

  session: Session,

  branchId: string,

  nameQuery: string

): Promise<CatalogItem | null> {

  const q = nameQuery.trim();

  if (!q) return null;



  const fromList = session.lastSearch.find((p) => p.nombre.toLowerCase().includes(q.toLowerCase()));

  if (fromList) return fromList;



  const productos = await coreClient.searchProducts(session.context.empresaId, q, branchId);

  if (productos.length === 0) return null;

  const items = productos.map((p) => normalizeProduct(p));

  session.lastSearch = items.slice(0, 8);

  return items[0] ?? null;

}



async function handlePedidoCommand(

  session: Session,

  branchId: string,

  text: string

): Promise<AgentReply | null> {

  const body = text.replace(/^(pedido|agregar|quiero)\s+/i, '').trim();

  if (!body) {

    return {

      text:

        'Indica qué quieres pedir:\n' +

        '• *pedido 2x2* — ítem 2 del listado, cantidad 2\n' +

        '• *pedido 5x2, 2x1* — varios ítems (coma)\n' +

        '• *pedido empanada 2* — por nombre\n' +

        'Primero *buscar empanada* para ver el listado numerado.',

    };

  }

  const parsedLines = parsePedidoLines(body);
  if (parsedLines && session.lastSearch.length === 0) {
    return {
      text: 'Primero escribe *buscar …* para ver el listado numerado y luego *pedido 2x2*.',
    };
  }

  if (parsedLines) {
    const resolved: Array<{ product: CatalogItem; qty: number }> = [];
    for (const line of parsedLines) {
      const qty = parseOrderQuantity(String(line.qty), 1);
      if (qty == null) {
        return { text: `Cantidad inválida en ítem ${line.index}. Ejemplo: *pedido 2x2*` };
      }
      const product = resolveFromCatalogIndex(session, line.index);
      if (!product) {
        return {
          text: `No hay ítem *${line.index}* en tu última búsqueda. Escribe *buscar …* de nuevo.`,
        };
      }
      resolved.push({ product, qty });
    }
    return placeMultiOrder(session, branchId, resolved);
  }

  const parts = body.split(/\s+/);



  if (parts.length >= 1 && /^\d+$/.test(parts[0]!) && session.lastSearch.length > 0) {

    const idx = Number(parts[0]);

    const qty = parseOrderQuantity(parts[1], 1);

    if (qty == null) return { text: 'Cantidad inválida. Ejemplo: *pedido 1 2*' };

    const product = resolveFromCatalogIndex(session, idx);

    if (!product) {

      return {

        text: `No hay ítem *${idx}* en tu última búsqueda. Escribe *buscar …* de nuevo.`,

      };

    }

    return placeOrder(session, branchId, product, qty);

  }



  if (parts.length === 1 && UUID_RE.test(parts[0]!)) {

    const qty = 1;

    const productos = await coreClient.searchProducts(session.context.empresaId, '', branchId);

    const product = productos

      .map((p) => normalizeProduct(p))

      .find((p) => p.producto_id === parts[0]);

    if (!product) return { text: 'Producto no encontrado.' };

    return placeOrder(session, branchId, product, qty);

  }



  let qty = 1;

  let nameParts = [...parts];

  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1]!)) {

    qty = parseOrderQuantity(parts[parts.length - 1], 1) ?? 1;

    nameParts = parts.slice(0, -1);

  }

  const nameQuery = nameParts.join(' ');

  const product = await resolveProductByName(session, branchId, nameQuery);

  if (!product) {

    return { text: `No encontré "${nameQuery}". Prueba *buscar ${nameQuery.split(' ')[0] ?? 'producto'}*.` };

  }

  return placeOrder(session, branchId, product, qty);

}



async function confirmMyPendingOrder(context: AssistantContext): Promise<AgentReply> {
  try {
    const pedido = await coreClient.confirmPendingOrder(context.empresaId, context.phone);
    return {
      text: `Pedido confirmado ✅\n\n${pedido.mensaje}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('TRANSFER_PROFILE_INCOMPLETE')) {
      return { text: wspTransferProfileIncomplete() };
    }
    return { text: wspNoPendingToConfirm() };
  }
}

async function showMyPendingOrder(context: AssistantContext): Promise<AgentReply> {
  try {
    const pedido = await coreClient.findPendingOrderDetails(context.empresaId, context.phone);
    const lines = pedido.items.map(
      (it) => `• ${it.quantity} × ${it.nombre} — ${formatPrice(it.subtotal)}`
    );
    const nextStep = pedido.awaiting_customer_confirm
      ? wspShowPendingConfirmStep()
      : wspShowPendingProofStep();
    return {
      text:
        wspShowPendingHeader(
          pedido.pedido_id.slice(0, 8),
          pedido.branch_name,
          formatPrice(pedido.total)
        ) +
        `\n${lines.join('\n')}\n\n` +
        nextStep,
    };
  } catch {
    return { text: wspNoPendingOrder() };
  }
}

async function cancelMyPendingOrder(context: AssistantContext): Promise<AgentReply> {
  try {
    const pedido = await coreClient.cancelPendingOrder(context.empresaId, context.phone);
    return {
      text: wspOrderCancelled(pedido.pedido_id.slice(0, 8), formatPrice(pedido.total)),
    };
  } catch {
    return { text: wspNoPendingToCancel() };
  }
}

async function pendingOrderBlock(context: AssistantContext): Promise<AgentReply | null> {
  try {
    const pedido = await coreClient.findPendingOrder(context.empresaId, context.phone);
    if (pedido.awaiting_customer_confirm) {
      return null;
    }
    return {
      text: wspPendingPaymentBlock(pedido.pedido_id.slice(0, 8), formatPrice(pedido.total)),
    };
  } catch {
    return null;
  }
}

async function ensureCategoryCatalog(session: Session): Promise<void> {
  if (session.categoryCatalogResumen) return;
  try {
    const data = await coreClient.getCategoryCatalogSummary(session.context.empresaId);
    session.categoryCatalogResumen = data.resumen?.trim() || null;
  } catch {
    session.categoryCatalogResumen = null;
  }
}

function helpForChannel(session: Session): string {
  return isVoiceChannel(session.context.channel)
    ? voiceHelp(session.context.empresaNombre)
    : wspHelp(session.context.empresaNombre);
}

function finalizeReply(session: Session, reply: AgentReply): AgentReply {
  if (!isVoiceChannel(session.context.channel)) return reply;
  return { text: formatVoiceReply(reply.text) };
}

/** Motor híbrido: reglas locales + OpenAI opcional. */

async function runAgentCore(session: Session, userText: string): Promise<AgentReply> {

  const text = userText.trim();

  const lower = text.toLowerCase();

  const { context } = session;

  let branchId = session.branchId ?? context.sessionBranchId ?? context.defaultBranchId;



  try {

    if (lower === 'ayuda' || lower === 'help' || lower === 'menu') {

      return { text: helpForChannel(session) };

    }



    if (/^(mi pedido|pedido actual|ver pedido)$/.test(lower)) {

      return showMyPendingOrder(context);

    }

    if (/^(confirmar|confirmar pedido|confirmo)$/.test(lower)) {

      return confirmMyPendingOrder(context);

    }

    if (/^(cancelar pedido|anular pedido|cancelar)$/.test(lower)) {

      return cancelMyPendingOrder(context);

    }



    if (lower === 'sucursales' || lower.includes('sucursal')) {

      const list = await coreClient.listBranches(context.empresaId);

      session.lastBranches = list.map((b) => ({ id: b.id, name: b.name }));

      session.lastSearch = [];

      if (lower === 'sucursales' || lower.startsWith('lista')) {

        const lines = list.map((b, i) => `${i + 1}. ${b.name}`);

        return {

          text: `Sucursales de ${context.empresaNombre}:\n\n${lines.join('\n')}\n\nResponde con el *número* (ej. *1*).`,

        };

      }

    }



    const comunaQuery = parseComunaQuery(text);
    if (comunaQuery) {
      const found = await coreClient.searchTerritoryComunas(context.empresaId, comunaQuery);
      session.lastComunas = found.map((c) => ({
        codigoCut: c.codigoCut,
        nombre: c.nombre,
        regionNombre: c.regionNombre ?? null,
      }));
      session.lastBranches = [];
      session.lastSearch = [];
      return { text: formatComunaSearchResults(session.lastComunas) };
    }

    const branchByNumber = text.match(/^(\d+)$/);

    if (branchByNumber && session.lastSearch.length === 0 && session.lastComunas.length > 0) {
      const idx = Number(branchByNumber[1]) - 1;
      const pickedComuna = session.lastComunas[idx];
      if (pickedComuna) {
        const resolved = await coreClient.resolveTerritory(context.empresaId, {
          comunaId: pickedComuna.codigoCut,
        });
        session.lastComunas = [];
        if (resolved.branches.length === 1) {
          const b = resolved.branches[0]!;
          branchId = b.id;
          await coreClient.setSessionBranch(context.bindingId, branchId);
          session.branchId = branchId;
          session.lastBranches = [{ id: b.id, name: b.name }];
          return {
            text: formatTerritoryResolveReply({
              comunaNombre: pickedComuna.nombre,
              branches: [{ name: b.name, address: b.address }],
              empresaNombre: context.empresaNombre,
            }),
          };
        }
        session.lastBranches = resolved.branches.map((b) => ({ id: b.id, name: b.name }));
        return {
          text: formatTerritoryResolveReply({
            comunaNombre: pickedComuna.nombre,
            branches: resolved.branches.map((b) => ({ name: b.name, address: b.address })),
            empresaNombre: context.empresaNombre,
          }),
        };
      }
    }

    if (branchByNumber && session.lastSearch.length === 0 && session.lastBranches.length > 0) {
      const idx = Number(branchByNumber[1]) - 1;
      const picked = session.lastBranches[idx];
      if (picked) {
        branchId = picked.id;
        await coreClient.setSessionBranch(context.bindingId, branchId);
        session.branchId = branchId;
        session.lastBranches = [];
        session.lastComunas = [];
        return { text: branchSelectedSearchPrompt(picked.name) };
      }
    }



    const branchMatch =

      text.match(/sucursal\s*(\d+)/i) ||

      (!branchId && text.match(/^(\d+)$/));

    if (branchMatch) {

      const list = await coreClient.listBranches(context.empresaId);

      const idx = Number(branchMatch[1]) - 1;

      if (list[idx]) {

        branchId = list[idx].id;

        await coreClient.setSessionBranch(context.bindingId, branchId);

        session.branchId = branchId;

        session.lastSearch = [];

        session.lastBranches = [];

        return { text: branchSelectedSearchPrompt(list[idx].name) };

      }

    }



    if (!branchId) {

      return {

        text: '¿En qué sucursal compras? Escribe *sucursales* y responde con el número.',

      };

    }



    if (lower === 'categorias' || lower === 'categorías' || lower === 'menu categorias') {
      await ensureCategoryCatalog(session);
      if (!session.categoryCatalogResumen) {
        return { text: 'Aún no hay categorías configuradas en el catálogo.' };
      }
      return {
        text:
          `*Familias del menú:*\n\n${session.categoryCatalogResumen}\n\n` +
          'Busca con *buscar …* (ej. *buscar empanada* o el nombre de una familia).',
      };
    }

    if (lower.startsWith('buscar ') || lower.startsWith('stock ')) {
      const q = text.replace(/^buscar\s+|^stock\s+/i, '').trim();
      await ensureCategoryCatalog(session);
      const productos = await coreClient.searchProducts(context.empresaId, q, branchId);

      if (productos.length === 0) {

        return { text: `No encontré "${q}". Prueba otro nombre.` };

      }

      session.lastSearch = productos.slice(0, 8).map((p) => normalizeProduct(p));
      const openCart = await hasOpenCart(context);

      return { text: `En tu sucursal:\n\n${formatCatalogList(session.lastSearch, openCart)}` };

    }



    const quickOrder = branchId && session.lastSearch.length > 0 ? text.match(/^(\d+)\s*(?:[x×]\s*(\d+))?$/i) : null;

    if (quickOrder) {

      const idx = Number(quickOrder[1]);

      const qty = parseOrderQuantity(quickOrder[2], 1);

      if (qty == null) return { text: 'Cantidad inválida. Ejemplo: *2 x 3*' };

      const product = resolveFromCatalogIndex(session, idx);

      if (!product) {

        return { text: `Ítem *${idx}* no válido. Busca de nuevo con *buscar …*` };

      }

      return placeOrder(session, branchId, product, qty);

    }



    if (

      lower.startsWith('pedido ') ||

      lower.startsWith('agregar ') ||

      lower.startsWith('quiero ')

    ) {

      const reply = await handlePedidoCommand(session, branchId, text);

      if (reply) return reply;

    }



    if (config.openAiApiKey) {

      return runOpenAi(session, text);

    }



    return { text: helpForChannel(session) };

  } catch (e) {

    return { text: `Disculpa, hubo un error: ${e instanceof Error ? e.message : 'desconocido'}` };

  }

}

export async function runAgent(session: Session, userText: string): Promise<AgentReply> {
  const reply = await runAgentCore(session, userText);
  return finalizeReply(session, reply);
}



async function runOpenAi(session: Session, userText: string): Promise<AgentReply> {

  const catalogHint =
    (session.categoryCatalogResumen
      ? `\nCategorías del menú:\n${session.categoryCatalogResumen}`
      : '') +
    (session.lastSearch.length > 0
      ? `\nÚltimo listado numerado:\n${session.lastSearch.map((p, i) => `${i + 1}. ${p.nombre}`).join('\n')}`
      : '');



  const res = await fetch('https://api.openai.com/v1/chat/completions', {

    method: 'POST',

    headers: {

      Authorization: `Bearer ${config.openAiApiKey}`,

      'Content-Type': 'application/json',

    },

    body: JSON.stringify({

      model: config.openAiModel,

      messages: [

        {
          role: 'system',
          content: isVoiceChannel(session.context.channel) ? VOICE_SYSTEM_PROMPT : SYSTEM_PROMPT,
        },

        {

          role: 'user',

          content:

            `Empresa: ${session.context.empresaNombre}. Sucursal sesión: ${session.branchId ?? 'ninguna'}.` +

            `${catalogHint}\n\nCliente dice: ${userText}\n\n` +

            'Si quiere pedir, indícale usar pedido N CANT o el número del listado. No pidas UUID.',

        },

      ],

      max_tokens: 300,

    }),

  });

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };

  const content = json.choices?.[0]?.message?.content?.trim();

  return { text: content || 'No pude procesar tu mensaje. Escribe *ayuda*.' };

}



export async function buildSession(phone: string, channel: AssistantChannel = 'WHATSAPP'): Promise<Session> {

  const context = await coreClient.resolvePhone(phone, channel);

  return {

    context,

    branchId: context.sessionBranchId ?? context.defaultBranchId,

    lastSearch: [],

    lastBranches: [],

    lastComunas: [],

    categoryCatalogResumen: null,

  };

}


