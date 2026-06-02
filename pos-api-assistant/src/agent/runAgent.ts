import config from '../config/index.js';

import { coreClient, type AssistantContext } from '../core/coreClient.js';

import { SYSTEM_PROMPT } from './systemPrompt.js';



export type AgentReply = { text: string };



export type CatalogItem = {

  producto_id: string;

  nombre: string;

  precio: number;

  cantidad_en_sucursal: number | null;

};



export type Session = {

  context: AssistantContext;

  branchId: string | null;

  /** Última búsqueda — el cliente pide por número (1, 2…) sin UUID. */

  lastSearch: CatalogItem[];

  /** Tras *sucursales*, el cliente responde con el número. */

  lastBranches: Array<{ id: string; name: string }>;

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

  };

}



function formatCatalogList(items: CatalogItem[]): string {

  const lines = items.map((p, i) => {

    const qty = p.cantidad_en_sucursal;

    const stock =

      qty === null ? 'consulta sucursal' : qty > 0 ? `${qty} u.` : 'sin stock';

    return `*${i + 1}.* ${p.nombre} — ${formatPrice(p.precio)} — ${stock}`;

  });

  return `${lines.join('\n')}\n\nPara pedir: *pedido 1 2* (nº del listado × cantidad) o solo *2 x 3*`;

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



async function placeOrder(

  session: Session,

  branchId: string,

  product: CatalogItem,

  qty: number

): Promise<AgentReply> {

  const { context } = session;

  const blocked = await pendingOrderBlock(context);

  if (blocked) return blocked;

  const stock = await coreClient.getStock(context.empresaId, branchId, product.producto_id);

  const available = Number(stock.cantidad ?? 0);

  if (available < qty) {

    const otros = await coreClient.stockOther(context.empresaId, product.producto_id, branchId);

    if (otros.length > 0) {

      const alt = otros[0] as Record<string, unknown>;

      return {

        text:

          `Solo hay ${available} u. de *${product.nombre}* aquí. ` +

          `En *${String(alt.sucursal_nombre ?? 'otra sucursal')}* hay ${alt.cantidad}. ` +

          '¿Cambiamos sucursal o apartamos lo disponible?',

      };

    }

    return { text: `No hay stock suficiente de *${product.nombre}* (${available} u.).` };

  }



  const order = await coreClient.createOrder(context.empresaId, {

    sucursal_id: branchId,

    cliente_telefono: context.phone,

    items: [{ productId: product.producto_id, quantity: qty }],

    metodo_pago: context.features?.pagosOnline ? 'WEBPAY' : 'TRANSFERENCIA',

  });

  session.lastSearch = [];

  if (context.features?.pagosOnline) {

    const pay = await coreClient.paymentMessage(context.empresaId, order.pedido_id, order.total);

    return {

      text:

        `Pedido registrado ✅\n` +

        `• ${qty} × ${product.nombre} — ${formatPrice(product.precio * qty)}\n\n` +

        pay.mensaje,

    };

  }

  return {

    text:

      `Pedido registrado ✅\n` +

      `• ${qty} × ${product.nombre} — ${formatPrice(product.precio * qty)}\n` +

      `Total: ${formatPrice(order.total)}\n` +

      `Ref. #${order.pedido_id.slice(0, 8)}\n\n` +

      'Revisa el detalle con *mi pedido*.\n' +

      'Si está bien, escribe *confirmar* para recibir datos de transferencia y enviar el comprobante.\n' +

      '¿Te equivocaste? *cancelar pedido*',

  };

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

        '• *pedido 1 2* — ítem 1 del listado, cantidad 2\n' +

        '• *pedido empanada 2* — por nombre\n' +

        'Primero *buscar empanada* para ver el listado numerado.',

    };

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
  } catch {
    return { text: 'No hay pedido pendiente para confirmar. Usa *buscar …* y *pedido 1 2*.' };
  }
}

async function showMyPendingOrder(context: AssistantContext): Promise<AgentReply> {
  try {
    const pedido = await coreClient.findPendingOrderDetails(context.empresaId, context.phone);
    const lines = pedido.items.map(
      (it) => `• ${it.quantity} × ${it.nombre} — ${formatPrice(it.subtotal)}`
    );
    const nextStep = pedido.awaiting_customer_confirm
      ? 'Si está bien, escribe *confirmar* para recibir datos de pago.\n' +
        '¿Cantidad incorrecta? *cancelar pedido* y vuelve a pedir.'
      : 'Ya confirmaste: envía el comprobante (foto) o escribe el monto antes de la foto (*vale 5000*).';
    return {
      text:
        `Pedido pendiente #${pedido.pedido_id.slice(0, 8)}\n` +
        `Sucursal: ${pedido.branch_name}\n` +
        `Total: ${formatPrice(pedido.total)}\n\n` +
        `${lines.join('\n')}\n\n` +
        nextStep,
    };
  } catch {
    return { text: 'No tienes pedidos pendientes. Busca productos con *buscar …* y luego *pedido 1 2*.' };
  }
}

async function cancelMyPendingOrder(context: AssistantContext): Promise<AgentReply> {
  try {
    const pedido = await coreClient.cancelPendingOrder(context.empresaId, context.phone);
    return {
      text:
        `Pedido #${pedido.pedido_id.slice(0, 8)} cancelado ✅\n` +
        `(Total era ${formatPrice(pedido.total)})\n\n` +
        'Stock liberado. Puedes pedir de nuevo:\n' +
        '*buscar empanada* → *pedido 1 2*',
    };
  } catch {
    return { text: 'No hay pedido pendiente para cancelar.' };
  }
}

async function pendingOrderBlock(context: AssistantContext): Promise<AgentReply | null> {
  try {
    const pedido = await coreClient.findPendingOrderDetails(context.empresaId, context.phone);
    const itemLine = pedido.items[0]
      ? `${pedido.items[0].quantity} × ${pedido.items[0].nombre}`
      : 'ver detalle';
    return {
      text:
        `Ya tienes un pedido pendiente #${pedido.pedido_id.slice(0, 8)} (${formatPrice(pedido.total)}).\n` +
        `Contenido: ${itemLine}\n\n` +
        'Para corregir: *cancelar pedido* y pedir de nuevo.\n' +
        (pedido.awaiting_customer_confirm
          ? 'Si el pedido está bien: *confirmar*\n'
          : 'Envía comprobante o *vale [monto]* antes de la foto.\n') +
        'Detalle: *mi pedido*',
    };
  } catch {
    return null;
  }
}

function helpText(empresaNombre: string): string {

  return (

    `Hola, soy el asistente de *${empresaNombre}*.\n\n` +

    '1️⃣ *sucursales* → elige con el número (ej. *1*)\n' +

    '2️⃣ *buscar empanada* → listado numerado\n' +

    '3️⃣ *pedido 1 2* o *2 x 3* → cantidad del ítem\n' +

    'También: *pedido empanada pino 2* (nombre + cantidad)\n\n' +

    '*mi pedido* · ver pendiente\n' +

    '4️⃣ *confirmar* → datos de transferencia y comprobante\n' +

    '*cancelar pedido* si te equivocaste'

  );

}



/** Motor híbrido: reglas locales + OpenAI opcional. */

export async function runAgent(session: Session, userText: string): Promise<AgentReply> {

  const text = userText.trim();

  const lower = text.toLowerCase();

  const { context } = session;

  let branchId = session.branchId ?? context.sessionBranchId ?? context.defaultBranchId;



  try {

    if (lower === 'ayuda' || lower === 'help' || lower === 'menu') {

      return { text: helpText(context.empresaNombre) };

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



    const branchByNumber = text.match(/^(\d+)$/);

    if (branchByNumber && session.lastSearch.length === 0 && session.lastBranches.length > 0) {

      const idx = Number(branchByNumber[1]) - 1;

      const picked = session.lastBranches[idx];

      if (picked) {

        branchId = picked.id;

        await coreClient.setSessionBranch(context.bindingId, branchId);

        session.branchId = branchId;

        session.lastBranches = [];

        return {

          text: `Perfecto, atiendo pedidos en *${picked.name}*.\n\n¿Qué buscas? Ej: *buscar empanada*`,

        };

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

        return { text: `Perfecto, atiendo pedidos en *${list[idx].name}*.\n\n¿Qué buscas? Ej: *buscar empanada*` };

      }

    }



    if (!branchId) {

      return {

        text: '¿En qué sucursal compras? Escribe *sucursales* y responde con el número.',

      };

    }



    if (lower.startsWith('buscar ') || lower.startsWith('stock ')) {

      const q = text.replace(/^buscar\s+|^stock\s+/i, '').trim();

      const productos = await coreClient.searchProducts(context.empresaId, q, branchId);

      if (productos.length === 0) {

        return { text: `No encontré "${q}". Prueba otro nombre.` };

      }

      session.lastSearch = productos.slice(0, 8).map((p) => normalizeProduct(p));

      return { text: `En tu sucursal:\n\n${formatCatalogList(session.lastSearch)}` };

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



    return { text: helpText(context.empresaNombre) };

  } catch (e) {

    return { text: `Disculpa, hubo un error: ${e instanceof Error ? e.message : 'desconocido'}` };

  }

}



async function runOpenAi(session: Session, userText: string): Promise<AgentReply> {

  const catalogHint =

    session.lastSearch.length > 0

      ? `\nÚltimo listado numerado:\n${session.lastSearch.map((p, i) => `${i + 1}. ${p.nombre}`).join('\n')}`

      : '';



  const res = await fetch('https://api.openai.com/v1/chat/completions', {

    method: 'POST',

    headers: {

      Authorization: `Bearer ${config.openAiApiKey}`,

      'Content-Type': 'application/json',

    },

    body: JSON.stringify({

      model: config.openAiModel,

      messages: [

        { role: 'system', content: SYSTEM_PROMPT },

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



export async function buildSession(phone: string): Promise<Session> {

  const context = await coreClient.resolvePhone(phone);

  return {

    context,

    branchId: context.sessionBranchId ?? context.defaultBranchId,

    lastSearch: [],

    lastBranches: [],

  };

}


