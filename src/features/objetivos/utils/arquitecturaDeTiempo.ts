import { FASES_EN_ORDEN, type ClaveDeFase } from '../../home/hooks/useResumenHome';
import { faseEnCurso } from '../../home/utils/faseEnCurso';

/**
 * Los tramos del dibujo «Arquitectura de tiempo» de Plan: **las cuatro fases del programa**, cada
 * una del largo que tiene (2026-10-05, decisión del dueño: «4 fases que mencionas»).
 *
 * > **Antes** se dibujaban tres tramos parejos de 30 días (1–30 / 31–60 / 61–90) justo debajo de
 * > «Fase actual · 02 · Días 8–34»: dos particiones distintas de los mismos 90 días en una sola
 * > pantalla, y la de abajo no existe en el método. Ahora sale de `FASES_EN_ORDEN`, la misma fuente
 * > que el rótulo de arriba, Hoy y Yo; ningún número de día se escribe acá.
 *
 * - **Cuál está en curso lo dice el backend** (`fase` de `GET /api/v1/home`), leída con `faseEnCurso`,
 *   la misma función del rótulo de arriba y de la tarjeta de Yo: así los tres no pueden contradecirse. Sin ese dato (o con una clave que la app no conoce)
 *   se deduce del día.
 * - **El relleno sale del día**: lo cumplido de cada fase, de 0 a 1. Sin día conocido (cargando, o
 *   el programa no arrancó) no se rellena nada: mejor vacío que inventado.
 */
export type EstadoDeFase = 'cumplida' | 'en_curso' | 'por_venir';

export interface TramoDeFase {
  clave: ClaveDeFase;
  numero: number;
  nombre: string;
  rango: string;
  /** Cuántos días abarca: es el ancho relativo del tramo. */
  dias: number;
  /** De 0 a 1. */
  avance: number;
  estado: EstadoDeFase;
}

export function tramosDeLasFases(dia: number | null, faseDelBackend: string | null | undefined): TramoDeFase[] {
  const enCurso = indiceEnCurso(dia, faseDelBackend);
  return FASES_EN_ORDEN.map((fase, indice) => {
    const dias = fase.ultimoDia - fase.primerDia + 1;
    return {
      clave: fase.clave,
      numero: fase.numero,
      nombre: fase.nombre,
      rango: fase.rango,
      dias,
      avance: dia === null ? 0 : acotar((dia - fase.primerDia + 1) / dias),
      estado: enCurso === null || indice > enCurso ? 'por_venir' : indice === enCurso ? 'en_curso' : 'cumplida',
    };
  });
}

function indiceEnCurso(dia: number | null, faseDelBackend: string | null | undefined): number | null {
  const delBackend = faseEnCurso(faseDelBackend, dia);
  if (delBackend) return FASES_EN_ORDEN.findIndex(f => f.clave === delBackend.clave);
  if (dia === null) return null;
  const porDia = FASES_EN_ORDEN.findIndex(f => dia >= f.primerDia && dia <= f.ultimoDia);
  if (porDia >= 0) return porDia;
  // Pasado el último día sigue siendo la última fase; antes del Día 1 no hay ninguna en curso.
  return dia > FASES_EN_ORDEN[FASES_EN_ORDEN.length - 1].ultimoDia ? FASES_EN_ORDEN.length - 1 : null;
}

function acotar(valor: number): number {
  return Math.max(0, Math.min(1, valor));
}
