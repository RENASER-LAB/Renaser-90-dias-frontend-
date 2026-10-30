/**
 * Qué muestra Yo → Mi Radar según lo que el servidor dijo de esta cuenta (spec 019): el formulario de siempre, o —cuando todavía
 * no hay Mi Radar— el motivo en una línea. Puro, sin pantalla ni red: la pantalla solo dibuja lo que esto decide.
 *
 * Reglas (las del dueño, 2026-10-30):
 *  - **Sin programa activado** (el personal que no eligió su Día 1): «Mi Radar empieza en tu día 8. Primero elige tu Día 1.» y el
 *    botón «Elegir mi Día 1».
 *  - **Con Día 1 y antes del día 8**: «Mi Radar empieza en tu día 8, el domingo 1 de noviembre.» Sin botón: no hay nada que hacer.
 *  - **Cuenta suspendida o sin permiso**: una línea con el motivo y nada más. Ningún botón que no lleva a nada.
 *  - **Sin red o 5xx**: «No pudimos cargar Mi Radar.» con «Reintentar».
 *  - **Mientras llega la respuesta**: «Cargando Mi Radar…». Nunca el motivo anterior ni la pantalla vacía.
 */
import { MI_RADAR } from '../config/configRadar';
import type { LecturaDeMiRadar } from '../hooks/useConfigDeMiRadar';
import { miRadarCorresponde } from './miRadar';

export const MENSAJE_SIN_PROGRAMA = 'Mi Radar empieza en tu día 8. Primero elige tu Día 1.';
export const MENSAJE_CARGANDO = 'Cargando Mi Radar…';
export const MENSAJE_NO_SE_PUDO_CARGAR = 'No pudimos cargar Mi Radar.';
export const MENSAJE_CUENTA_SUSPENDIDA = 'Tu cuenta está suspendida: Mi Radar no está disponible.';
export const MENSAJE_SIN_PERMISO = 'No tienes permiso para usar Mi Radar.';
export const MENSAJE_NO_DISPONIBLE = 'Mi Radar todavía no está disponible.';
export const MENSAJE_EMPIEZA_EL_DIA_8 = 'Mi Radar empieza en tu día 8.';

export type VistaDeMiRadar =
  | { tipo: 'editor' }
  | { tipo: 'cargando' }
  | { tipo: 'sin-programa' }
  | { tipo: 'aun-no'; texto: string }
  | { tipo: 'bloqueada'; texto: string }
  | { tipo: 'fallo' }
  | { tipo: 'no-disponible' };

const NOMBRES_DE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const NOMBRES_DE_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** `2026-10-29` → `{ 2026, 9, 29 }` (mes 0–11), o `null` si no se puede leer. */
function partesDeLaFecha(iso: string | null | undefined): { anio: number; mes: number; dia: number } | null {
  const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!coincide) return null;
  return { anio: Number(coincide[1]), mes: Number(coincide[2]) - 1, dia: Number(coincide[3]) };
}

/**
 * «Mi Radar empieza en tu día 8, el domingo 1 de noviembre.»
 *
 * `hoy` (`yyyy-MM-dd`) es la fecha de hoy **del servidor** (`MiRadarApi.hoy`, en la zona de la persona); sin ella se usa la del
 * teléfono. Sin Día 1 todavía (`diaPrograma` 0), el día 8 no tiene fecha: «Mi Radar empieza en tu día 8.»
 */
export function textoDeCuandoEmpieza(diaPrograma: number, hoy: string | null | undefined, ahora: Date): string {
  if (diaPrograma < 1) return MENSAJE_EMPIEZA_EL_DIA_8;
  const base = partesDeLaFecha(hoy) ?? { anio: ahora.getFullYear(), mes: ahora.getMonth(), dia: ahora.getDate() };
  // Se suma con fechas locales (nunca con milisegundos): un cambio de horario no corre el día.
  const empieza = new Date(base.anio, base.mes, base.dia + (MI_RADAR.primerDia - diaPrograma));
  return `Mi Radar empieza en tu día ${MI_RADAR.primerDia}, el ${NOMBRES_DE_DIA[empieza.getDay()]} ${empieza.getDate()} de ${NOMBRES_DE_MES[empieza.getMonth()]}.`;
}

/**
 * Lo que se muestra. `diaPrograma` es el de `GET /home` (`null` = no se sabe); `ahora` es el reloj del teléfono, solo para la fecha
 * cuando el servidor no la mandó.
 */
export function vistaDeMiRadar(lectura: LecturaDeMiRadar, diaPrograma: number | null | undefined, ahora: Date): VistaDeMiRadar {
  switch (lectura.estado) {
    case 'pendiente':
      return { tipo: 'cargando' };
    case 'sin-programa':
      return { tipo: 'sin-programa' };
    case 'bloqueada':
      return { tipo: 'bloqueada', texto: lectura.motivo === 'suspendida' ? MENSAJE_CUENTA_SUSPENDIDA : MENSAJE_SIN_PERMISO };
    case 'fallo':
      return { tipo: 'fallo' };
    case 'no-disponible':
      return { tipo: 'no-disponible' };
    case 'lista':
      // Con el programa activado pero antes del día 8 el servidor responde, y la app dice cuándo empieza en vez del formulario.
      if (diaPrograma != null && !miRadarCorresponde(diaPrograma)) {
        return { tipo: 'aun-no', texto: textoDeCuandoEmpieza(diaPrograma, lectura.config.hoy, ahora) };
      }
      return { tipo: 'editor' };
  }
}
