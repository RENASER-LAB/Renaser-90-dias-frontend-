import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';

/**
 * Los interruptores de «Notificaciones» en Yo (E-4), guardados de verdad en
 * `preferencias_notificacion` por `GET/PATCH /api/v1/notification-preferences`. Hasta el 26/09 eran
 * decorativos: `useState` y nada más, y al reiniciar volvían a estar prendidos.
 *
 * ## Qué temas y por qué esos
 *
 * Decisión del dueño (26/09, §9.4): **sí** «Eventos y clases», **no** un tema «Hábitos» (cada hábito
 * ya tiene su recordatorio). De los que propone la spec (E-4) quedan los que el servidor de verdad
 * emite, para no volver a pintar un interruptor que no apaga nada:
 *
 * | Tema             | Tipos del servidor                        |
 * |------------------|-------------------------------------------|
 * | Eventos y clases | `RECORDATORIO_EVENTO`                     |
 * | Logros           | `LOGRO_DESBLOQUEADO`, `HITO_PROGRAMA`     |
 * | Resumen semanal  | `RESUMEN_SEMANAL`                         |
 *
 * | Mensajes         | `MENSAJE_CHAT`                            |
 * | Revisiones de tu líder | `REVISION_DEL_LIDER` (spec 005, solo quien acompaña un grupo) |
 * | Análisis de tu 80/20 | `ANALISIS_80_20` (spec 031, para todos los que hacen su programa) |
 *
 * > **Corregido 2026-09-29 (D-221 del backend).** Decía: «"Mi grupo y mensajes" (`MENSAJE_CHAT`,
 * > `MENSAJE_MENTOR`) no está: al 26/09 ningún código del backend emite esos tipos». Desde D-221 el
 * > backend avisa cada mensaje de chat con `MENSAJE_CHAT`, así que «Mensajes» apaga algo de verdad.
 * > `MENSAJE_MENTOR` sigue sin emisor y sigue afuera.
 *
 * > **Spec 005 (2026-10-19).** «Revisiones de tu líder» (`REVISION_DEL_LIDER`): el resumen de las 20:00 que
 * > recibe un mentor cuando su líder revisó a alguien de su grupo ese día. Es **solo para quien acompaña un
 * > grupo** (el servidor se lo manda a esos mentores): para el resto el interruptor no se ofrece, aunque el
 * > servidor lo liste.
 *
 * ## Tolerancia a un backend viejo
 *
 * Un tema se muestra solo si el GET trae TODOS sus tipos. Contra un backend sin `RECORDATORIO_EVENTO`
 * el interruptor de eventos no aparece, y así nunca se manda un tipo que el servidor no conoce (su
 * `TipoNotificacion.valueOf` respondería 500). El PATCH lleva solo los tipos del tema que se tocó.
 */

export interface TemaDeAviso {
  clave: 'eventos' | 'logros' | 'resumen' | 'mensajes' | 'revisiones' | 'analisis';
  nombre: string;
  detalle: string;
  tipos: readonly string[];
  /** Solo se ofrece a quien acompaña un grupo (mentor, guía de aprendiz, líder): ver `temasVisibles`. */
  soloParaQuienAcompana?: boolean;
}

export const TEMAS: readonly TemaDeAviso[] = [
  {
    clave: 'mensajes',
    nombre: 'Mensajes',
    detalle: 'Cuando te escriben en un chat',
    tipos: ['MENSAJE_CHAT'],
  },
  {
    clave: 'eventos',
    nombre: 'Eventos y clases',
    detalle: 'Cuando se crea un evento y antes de que empiece',
    tipos: ['RECORDATORIO_EVENTO'],
  },
  {
    clave: 'logros',
    nombre: 'Logros',
    detalle: 'Cuando cumples una racha o una acción',
    tipos: ['LOGRO_DESBLOQUEADO', 'HITO_PROGRAMA'],
  },
  {
    clave: 'resumen',
    nombre: 'Resumen semanal',
    detalle: 'El sábado, cómo te fue en la semana',
    tipos: ['RESUMEN_SEMANAL'],
  },
  {
    clave: 'revisiones',
    nombre: 'Revisiones de tu líder',
    detalle: 'Un aviso a las 8 de la noche si tu líder revisó a alguien de tu grupo',
    tipos: ['REVISION_DEL_LIDER'],
    soloParaQuienAcompana: true,
  },
  /* Spec 031 (FR-024): el aviso de que el análisis de la semana o del mes está listo. Encendido de fábrica; el texto del aviso es fijo y
     nunca lleva el análisis. Contra un servidor anterior (sin `ANALISIS_80_20`) el interruptor no se ofrece. */
  {
    clave: 'analisis',
    nombre: 'Análisis de tu 80/20',
    detalle: 'Cuando el análisis de tu semana o de tu mes está listo',
    tipos: ['ANALISIS_80_20'],
  },
];

const respuestaSchema = z
  .object({
    preferences: z.array(z.object({ type: z.string(), enabled: z.boolean() }).passthrough()),
  })
  .passthrough();

/** `tipo → encendido`, tal como lo dijo el servidor. */
export type Preferencias = Record<string, boolean>;

function leer(datos: unknown, origen: string): Preferencias {
  const r = respuestaSchema.safeParse(datos);
  if (!r.success) throw new Error(`Respuesta inesperada de ${origen}`);
  return Object.fromEntries(r.data.preferences.map(p => [p.type, p.enabled]));
}

export async function obtenerPreferencias(): Promise<Preferencias> {
  return leer(await apiFetch<unknown>('/api/v1/notification-preferences'), 'GET /api/v1/notification-preferences');
}

export async function guardarTema(tema: TemaDeAviso, encendido: boolean): Promise<Preferencias> {
  const respuesta = await apiFetch<unknown>('/api/v1/notification-preferences', {
    method: 'PATCH',
    body: { preferences: tema.tipos.map(type => ({ type, enabled: encendido })) },
  });
  return leer(respuesta, 'PATCH /api/v1/notification-preferences');
}

/**
 * Los temas que este servidor sabe guardar, con su estado. Encendido = todos sus tipos encendidos.
 *
 * `acompanaUnGrupo`: quien no acompaña un grupo no ve los temas que son solo para quien lo hace (spec 005).
 * Sin decirlo, no se ofrecen.
 */
export function temasVisibles(
  preferencias: Preferencias,
  { acompanaUnGrupo = false }: { acompanaUnGrupo?: boolean } = {},
): Array<TemaDeAviso & { encendido: boolean }> {
  return TEMAS.filter(tema => !tema.soloParaQuienAcompana || acompanaUnGrupo)
    .filter(tema => tema.tipos.every(tipo => tipo in preferencias))
    .map(tema => ({
      ...tema,
      encendido: tema.tipos.every(tipo => preferencias[tipo] === true),
    }));
}
