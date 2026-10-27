import type { PersonaDeFicha } from '../types/admin.types';

/**
 * Los días y las evidencias de una persona, desde Administración (2026-10-27): decisiones puras de qué se abre y
 * qué se dice. La vista es la del líder (`PersonaDelLiderScreen`: los 7 días, la foto, el audio, el video y el
 * texto dentro de la app, el «¿Qué sentiste?» y las fotos de las acciones de los objetivos), servida por
 * `GET /leadership/groups/{g}/people/{p}/week`, que ADMIN y ALCHEMIST pueden leer igual que el líder.
 *
 * **Esa lectura no abre cualquier cosa**: responde 404 si el grupo no es regular con mentor vigente (la recepción
 * y un grupo sin mentor), si la persona hoy no está en ese grupo o si no se muestra (sin participación en el programa,
 * cuenta suspendida o de prueba). Por eso la ficha de administración se queda: es la única vista que sirve a
 * cualquier aprendiz, con o sin grupo.
 */

/** A dónde lleva tocar a una persona de la tabla del semáforo de un grupo. */
export type DestinoDeLaPersonaDelSemaforo = 'dias-y-evidencias' | 'ficha';

/**
 * Tocar a una persona del semáforo de un grupo: si el servidor dice que el grupo se puede abrir
 * (`puedeAbrirse`: tiene mentor y la funcionalidad está prendida), va directo a sus días y evidencias, como el
 * líder; si no (un grupo sin mentor), a su ficha, como siempre. Desde sus días se llega a la ficha con un botón.
 */
export function destinoDeLaPersonaDelSemaforo(grupo: { puedeAbrirse: boolean }): DestinoDeLaPersonaDelSemaforo {
  return grupo.puedeAbrirse ? 'dias-y-evidencias' : 'ficha';
}

/**
 * El grupo con el que la ficha pide los días de la persona. Sin grupo (esperando que alguien la ubique) no hay
 * nada que pedir y la ficha no ofrece la entrada.
 */
export function grupoParaVerSusDias(aprendiz: Pick<PersonaDeFicha, 'cellId'>): string | null {
  const grupo = aprendiz.cellId?.trim();
  return grupo ? grupo : null;
}

/**
 * La ficha ofrece abrir los días de la persona, salvo que se haya llegado a ella desde esos mismos días: evita el
 * círculo ficha → días → ficha → días. `anterior` es la vista que quedó debajo de la ficha en la pila.
 */
export function fichaOfreceSusDias(
  aprendiz: Pick<PersonaDeFicha, 'id' | 'cellId'>,
  anterior: { nombre: string; aprendiz?: { id: string } } | undefined,
): boolean {
  if (!grupoParaVerSusDias(aprendiz)) return false;
  return !(anterior?.nombre === 'persona-semaforo' && anterior.aprendiz?.id === aprendiz.id);
}

/** El nombre del grupo cuando se llega desde la ficha y no se sabe: la lectura del líder pide uno para la cabecera. */
export const NOMBRE_DEL_GRUPO_SIN_DATO = 'Su grupo';

/**
 * Lo que se lee cuando el servidor no abre a la persona (404): en vez del «todavía no está disponible» genérico, que
 * promete que aparecerá solo, se dice por qué y dónde sí se ven sus evidencias.
 */
export const AVISO_SI_NO_SE_ABREN_SUS_DIAS =
  'No se pueden mostrar sus días desde acá: su grupo todavía no tiene mentor o la persona no figura hoy en él. ' +
  'Sus evidencias se ven en su ficha, en «Detalle de hábitos (lunes a domingo)».';
