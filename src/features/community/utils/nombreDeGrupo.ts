import type { CelulaDelAprendiz } from '../types/community.types';

/**
 * El nombre con el que se muestra un chat de grupo (D-142).
 *
 * **El problema.** El módulo `chat` del backend solo conoce el `celulaId` de la conversación, no el
 * nombre del grupo, así que su mapeador titula TODOS los chats de grupo con el texto fijo
 * `'Mi Grupo'`. Con un grupo por persona no se notaba. Desde que alguien puede estar en varios
 * (D-139), la bandeja mostraba dos o tres filas idénticas, todas llamadas igual, sin forma de saber
 * cuál era cuál.
 *
 * **Por qué se resuelve en el cliente y no en el servidor.** Porque `chat` no importa `community`
 * —la regla de módulos de este repo lo prohíbe— y el nombre del grupo vive en `community`. El
 * cliente ya pide las dos cosas, así que cruzarlas acá no le cuesta una llamada más.
 *
 * Si el grupo no está en la lista —todavía cargando, o una conversación de un grupo del que ya
 * salió— se devuelve el título que vino. Es genérico, pero **nunca es el nombre de otro grupo**,
 * que es el error que este cambio vino a corregir.
 */
export function nombreVisibleDeGrupo(
  conversacion: { type: string; celulaId: string | null; title: string },
  grupos: Pick<CelulaDelAprendiz, 'cellId' | 'cellName'>[]
): string {
  if (conversacion.type !== 'celula' || !conversacion.celulaId) {
    return conversacion.title;
  }
  return grupos.find(g => g.cellId === conversacion.celulaId)?.cellName ?? conversacion.title;
}
