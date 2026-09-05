import type { AgenteRenasia } from '../types/renasia.types';

/**
 * LOS DOS ASISTENTES DEL PROGRAMA, Y SUS NOMBRES VISIBLES, VIVEN ACÁ Y EN NINGÚN OTRO LADO (D-102).
 *
 * Pedido del dueño (2026-09-04), textual: "Sparkie: su objetivo es ayudar en los cursos. El otro
 * agente, que será un chat aparte, será durante su progreso de 90 días. No los juntes en un mismo."
 *
 * Hasta hoy la app tenía UN asistente con dos modos (D-97 lo rebautizó "Sparkie" en todas partes,
 * D-100 le agregó un `scope` por curso). Eso fue un error de interpretación y acá se deshace:
 *
 * - `COMPANION`: el acompañante de los 90 días. Hábitos, días del programa, cómo está armada la
 *   app, orientación, ánimo. Es el del botón flotante (`RenasiaLauncher`) y el que saluda en el
 *   arranque (`features/sparkie`, ver la nota en `sparkie/data/asistente.ts`).
 * - `COURSE_TUTOR`: Sparkie, el tutor de los cursos. Vive al pie del curso y de la lección en
 *   Recursos Exclusivos (`ChatDelCurso`) y responde sobre ese contenido.
 *
 * Cada uno tiene su historial en el backend (`GET /api/v1/renasia/mensajes?agent=`), su prompt de
 * sistema y su nombre. Nunca se mezclan.
 *
 * El nombre del acompañante TODAVÍA NO LO CONFIRMÓ EL DUEÑO: vuelve a ser "Renasia", el que
 * siempre tuvo, hasta que diga otra cosa. Por eso es una constante: cambiar el nombre es cambiar
 * una línea acá, sin tocar tablas, rutas ni clases (que siguen diciendo `renasia` a propósito).
 */

/** Nombre visible del acompañante de los 90 días. PENDIENTE de confirmación del dueño. */
export const NOMBRE_ACOMPANANTE = 'Renasia';

/** Nombre visible del tutor de cursos. Confirmado por el dueño. */
export const NOMBRE_TUTOR_CURSOS = 'Sparkie';

export type PerfilAgente = {
  nombre: string;
  /** Debajo del nombre en el header del panel, cuando no hay etiqueta de curso que mostrar. */
  subtitulo: string;
  /** Pantalla vacía del panel: título y párrafo. */
  vacioTitulo: string;
  vacioParrafo: string;
};

export const AGENTES: Record<AgenteRenasia, PerfilAgente> = {
  COMPANION: {
    nombre: NOMBRE_ACOMPANANTE,
    subtitulo: 'Tu guía del programa, siempre disponible',
    vacioTitulo: `Hablá con ${NOMBRE_ACOMPANANTE.toUpperCase()}`,
    vacioParrafo:
      'Preguntale por tus hábitos, por el día en que vas, por cómo está armada la app o por cualquier duda del programa. Cada respuesta cita las lecciones exactas de las que sale.',
  },
  COURSE_TUTOR: {
    nombre: NOMBRE_TUTOR_CURSOS,
    subtitulo: 'Tu tutor dentro de este curso',
    vacioTitulo: `Preguntale a ${NOMBRE_TUTOR_CURSOS.toUpperCase()}`,
    vacioParrafo:
      'Sobre lo que dice esta lección, cómo aplicarla hoy o cualquier duda del curso. Si la pregunta se va del tema, te orienta con lo más cercano del curso en vez de negarse.',
  },
};

/** El nombre en mayúsculas, como lo muestran el header, la burbuja y los mensajes de error. */
export function nombreVisible(agent: AgenteRenasia): string {
  return AGENTES[agent].nombre.toUpperCase();
}
