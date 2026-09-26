import type { EntradaDelRegistro, EstadoParaFoto, ResultadoDelRegistro } from './registroConFoto';

/**
 * A qué se sube la foto del REGISTRO CON FOTO (D-178 del backend, decisión del dueño 2026-09-26).
 *
 * El registro con foto nació para los hábitos que exigen evidencia. Desde D-178 el acompañante
 * también lo pide para una ACCIÓN DEL DÍA (roca diaria): misma cámara, misma pantalla partida, mismo
 * hook (`useRegistroConFoto`); lo único que cambia es a qué endpoints va (`/habit-tracks/{id}/...` o
 * `/rocks/{id}/...`) y cómo se sabe si todavía se puede registrar.
 *
 * `habits` no conoce las rocas (la dependencia inversa, `objetivos` → `habits`, es la que ya existe):
 * por eso las reglas de la roca las inyecta quien monta el hook (`objetivos/utils/registroDeAccionConFoto`).
 */
export type DestinoDeFoto = 'habito' | 'roca';

/**
 * El `destino` del evento `evidencia`. Sin el campo (un backend anterior a D-178) es un hábito, como
 * siempre. Un valor que esta versión no conoce devuelve `null` y el pedido se ignora: mandarlo a los
 * endpoints de hábitos con el id de otra cosa terminaría en un 404. El texto de respaldo que llega
 * antes queda a la vista.
 */
export function destinoDeEvidencia(valor: unknown): DestinoDeFoto | null {
  if (valor === undefined || valor === null || valor === 'habito') return 'habito';
  return valor === 'roca' ? 'roca' : null;
}

/** Lo que cambia según el destino. El resto del flujo (cámara, pantalla, reintentos) es uno solo. */
export type ReglasDelDestino = {
  /** El estado FRESCO del registro, justo antes de abrir la cámara. */
  estadoFresco: (id: string) => Promise<EstadoParaFoto>;
  /**
   * Sube la foto y cierra el registro. `alConfirmarEvidencia` se llama si la evidencia quedó guardada
   * ANTES del cierre (hábitos: dos pasos). Una roca se cierra en la misma llamada y no lo llama.
   */
  registrar: (entrada: EntradaDelRegistro, alConfirmarEvidencia: () => void) => Promise<ResultadoDelRegistro>;
};

/**
 * Un rechazo ya escrito para la persona (p. ej. "primero la acción verde"). El hook muestra su
 * mensaje tal cual, en vez del genérico "No se pudo registrar".
 */
export class RechazoParaMostrar extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'RechazoParaMostrar';
  }
}
