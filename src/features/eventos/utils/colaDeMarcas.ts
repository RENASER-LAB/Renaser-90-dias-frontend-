import type { EstadoDeLlegada } from '../types/asistencia.types';

/**
 * Las marcas de «Pasar lista» que todavía no confirmó el servidor (D-256). La fila cambia al instante
 * (al tocar no se espera la red) y la marca queda acá hasta que el servidor la confirme; si la red
 * falla, se reintenta sola con esperas crecientes. Si se toca otra vez antes de que llegue la
 * respuesta, vale el ÚLTIMO toque: el `PUT` es idempotente, así que reenviar no duplica nada.
 *
 * Funciones puras sobre un objeto inmutable; el temporizador y la red viven en `usePasarLista`.
 */

export interface MarcaPendiente {
  deseada: EstadoDeLlegada;
  /** Envíos fallidos de ESTA marca (se reinicia si la persona toca otra vez). */
  fallos: number;
}

export type ColaDeMarcas = Readonly<Record<string, MarcaPendiente>>;

export const COLA_VACIA: ColaDeMarcas = {};

/** Esperas entre reintentos: crecen y se quedan en 20 s. */
const ESPERAS_MS = [1500, 3000, 6000, 12000, 20000];

export function pedirMarca(cola: ColaDeMarcas, personaId: string, llegada: EstadoDeLlegada): ColaDeMarcas {
  return { ...cola, [personaId]: { deseada: llegada, fallos: 0 } };
}

/** El servidor guardó `enviada`. Si mientras tanto se pidió otra cosa, la marca sigue pendiente. */
export function marcaConfirmada(cola: ColaDeMarcas, personaId: string, enviada: EstadoDeLlegada): ColaDeMarcas {
  const pendiente = cola[personaId];
  if (!pendiente || pendiente.deseada !== enviada) return cola;
  const { [personaId]: _quitada, ...resto } = cola;
  return resto;
}

/** Falló el envío de `enviada` por la red: se cuenta para esperar más la próxima vez. */
export function marcaFallida(cola: ColaDeMarcas, personaId: string, enviada: EstadoDeLlegada): ColaDeMarcas {
  const pendiente = cola[personaId];
  if (!pendiente || pendiente.deseada !== enviada) return cola;
  return { ...cola, [personaId]: { ...pendiente, fallos: pendiente.fallos + 1 } };
}

/** El servidor la rechazó de verdad (lista cerrada, fuera de hora, sin permiso): no se reintenta. */
export function marcaDescartada(cola: ColaDeMarcas, personaId: string): ColaDeMarcas {
  if (!(personaId in cola)) return cola;
  const { [personaId]: _quitada, ...resto } = cola;
  return resto;
}

export function esperaParaReintentar(fallos: number): number {
  return ESPERAS_MS[Math.min(Math.max(fallos, 1), ESPERAS_MS.length) - 1];
}

/** Lo que muestra la fila: lo que se pidió, si todavía no se confirmó; si no, lo del servidor. */
export function llegadaVisible(cola: ColaDeMarcas, personaId: string, delServidor: EstadoDeLlegada): EstadoDeLlegada {
  return personaId in cola ? cola[personaId].deseada : delServidor;
}

export function hayPendientes(cola: ColaDeMarcas): boolean {
  return Object.keys(cola).length > 0;
}

/** Un fallo de red (sin respuesta, o el servidor caído) se reintenta; un 4xx no. */
export function esFalloDeRed(status: number | null): boolean {
  return status === null || status === 0 || status >= 500 || status === 429;
}
