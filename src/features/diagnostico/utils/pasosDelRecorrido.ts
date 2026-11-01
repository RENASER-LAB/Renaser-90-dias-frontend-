import type { PreguntaDelDiagnostico, SeccionDelDiagnostico } from '../types/diagnostico.types';
import type { ValoresDelDiagnostico } from './respuestasEnEdicion';
import { seccionesVisibles } from './visibilidad';

/**
 * Cómo se parte el diagnóstico en pasos cortos (spec 026, FR-005): de una a tres preguntas por pantalla, sin mezclar secciones.
 *
 * - Cada pregunta «pesa» según cuánto ocupa en pantalla; un paso admite hasta {@link PESO_MAXIMO_DE_UN_PASO}. Una pregunta
 *   pesada (un párrafo, una cuadrícula, el consentimiento, una lista larga de opciones) va sola.
 * - **La composición de un paso NUNCA depende de sus propias respuestas.** Una pregunta que se muestra «solo si» otra, que
 *   cae en el mismo paso, abre un paso nuevo: así la pantalla no cambia de contenido mientras la persona la contesta, y el
 *   número de paso que se guarda en el servidor (`PUT /onboarding/state`) vuelve a caer en el mismo paso al retomar.
 * - Los pasos solo traen preguntas visibles; una sección que se queda sin ninguna se salta sin dejar un paso vacío.
 */

export const PESO_MAXIMO_DE_UN_PASO = 3;
export const PREGUNTAS_MAXIMAS_POR_PASO = 3;

export interface PasoDelRecorrido {
  /** Estable mientras el paso tenga la misma primera pregunta: el contenido entra con su animación al cambiar. */
  clave: string;
  /** Posición de la sección entre las secciones que tienen algo que mostrar (para los tramos de la barra). */
  indiceDeSeccion: number;
  seccion: { clave: string; titulo: string; descripcion: string | null };
  /** El primer paso de su sección: ahí se dice la descripción de la sección. */
  primeroDeLaSeccion: boolean;
  preguntas: PreguntaDelDiagnostico[];
}

/** Cuánto ocupa una pregunta en la pantalla, de 1 (cabe con otras dos) a 3 (va sola). */
export function pesoDeLaPregunta(pregunta: PreguntaDelDiagnostico): number {
  switch (pregunta.tipo) {
    case 'AREA_TEXTO':
    case 'CUADRICULA':
    case 'CASILLA':
      return PESO_MAXIMO_DE_UN_PASO;
    case 'SELECCION_UNICA':
    case 'SELECCION_MULTIPLE': {
      const opciones = pregunta.opciones.length;
      if (opciones > 5) return PESO_MAXIMO_DE_UN_PASO;
      return opciones > 3 ? 2 : 1;
    }
    default:
      return 1;
  }
}

/** Los pasos del recorrido con las respuestas de ahora. */
export function armarPasos(
  secciones: readonly SeccionDelDiagnostico[],
  valores: ValoresDelDiagnostico,
): PasoDelRecorrido[] {
  const pasos: PasoDelRecorrido[] = [];

  seccionesVisibles(secciones, valores).forEach((seccion, indiceDeSeccion) => {
    let actual: PreguntaDelDiagnostico[] = [];
    let peso = 0;
    let primeroDeLaSeccion = true;

    const cerrar = () => {
      if (actual.length === 0) return;
      pasos.push({
        clave: `${seccion.clave}:${actual[0].id}`,
        indiceDeSeccion,
        seccion: { clave: seccion.clave, titulo: seccion.titulo, descripcion: seccion.descripcion },
        primeroDeLaSeccion,
        preguntas: actual,
      });
      primeroDeLaSeccion = false;
      actual = [];
      peso = 0;
    };

    for (const pregunta of seccion.preguntas) {
      const p = pesoDeLaPregunta(pregunta);
      const dependeDeUnaDeEstePaso =
        pregunta.seMuestraSi !== null && actual.some(otra => otra.id === pregunta.seMuestraSi?.preguntaId);
      if (
        actual.length >= PREGUNTAS_MAXIMAS_POR_PASO ||
        peso + p > PESO_MAXIMO_DE_UN_PASO ||
        dependeDeUnaDeEstePaso
      ) {
        cerrar();
      }
      actual.push(pregunta);
      peso += p;
    }
    cerrar();
  });

  return pasos;
}

/** En qué paso está una pregunta (o -1 si no se muestra). */
export function pasoDeLaPregunta(pasos: readonly PasoDelRecorrido[], preguntaId: number): number {
  return pasos.findIndex(paso => paso.preguntas.some(p => p.id === preguntaId));
}

/** El paso de la primera pregunta (en el orden del recorrido) cuyo id está en `ids`; `null` si ninguna se muestra. */
export function primeraQueFalta(
  pasos: readonly PasoDelRecorrido[],
  ids: readonly number[],
): { indice: number; preguntaId: number } | null {
  for (let indice = 0; indice < pasos.length; indice++) {
    const encontrada = pasos[indice].preguntas.find(p => ids.includes(p.id));
    if (encontrada) return { indice, preguntaId: encontrada.id };
  }
  return null;
}

/** El paso por el que se arranca: el guardado, sin pasarse del último ni bajar de cero. */
export function indiceInicial(pasoGuardado: number | null, totalDePasos: number): number {
  if (pasoGuardado === null || !Number.isFinite(pasoGuardado) || totalDePasos <= 0) return 0;
  return Math.min(Math.max(Math.trunc(pasoGuardado), 0), totalDePasos - 1);
}

/**
 * Cuánto lleva cada tramo de la barra (uno por sección, de 0 a 1). Como en la ficha estándar, el paso en que se está cuenta a
 * medias: los tramos anteriores van llenos, los siguientes vacíos y el de ahora marca `(posición + 1) / pasos`.
 */
export function rellenoPorSeccion(pasos: readonly PasoDelRecorrido[], indice: number): number[] {
  const cuantas = pasos.length === 0 ? 0 : pasos[pasos.length - 1].indiceDeSeccion + 1;
  const actual = pasos[indice]?.indiceDeSeccion ?? 0;
  return Array.from({ length: cuantas }, (_, seccion) => {
    if (seccion < actual) return 1;
    if (seccion > actual) return 0;
    const delTramo = pasos.filter(p => p.indiceDeSeccion === seccion);
    const posicion = delTramo.findIndex(p => p === pasos[indice]);
    return (posicion + 1) / delTramo.length;
  });
}

/** Lo que oye el lector de pantalla de la barra: «Paso 3 de 12, Tu vida hoy». */
export function descripcionDelAvance(pasos: readonly PasoDelRecorrido[], indice: number): string {
  const paso = pasos[indice];
  return paso ? `Paso ${indice + 1} de ${pasos.length}, ${paso.seccion.titulo.toLowerCase()}` : '';
}
