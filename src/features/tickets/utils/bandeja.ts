import type { WireTicketMentor } from '../types/tickets.types';

/**
 * Cómo se ordena y se resume la bandeja de tickets de mentoría.
 *
 * Funciones puras, fuera de la pantalla, por el mismo motivo que `mentor/reglas.ts`: el criterio
 * de "qué mirar primero" es una decisión de producto que se va a afinar con el uso, y tenerla acá
 * hace que cambiarla sea tocar una comparación y no perseguir lógica repartida entre una lista y
 * un contador que después se contradicen.
 *
 * **Nada de acá inventa un dato.** La bandeja solo sabe lo que el servidor manda: el bloqueo
 * descrito, si tiene respuesta, y cuándo se abrió. No hay nombres —la respuesta trae
 * `traineeProfileId` y nada más— así que la pantalla no dice de quién es cada ticket en vez de
 * inventar un nombre o mostrar un UUID como si fuera una persona.
 */

/**
 * La bandeja ordenada para atenderla.
 *
 * <blockquote><b>Criterio, y es un supuesto.</b> Primero lo que <b>sigue sin respuesta</b>, y
 * dentro de eso lo <b>más viejo arriba</b>: si algo lleva nueve días esperando, es lo que hay que
 * mirar, y una bandeja ordenada solo por fecha lo entierra bajo lo que llegó hoy. Los ya
 * respondidos van después, del más reciente al más antiguo, que es como se revisa lo hecho.
 * El backend no impone ningún orden: devuelve la página y el criterio es de esta pantalla.
 * </blockquote>
 *
 * No muta la lista que recibe: devuelve una copia ordenada.
 */
export function ordenarBandeja(tickets: readonly WireTicketMentor[]): WireTicketMentor[] {
  return [...tickets].sort((a, b) => {
    const esperaA = a.status === 'OPEN';
    const esperaB = b.status === 'OPEN';
    if (esperaA !== esperaB) return esperaA ? -1 : 1;

    const fechaA = instanteDe(a.createdAt);
    const fechaB = instanteDe(b.createdAt);
    // Sin fecha legible se va al fondo de su mitad, no al frente: no se sabe cuánto esperó.
    if (fechaA === null || fechaB === null) {
      if (fechaA === fechaB) return a.id.localeCompare(b.id);
      return fechaA === null ? 1 : -1;
    }
    return esperaA ? fechaA - fechaB : fechaB - fechaA;
  });
}

/** Las cifras de cabecera. Se cuentan, no se estiman. */
export function resumenDeBandeja(tickets: readonly WireTicketMentor[]): {
  total: number;
  sinResponder: number;
  respondidos: number;
} {
  const sinResponder = tickets.filter(t => t.status === 'OPEN').length;
  return {
    total: tickets.length,
    sinResponder,
    respondidos: tickets.length - sinResponder,
  };
}

/** El estado, con el nombre que usa la gente y no el del enum. */
export function etiquetaDeEstadoDeTicket(estado: WireTicketMentor['status']): string {
  return estado === 'OPEN' ? 'Sin responder' : 'Respondido';
}

/** Milisegundos de un ISO, o `null` si no se puede leer. Una fecha rota no es una fecha cero. */
function instanteDe(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}
