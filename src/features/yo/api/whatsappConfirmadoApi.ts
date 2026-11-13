import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';

/**
 * Spec 051: el WhatsApp confirmado de la cuenta (Yo → «WhatsApp»). El servidor decide todo; la app solo pide el código y lo confirma.
 * Un fallo se lanza (`ApiError`, con el `message` del servidor): quien llama lo muestra.
 */
export type EstadoDelWhatsapp = {
  /** Hay con qué mandar códigos: sin esto la fila ni se ofrece. */
  disponible: boolean;
  /** El número confirmado, enmascarado (`+51 9•• ••• •21`), o `null`. El servidor nunca manda el completo. */
  confirmado: string | null;
};

const estadoSchema = z.object({ available: z.boolean().catch(false), confirmed: z.string().nullish().catch(null) });
const enviadoSchema = z.object({ sentTo: z.string().nullish().catch(null) });
const confirmadoSchema = z.object({ confirmed: z.string().nullish().catch(null) });

const RUTA = '/api/v1/users/me/whatsapp';

export async function leerWhatsappConfirmado(): Promise<EstadoDelWhatsapp> {
  const r = estadoSchema.parse((await apiFetch<unknown>(RUTA)) ?? {});
  return { disponible: r.available, confirmado: r.confirmed ?? null };
}

/** Manda el código al número (internacional, `+51987654321`). No guarda nada. Devuelve el número enmascarado. */
export async function pedirCodigoDelWhatsapp(numero: string): Promise<string | null> {
  const r = enviadoSchema.parse((await apiFetch<unknown>(`${RUTA}/code`, { method: 'POST', body: { whatsapp: numero } })) ?? {});
  return r.sentTo ?? null;
}

/** Confirma el código y el servidor guarda el número. Devuelve el número confirmado, enmascarado. */
export async function confirmarWhatsapp(numero: string, codigo: string): Promise<string | null> {
  const r = confirmadoSchema.parse((await apiFetch<unknown>(`${RUTA}/confirm`, { method: 'POST', body: { whatsapp: numero, code: codigo } })) ?? {});
  return r.confirmed ?? null;
}
