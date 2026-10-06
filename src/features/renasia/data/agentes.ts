import type { AgenteRenasia } from '../types/renasia.types';

/**
 * EL ASISTENTE DEL PROGRAMA, Y SU NOMBRE VISIBLE, VIVEN ACÁ Y EN NINGÚN OTRO LADO.
 *
 * Historia, para que nadie la "arregle" de vuelta:
 * - D-102 (2026-09-04): el dueño pidió dos asistentes, textual: "Sparkie: su objetivo es ayudar en
 *   los cursos. El otro agente, que será un chat aparte, será durante su progreso de 90 días. No los
 *   juntes en un mismo." Hubo `COMPANION` (el acompañante, botón flotante) y `COURSE_TUTOR`
 *   (Sparkie, al pie del curso y de la lección en Classroom).
 * - 2026-09-07: el dueño confirmó "SER, la inteligencia de RENASER" para el acompañante.
 * - D-255 (2026-10-06): el dueño retiró a Sparkie, textual: «Me dijeron que quites a Sparkie, porque
 *   los usuarios se confunden, y que SER haga lo mismo». Queda SER: el botón del curso abre a SER
 *   con el curso y la lección como contexto (`ChatDelCurso`), y SER busca en el material de los
 *   cursos. El backend sigue respondiendo `COURSE_TUTOR` con SER para el APK ya instalado.
 */

/** Nombre visible del acompañante de los 90 días. */
export const NOMBRE_ACOMPANANTE = 'SER';

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
    vacioTitulo: `Habla con ${NOMBRE_ACOMPANANTE.toUpperCase()}`,
    // E-141: la frase terminaba con "Cada respuesta cita las lecciones exactas de las que sale."
    // Se quitó junto con los chips de lecciones citadas: era una promesa a la persona sobre algo
    // que la pantalla ya no muestra. D-255: suma los cursos, que antes eran de Sparkie.
    vacioParrafo:
      'Pregúntale por tus hábitos, por el día en que vas, por lo que enseñan tus cursos, por cómo está armada la app o por cualquier duda del programa.',
  },
};

/** El nombre en mayúsculas, como lo muestran el header, la burbuja y los mensajes de error. */
export function nombreVisible(agent: AgenteRenasia): string {
  return AGENTES[agent].nombre.toUpperCase();
}
