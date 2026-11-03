import type { LecturaCrudaDelDia, LecturaDelDia } from '../types/pasos.types';
import { fuenteDe, ordenarFuentes, origenesDelDia } from './fuentesDeSalud';

/**
 * De lo que dice Health Connect a la lectura que se muestra y se manda (spec 037, D-310). Todo es puro: la lectura de Health
 * Connect misma vive en `services/saludConectada`.
 */

/** La zancada media con la que se estiman los km cuando ninguna fuente dio la distancia: ~75 cm por paso. Siempre «aprox.». */
export const ZANCADA_MEDIA_EN_METROS = 0.75;

/** Los km del día: la distancia medida; si no hay, los pasos por la zancada media. Dos decimales, como el servidor. */
export function kilometrosDe(
  distanciaM: number | null,
  pasos: number | null,
): { km: number; aproximado: boolean } {
  const redondear = (n: number) => Math.round(n * 100) / 100;
  if (distanciaM != null && Number.isFinite(distanciaM) && distanciaM > 0) {
    return { km: redondear(distanciaM / 1000), aproximado: false };
  }
  if (pasos != null && Number.isFinite(pasos) && pasos > 0) {
    return { km: redondear((pasos * ZANCADA_MEDIA_EN_METROS) / 1000), aproximado: true };
  }
  return { km: 0, aproximado: false };
}

/**
 * Arma la lectura de hoy con lo que devolvió `saludConectada`:
 * - las fuentes que cuentan son los orígenes que el agregado USÓ y que además son limpios;
 * - las «no sumadas» son los limpios que el agregado no usó (Health Connect puso otra fuente primero);
 * - `hayManuales` se prende si algún origen del día tenía registros escritos a mano o de método desconocido.
 */
export function armarLaLectura(cruda: LecturaCrudaDelDia, leidoEn: Date): LecturaDelDia {
  const { limpios, sucios } = origenesDelDia(cruda.registros);
  const usados = new Set(cruda.origenesUsados);
  const cuentan = limpios.filter(origen => usados.has(origen));
  const sinSumar = limpios.filter(origen => !usados.has(origen));
  const { km, aproximado } = kilometrosDe(cruda.distanciaM, cruda.pasos);
  return {
    pasos: cruda.pasos,
    distanciaM: cruda.distanciaM,
    km,
    aproximado,
    fuentes: ordenarFuentes(cuentan.map(origen => fuenteDe(origen, cruda.registros))),
    noSumadas: ordenarFuentes(sinSumar.map(origen => fuenteDe(origen, cruda.registros))),
    hayManuales: sucios.length > 0,
    leidoEn,
  };
}

/** ¿Se vio algo de pasos o distancia hoy? Sin nada, la pantalla dice «Todavía no vemos pasos hoy». */
export function lecturaTieneDatos(lectura: LecturaDelDia): boolean {
  return lectura.km > 0 || (lectura.pasos ?? 0) > 0;
}

/** Lo que se manda al servidor (`POST /habit-tracks/{id}/auto-measurement`). La fuente principal es la primera. */
export interface CuerpoDeLaMedicionAutomatica {
  kilometros: number;
  pasos?: number;
  fuente: string;
  dispositivo: 'TELEFONO' | 'RELOJ' | 'OTRO';
  leidoEn: string;
}

export function cuerpoParaElServidor(lectura: LecturaDelDia): CuerpoDeLaMedicionAutomatica | null {
  const principal = lectura.fuentes[0];
  if (!principal || lectura.km <= 0) return null;
  return {
    kilometros: lectura.km,
    ...(lectura.pasos != null && lectura.pasos >= 0 ? { pasos: Math.round(lectura.pasos) } : {}),
    fuente: principal.etiqueta.slice(0, 60),
    dispositivo: principal.dispositivo,
    leidoEn: lectura.leidoEn.toISOString(),
  };
}
