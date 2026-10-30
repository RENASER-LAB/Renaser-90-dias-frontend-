/**
 * Lo que las pruebas de Mi Radar (spec 019) necesitan para armar lo que responde el servidor, sin repetir los once campos de cada
 * día. El servidor calcula las horas con el Despertar y el Dormir; las pruebas las ponen a mano.
 */
import type { DiaDeMiRadarApi, MiRadarApi } from '../types/radar.types';
import { horasQueCaben } from '../utils/vecesDeMiRadar';

/** Un día resuelto. Por defecto: Automático, Despertar 05:30 y Dormir 22:30 (de 06 a 22, 17 veces), editable. */
export function diaDePrueba(dia: number, cambios: Partial<DiaDeMiRadarApi> = {}): DiaDeMiRadarApi {
  const despertar = cambios.despertar === undefined ? '05:30' : cambios.despertar;
  const dormir = cambios.dormir === undefined ? '22:30' : cambios.dormir;
  const caben = horasQueCaben(despertar, dormir);
  const sinRadar = cambios.sinRadar ?? false;
  const horas = cambios.horas ?? (sinRadar ? [] : caben);
  return {
    dia,
    fecha: null,
    modo: 'AUTOMATICO',
    veces: horas.length,
    maximo: caben.length,
    sinRadar,
    editable: true,
    despertar,
    dormir,
    horas,
    motivo: caben.length === 0 ? (despertar === null ? 'SIN_DESPERTAR' : dormir === null ? 'SIN_DORMIR' : 'HORARIO_INVALIDO') : null,
    ...cambios,
  };
}

/**
 * Mi Radar con los siete días. `porDia` cambia días concretos (por su número ISO); el resto va por defecto. `hoy`
 * (`yyyy-MM-dd`) es la fecha de hoy del servidor; sin él, las fechas no se comparan y manda la del teléfono.
 */
export function miRadarDePrueba(
  encendido = true,
  porDia: Partial<Record<number, Partial<DiaDeMiRadarApi>>> = {},
  hoy: string | null = null,
): MiRadarApi {
  return {
    encendido,
    hoy,
    dias: [1, 2, 3, 4, 5, 6, 7].map(dia => diaDePrueba(dia, porDia[dia] ?? {})),
  };
}

/** Mi Radar con el mismo horario todos los días (Despertar y Dormir). */
export function miRadarConHorario(despertar: string | null, dormir: string | null, encendido = true): MiRadarApi {
  return miRadarDePrueba(encendido, Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map(d => [d, { despertar, dormir }])));
}

export const APAGADO_DE_PRUEBA: MiRadarApi = miRadarDePrueba(false);

/** Mi Radar con estas horas todos los días (se ponen a mano: el servidor las calcularía con el Despertar y el Dormir). */
export function miRadarConHoras(
  horas: number[],
  encendido = true,
  porDia: Partial<Record<number, Partial<DiaDeMiRadarApi>>> = {},
  hoy: string | null = null,
): MiRadarApi {
  return miRadarDePrueba(encendido, Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map(d => [d, { horas, ...porDia[d] }])), hoy);
}
