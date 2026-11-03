import type { DatosParaGuardarFormacion, ResumenDeFormacion } from '../types/formaciones.types';

/**
 * Lo que se edita de una formación (spec 022), y su validación: las mismas reglas del servidor (nombre de 3 a 80 letras, descripción
 * de hasta 600, de 1 a 4 duraciones únicas entre 1 y 365). Aquí solo se avisa antes de enviar; el servidor decide.
 */
export type BorradorDeFormacion = {
  nombre: string;
  descripcion: string;
  activa: boolean;
  duracionesDias: number[];
  /** Las que se pueden marcar: las de siempre (3 meses y 1 año) más las que la formación ya tenga. */
  opcionesDeDuracion: number[];
};

const DURACIONES_DE_SIEMPRE = [90, 365];

export function borradorDeLaFormacion(resumen: ResumenDeFormacion): BorradorDeFormacion {
  const opciones = [...new Set([...DURACIONES_DE_SIEMPRE, ...resumen.duracionesDias])].sort((a, b) => a - b);
  return {
    nombre: resumen.nombre,
    descripcion: resumen.descripcion,
    activa: resumen.activa,
    duracionesDias: [...resumen.duracionesDias].sort((a, b) => a - b),
    opcionesDeDuracion: opciones,
  };
}

/** Lo que falta para poder guardar, en una línea; `null` si ya se puede. */
export function errorDelBorrador(borrador: BorradorDeFormacion): string | null {
  const nombre = borrador.nombre.trim();
  if (nombre.length < 3) return 'El nombre necesita al menos 3 letras.';
  if (nombre.length > 80) return 'El nombre puede tener hasta 80 letras.';
  if (borrador.descripcion.length > 600) return 'La descripción puede tener hasta 600 letras.';
  if (borrador.duracionesDias.length === 0) return 'Elige al menos una duración.';
  return null;
}

export function paraGuardar(borrador: BorradorDeFormacion, version: number): DatosParaGuardarFormacion {
  return {
    nombre: borrador.nombre.trim(),
    descripcion: borrador.descripcion.trim(),
    activa: borrador.activa,
    duracionesDias: [...borrador.duracionesDias].sort((a, b) => a - b),
    version,
  };
}
