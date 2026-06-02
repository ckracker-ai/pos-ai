'use client';



import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { platformFetch, usePlatformAuthStore } from '@/core/context/platform-auth';

import { PlatformPageHeader } from '@/components/molecules/PlatformPageHeader';

import { unwrapApiEnvelope } from '@/core/api/normalizers';



type ChatMessage = {

  id: string;

  role: 'user' | 'assistant';

  text: string;

};



type ApiEnvelope<T> = { success: boolean; data: T; error: string | null };



type AssistantBindingRow = {

  id: string;

  empresaId: string;

  channel: string;

  externalId: string;

  defaultBranchId: string | null;

  sessionBranchId: string | null;

};



type BranchRow = { id: string; name: string };



const QUICK_COMMANDS = [
  'sucursales',
  '1',
  'buscar empanada',
  'pedido 1 2',
  'confirmar',
  'mi pedido',
  'cancelar pedido',
  'ayuda',
] as const;



const CUSTOM_PHONE = '__custom__';



function normalizePhoneDigits(value: string): string {

  return value.replace(/\D/g, '');

}



export default function PlatformWhatsappSimPage() {

  const router = useRouter();

  const isAuthenticated = usePlatformAuthStore((s) => s.isAuthenticated);



  const [phone, setPhone] = useState('56900000001');

  const [phonePick, setPhonePick] = useState<string>(CUSTOM_PHONE);

  const [input, setInput] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [imageCaption, setImageCaption] = useState('');

  const [bindings, setBindings] = useState<AssistantBindingRow[]>([]);

  const [branches, setBranches] = useState<BranchRow[]>([]);

  const [sessionBranchId, setSessionBranchId] = useState<string>('');

  const [bindingId, setBindingId] = useState<string | null>(null);

  const [branchSaving, setBranchSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);



  const wspBindings = bindings.filter((b) => b.channel === 'WHATSAPP');



  useEffect(() => {

    if (!isAuthenticated) router.replace('/platform/login');

  }, [isAuthenticated, router]);



  useEffect(() => {

    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

  }, [messages]);



  useEffect(() => {

    if (!isAuthenticated) return;

    void (async () => {

      try {

        const res = await platformFetch<ApiEnvelope<{ bindings: AssistantBindingRow[] }>>(

          'platform/empresas/assistant-bindings'

        );

        const data = unwrapApiEnvelope(res) as { bindings?: AssistantBindingRow[] };

        const rows = Array.isArray(data.bindings) ? data.bindings : [];

        setBindings(rows);

        setError(null);

      } catch (e) {

        setBindings([]);

        const msg = e instanceof Error ? e.message : 'Error al cargar bindings';

        setError(msg);

      }

    })();

  }, [isAuthenticated]);



  useEffect(() => {

    const digits = normalizePhoneDigits(phone);

    const match = wspBindings.find((b) => normalizePhoneDigits(b.externalId) === digits);

    if (!match) {

      setBindingId(null);

      setBranches([]);

      setSessionBranchId('');

      return;

    }

    setBindingId(match.id);

    setSessionBranchId(match.sessionBranchId ?? match.defaultBranchId ?? '');

    void (async () => {

      try {

        const res = await platformFetch<ApiEnvelope<{ sucursales: BranchRow[] }>>(

          `platform/empresas/${match.empresaId}/branches`

        );

        const data = unwrapApiEnvelope(res) as { sucursales?: BranchRow[] };

        setBranches(Array.isArray(data.sucursales) ? data.sucursales : []);

      } catch {

        setBranches([]);

      }

    })();

  }, [phone, wspBindings]);



  const handlePhonePickChange = (value: string) => {

    setPhonePick(value);

    setError(null);

    if (value === CUSTOM_PHONE) {

      setTimeout(() => phoneInputRef.current?.focus(), 0);

      return;

    }

    const row = wspBindings.find((b) => b.id === value);

    if (row) setPhone(row.externalId);

  };



  const handleSessionBranchChange = async (branchId: string) => {

    if (!bindingId) return;

    setBranchSaving(true);

    setError(null);

    try {

      await platformFetch(

        `platform/empresas/assistant-bindings/${bindingId}/session-branch`,

        {

          method: 'PATCH',

          body: JSON.stringify({ branchId: branchId || null }),

        }

      );

      setSessionBranchId(branchId);

    } catch (e) {

      const msg = e instanceof Error ? e.message : 'No se pudo actualizar la sucursal';

      setError(msg);

    } finally {

      setBranchSaving(false);

    }

  };



  const sendPayload = useCallback(

    async (payload: {

      displayText: string;

      text?: string;

      imageBase64?: string;

      mimeType?: string;

      caption?: string;

    }) => {

      if (sending) return;



      const from = phone.replace(/\D/g, '');

      if (from.length < 8) {

        setError('Ingresa un teléfono válido (E.164 sin +, ej. 56900000001)');

        return;

      }



      setError(null);

      setSending(true);

      const userMsg: ChatMessage = {

        id: `u-${Date.now()}`,

        role: 'user',

        text: payload.displayText,

      };

      setMessages((prev) => [...prev, userMsg]);



      try {

        const res = await platformFetch<ApiEnvelope<{ reply: string; success: boolean }>>(

          'platform/empresas/assistant/simulate',

          {

            method: 'POST',

            body: JSON.stringify({

              from,

              text: payload.text,

              imageBase64: payload.imageBase64,

              mimeType: payload.mimeType,

              caption: payload.caption,

            }),

          }

        );

        const data = unwrapApiEnvelope(res) as { reply?: string };

        const reply = String(data.reply ?? '').trim() || '(sin respuesta)';

        setMessages((prev) => [

          ...prev,

          { id: `a-${Date.now()}`, role: 'assistant', text: reply },

        ]);

      } catch (e) {

        const msg = e instanceof Error ? e.message : 'Error al enviar';

        setError(msg);

        setMessages((prev) => [

          ...prev,

          { id: `e-${Date.now()}`, role: 'assistant', text: `Error: ${msg}` },

        ]);

      } finally {

        setSending(false);

      }

    },

    [phone, sending]

  );



  const sendText = useCallback(

    (text: string) => {

      const trimmed = text.trim();

      if (!trimmed) return;

      void sendPayload({ displayText: trimmed, text: trimmed });

    },

    [sendPayload]

  );



  const sendImageFile = useCallback(

    (file: File) => {

      if (!file.type.startsWith('image/')) {

        setError('Solo imágenes (JPEG/PNG/WebP)');

        return;

      }

      if (file.size > 4 * 1024 * 1024) {

        setError('Imagen máximo 4 MB');

        return;

      }

      const reader = new FileReader();

      reader.onload = () => {

        const dataUrl = String(reader.result ?? '');

        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

        if (!base64) {

          setError('No se pudo leer la imagen');

          return;

        }

        const caption = imageCaption.trim();

        void sendPayload({

          displayText: caption ? `📷 ${caption}` : '📷 Comprobante (imagen)',

          imageBase64: base64,

          mimeType: file.type,

          caption: caption || undefined,

        });

        setImageCaption('');

      };

      reader.onerror = () => setError('Error al leer el archivo');

      reader.readAsDataURL(file);

    },

    [imageCaption, sendPayload]

  );



  const handleSubmit = (e: FormEvent) => {

    e.preventDefault();

    const text = input;

    setInput('');

    sendText(text);

  };



  if (!isAuthenticated) return null;



  return (

    <>
      <PlatformPageHeader
        title="Simulador WhatsApp"
        description="Plan Estándar · desarrollo sin Meta Graph API. Prueba el flujo del asistente con bindings registrados en Empresas."
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col">

        <div className="app-card relative z-10 mb-3 space-y-3 rounded-xl px-3 py-3">

          <div>

            <label htmlFor="wsp-phone-manual" className="text-xs font-medium text-brand-ink-muted">

              Teléfono del cliente (registrado en Empresas → canal WSP)

            </label>

            <input

              id="wsp-phone-manual"

              ref={phoneInputRef}

              type="text"

              inputMode="numeric"

              autoComplete="off"

              spellCheck={false}

              value={phone}

              onChange={(e) => {

                setPhonePick(CUSTOM_PHONE);

                setPhone(e.target.value.replace(/[^\d]/g, ''));

                setError(null);

              }}

              className="app-input app-input-mono mt-1 text-base"

              placeholder="56900000001"

            />

            <p className="mt-1 text-[11px] text-brand-ink-muted">

              E.164 sin +. Debe coincidir con el binding guardado en Empresas.

            </p>

          </div>

          {wspBindings.length > 0 && (

            <div>

              <label htmlFor="wsp-phone-pick" className="text-xs font-medium text-brand-ink-muted">

                Cargar teléfono registrado

              </label>

              <select

                id="wsp-phone-pick"

                value={phonePick === CUSTOM_PHONE ? '' : phonePick}

                onChange={(e) => {

                  const v = e.target.value;

                  if (!v) return;

                  handlePhonePickChange(v);

                }}

                className="app-select mt-1"

              >

                <option value="">— Elegir binding —</option>

                {wspBindings.map((b) => (

                  <option key={b.id} value={b.id}>

                    {b.externalId} (empresa {b.empresaId.slice(0, 8)}…)

                  </option>

                ))}

              </select>

            </div>

          )}

          {bindingId && branches.length > 0 && (

            <div>

              <label className="text-xs font-medium text-brand-ink-muted">

                Sucursal de sesión (pedidos y stock del simulador)

              </label>

              <select

                value={sessionBranchId}

                disabled={branchSaving}

                onChange={(e) => void handleSessionBranchChange(e.target.value)}

                className="app-select mt-1 disabled:opacity-50"

              >

                <option value="">Por defecto del binding</option>

                {branches.map((b) => (

                  <option key={b.id} value={b.id}>

                    {b.name}

                  </option>

                ))}

              </select>

            </div>

          )}

          {phone.length >= 8 && !bindingId && (

            <p className="text-xs text-amber-900">

              Este teléfono no tiene binding. Regístralo en Plataforma → Empresas → Canal WhatsApp.

            </p>

          )}

        </div>



        {error && (

          <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">

            {error}

          </p>

        )}



        <div

          ref={scrollRef}

          className="mb-3 flex-1 space-y-3 overflow-y-auto rounded-xl border border-brand-linen bg-[#e5e0d8] p-4 min-h-[320px] max-h-[55vh]"

        >

          {messages.length === 0 && (

            <p className="text-center text-sm text-slate-600">

              Escribe un mensaje o usa un atajo. Prueba: <strong>sucursales</strong>

            </p>

          )}

          {messages.map((m) => (

            <div

              key={m.id}

              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}

            >

              <div

                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${

                  m.role === 'user'

                    ? 'bg-[#4A533C] text-white rounded-br-md'

                    : 'bg-white text-slate-800 rounded-bl-md border border-[#D1C7BD]'

                }`}

              >

                {m.text}

              </div>

            </div>

          ))}

          {sending && (

            <p className="text-center text-xs text-slate-500">El asistente escribe…</p>

          )}

        </div>



        <div className="mb-2 flex flex-wrap gap-2">

          {QUICK_COMMANDS.map((cmd) => (

            <button

              key={cmd}

              type="button"

              disabled={sending}

              onClick={() => void sendText(cmd)}

              className="rounded-full border border-brand-linen bg-white px-3 py-1 text-xs text-brand-ink hover:border-brand-olive disabled:opacity-50"

            >

              {cmd}

            </button>

          ))}

        </div>



        <div className="mb-2 flex gap-2">

          <input

            type="text"

            value={imageCaption}

            onChange={(e) => setImageCaption(e.target.value)}

            placeholder="Monto antes de la foto (ej. vale 5000) — se usa al subir 📷"

            disabled={sending}

            className="flex-1 rounded-lg border border-brand-linen bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-olive"

          />

          <input

            ref={fileInputRef}

            type="file"

            accept="image/*"

            className="hidden"

            disabled={sending}

            onChange={(e) => {

              const file = e.target.files?.[0];

              if (file) sendImageFile(file);

              e.target.value = '';

            }}

          />

          <button

            type="button"

            disabled={sending}

            onClick={() => fileInputRef.current?.click()}

            className="shrink-0 rounded-lg border border-brand-linen bg-white px-3 py-2 text-xs hover:border-brand-olive disabled:opacity-50"

            title="Simular comprobante transferencia"

          >

            📷 Imagen

          </button>

        </div>



        <form onSubmit={handleSubmit} className="flex gap-2">

          <input

            type="text"

            value={input}

            onChange={(e) => setInput(e.target.value)}

            placeholder="Mensaje…"

            disabled={sending}

            className="flex-1 rounded-full border border-brand-linen bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-olive"

          />

          <button

            type="submit"

            disabled={sending || !input.trim()}

            className="rounded-full bg-brand-olive px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3d4532] disabled:opacity-50"

          >

            Enviar

          </button>

        </form>



        <p className="mt-3 text-center text-[11px] text-brand-ink-muted">

          Producción: webhook Meta → <code>/webhooks/whatsapp</code> en pos-api-assistant

        </p>

      </div>

    </>

  );

}

