import type { FuenteDeLosPasos, LecturaDelDia } from '../types/pasos.types';
import { lecturaTieneDatos } from './lecturaDelDia';
import { ETIQUETA_DE_OTRA_APP } from './fuentesDeSalud';

/**
 * Qué se ve en la fila y en la hoja de «Kilómetros diarios» (spec 037, D-310). Una función pura: el estado del soporte, del
 * permiso y de la lectura entran, una vista sale. Nada de aquí lee Health Connect ni habla con el servidor.
 *
 * Las reglas, en orden:
 * 1. **Ya cumplido** (con el número del día): se dice cuánto fue y de dónde salió; no se ofrece nada más.
 * 2. **Sin meta** en la agenda (un backend anterior a la spec 037): la fila de siempre. No se ofrece conectar nada que el
 *    servidor no sabe cerrar.
 * 3. **Sin soporte** (Android menor a 14, sin Health Connect, iPhone/web) o **sin conectar**: se ofrece «Cuenta tus pasos solo»;
 *    en un teléfono sin soporte esa hoja explica que se sube la captura. Por decisión del dueño no se ofrece instalar nada.
 * 4. **Conectado sin permiso**: «Perdimos tus pasos».
 * 5. **Conectado con permiso**: sin lectura todavía, la fila de siempre (sin parpadeo); sin pasos, «Todavía no vemos pasos hoy»;
 *    con pasos, el avance hacia la meta y, al alcanzarla, «Registrar».
 */

/** La clave de sistema de «Kilómetros diarios» (`habitos.clave_sistema`, V84): por ella y nunca por el título, que se renombra. */
export const CLAVE_SISTEMA_KILOMETROS = 'DAILY_KM';

export type EstadoDelSoporte = 'cargando' | 'disponible' | 'no-disponible';

export interface MedicionDelDia {
  meta?: number | null;
  valorDelDia?: number | null;
  origenDelDia?: string | null;
  fuenteDelDia?: string | null;
}

export interface EntradaDeLaVista {
  /** `habit.medicion` del track de hoy; `null` si el servidor no la manda. */
  medicion: MedicionDelDia | null;
  cumplido: boolean;
  soporte: EstadoDelSoporte;
  /** La persona aceptó la hoja de «Conectar» en este teléfono; `null` mientras se lee. */
  conectado: boolean | null;
  /** El permiso de Health Connect; `null` mientras no se sabe. */
  permisos: 'otorgados' | 'faltan' | null;
  lectura: LecturaDelDia | null;
  errorDeLectura: boolean;
  /** `HH:mm` en que se conectó, solo si fue hoy (para «Hoy contamos desde las 14:05.»). */
  conectadoHoyA: string | null;
}

export interface AvanceDeKilometros {
  km: number;
  pasos: number | null;
  meta: number;
  /** `true` si ya llegó a la meta: aparece «Registrar». */
  metaLista: boolean;
  aproximado: boolean;
  /** La fuente principal, la que se muestra y se manda. */
  fuente: FuenteDeLosPasos;
  fuentes: FuenteDeLosPasos[];
  noSumadas: FuenteDeLosPasos[];
  leidoEn: Date;
  /** «14:05» si se conectó hoy; `null` en los demás días. */
  conectadoHoyA: string | null;
}

export type VistaDeKilometros =
  /** La fila de siempre (captura): sin soporte de servidor, o todavía leyendo. */
  | { modo: 'captura' }
  | { modo: 'ofrecer'; soporte: 'disponible' | 'no-disponible' }
  | { modo: 'cumplido'; km: number; origen: string | null; fuente: string | null }
  | { modo: 'sin-permiso' }
  | { modo: 'sin-datos'; hayManuales: boolean }
  | ({ modo: 'avance' } & AvanceDeKilometros);

const FUENTE_DESCONOCIDA: FuenteDeLosPasos = { paquete: '', etiqueta: ETIQUETA_DE_OTRA_APP, dispositivo: 'OTRO' };

export function vistaDeKilometros(entrada: EntradaDeLaVista): VistaDeKilometros {
  const { medicion } = entrada;
  if (entrada.cumplido) {
    const km = medicion?.valorDelDia;
    if (km == null) return { modo: 'captura' };
    return { modo: 'cumplido', km, origen: medicion?.origenDelDia ?? null, fuente: medicion?.fuenteDelDia ?? null };
  }
  const meta = medicion?.meta;
  if (meta == null || !(meta > 0)) return { modo: 'captura' };
  if (entrada.soporte === 'cargando' || entrada.conectado === null) return { modo: 'captura' };
  if (entrada.soporte === 'no-disponible') return { modo: 'ofrecer', soporte: 'no-disponible' };
  if (!entrada.conectado) return { modo: 'ofrecer', soporte: 'disponible' };
  if (entrada.permisos === 'faltan') return { modo: 'sin-permiso' };
  if (entrada.permisos === null) return { modo: 'captura' };
  const lectura = entrada.lectura;
  if (!lectura) return entrada.errorDeLectura ? { modo: 'sin-datos', hayManuales: false } : { modo: 'captura' };
  if (!lecturaTieneDatos(lectura)) return { modo: 'sin-datos', hayManuales: lectura.hayManuales };
  const fuentes = lectura.fuentes.length > 0 ? lectura.fuentes : [FUENTE_DESCONOCIDA];
  return {
    modo: 'avance',
    km: lectura.km,
    pasos: lectura.pasos,
    meta,
    metaLista: lectura.km >= meta,
    aproximado: lectura.aproximado,
    fuente: fuentes[0],
    fuentes,
    noSumadas: lectura.noSumadas,
    leidoEn: lectura.leidoEn,
    conectadoHoyA: entrada.conectadoHoyA,
  };
}

/**
 * ¿Tocar el nombre del hábito abre la hoja de los pasos? Sí cuando están conectados (con avance, sin pasos o sin permiso). Mientras
 * no, tocar el nombre hace lo de siempre (la captura) y la hoja de los pasos se abre solo desde «Cuenta tus pasos solo ›».
 */
export function abreLaHojaDeKilometros(vista: VistaDeKilometros): boolean {
  return vista.modo === 'avance' || vista.modo === 'sin-datos' || vista.modo === 'sin-permiso';
}

/** ¿Se puede ofrecer «Registrar» ahora? Solo con la meta alcanzada. */
export function sePuedeRegistrar(vista: VistaDeKilometros): boolean {
  return vista.modo === 'avance' && vista.metaLista;
}

/** El porcentaje de la barra (0 a 100). */
export function porcentajeDeLaBarra(avance: Pick<AvanceDeKilometros, 'km' | 'meta'>): number {
  if (!(avance.meta > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((avance.km / avance.meta) * 100)));
}
