import type { CuerpoDeLaCarrera, RespuestaDeLaCarrera } from '../types/carrera.types';

/**
 * La cola de carreras por enviar (FR-017), en funciones puras. La guarda y la procesa `servicios/colaDeCarreras`.
 *
 * - **Una entrada por `carreraId`**, con el cuerpo ya armado: agregar la misma carrera dos veces no la duplica.
 * - **Sin red o 5xx/503:** se reintenta con espera creciente: 5 s, 15 s, 1 min, 5 min, 15 min y luego cada 30 min. Con la app en
 *   primer plano la espera nunca pasa de 1 min (no hay detector de red en la app: así una carrera terminada sin señal se envía
 *   dentro del minuto siguiente a volver la señal, SC-004).
 * - **2xx** (también `repetida: true`): éxito, sale de la cola. **409 `CARRERA_YA_REGISTRADA`:** la carrera ya está guardada con
 *   otros datos; sale de la cola y no se pisa nada. **Otro 4xx:** no se reintenta solo; queda marcada con el motivo y se le dice
 *   a la persona. **401:** la sesión venció; espera a que vuelva a entrar.
 */

export const ESPERAS_MS = [5_000, 15_000, 60_000, 5 * 60_000, 15 * 60_000];
export const ESPERA_FINAL_MS = 30 * 60_000;
export const ESPERA_MAXIMA_EN_PRIMER_PLANO_MS = 60_000;

export interface EntradaDeLaCola {
  carreraId: string;
  cuentaId: string;
  cuerpo: CuerpoDeLaCarrera;
  intentos: number;
  proximoIntentoMs: number;
  /** Un 4xx que no se reintenta solo: el motivo que dijo el servidor. */
  bloqueada: string | null;
  creadaMs: number;
}

export function esperaTrasIntentos(intentos: number): number {
  if (intentos <= 0) return 0;
  return ESPERAS_MS[intentos - 1] ?? ESPERA_FINAL_MS;
}

export function agregarALaCola(cola: readonly EntradaDeLaCola[], cuerpo: CuerpoDeLaCarrera, cuentaId: string, ahora: number): EntradaDeLaCola[] {
  if (cola.some(e => e.carreraId === cuerpo.carreraId)) return [...cola];
  return [...cola, { carreraId: cuerpo.carreraId, cuentaId, cuerpo, intentos: 0, proximoIntentoMs: ahora, bloqueada: null, creadaMs: ahora }];
}

/** ¿Toca intentar esta entrada ahora? En primer plano la espera se acorta a 1 min como mucho. */
export function tocaIntentar(entrada: EntradaDeLaCola, ahora: number, enPrimerPlano: boolean): boolean {
  if (entrada.bloqueada) return false;
  if (ahora >= entrada.proximoIntentoMs) return true;
  if (!enPrimerPlano) return false;
  const ultimoIntento = entrada.proximoIntentoMs - esperaTrasIntentos(entrada.intentos);
  return ahora - ultimoIntento >= ESPERA_MAXIMA_EN_PRIMER_PLANO_MS;
}

export type DesenlaceDelEnvio =
  | { tipo: 'exito'; respuesta: RespuestaDeLaCarrera }
  | { tipo: 'ya-registrada' }
  | { tipo: 'reintentar' }
  | { tipo: 'bloqueada'; motivo: string }
  | { tipo: 'sin-sesion' };

/** Qué hacer con un error del envío (`status` 0 = sin red). */
export function desenlaceDelError(status: number, codigo: string | null, mensaje: string): DesenlaceDelEnvio {
  // 503 (interruptor apagado) y 404 (la función todavía no le toca a la cuenta, o el servidor aún no la tiene): la carrera
  // espera en la cola y sale cuando se prenda (casos de borde de la spec).
  if (status === 0 || status >= 500 || status === 408 || status === 429 || status === 404) return { tipo: 'reintentar' };
  if (status === 401) return { tipo: 'sin-sesion' };
  if (status === 409 && (codigo === 'CARRERA_YA_REGISTRADA' || codigo == null)) return { tipo: 'ya-registrada' };
  return { tipo: 'bloqueada', motivo: mensaje || 'El servidor no aceptó esta carrera.' };
}

/** Aplica el desenlace a la cola: la entrada sale, se reprograma o queda bloqueada. */
export function aplicarDesenlace(
  cola: readonly EntradaDeLaCola[],
  carreraId: string,
  desenlace: DesenlaceDelEnvio,
  ahora: number,
): EntradaDeLaCola[] {
  if (desenlace.tipo === 'exito' || desenlace.tipo === 'ya-registrada') return cola.filter(e => e.carreraId !== carreraId);
  return cola.map(e => {
    if (e.carreraId !== carreraId) return e;
    if (desenlace.tipo === 'bloqueada') return { ...e, bloqueada: desenlace.motivo };
    if (desenlace.tipo === 'sin-sesion') return e;
    const intentos = e.intentos + 1;
    return { ...e, intentos, proximoIntentoMs: ahora + esperaTrasIntentos(intentos) };
  });
}
