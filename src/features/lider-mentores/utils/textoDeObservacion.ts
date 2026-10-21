import { rangoDeFechas } from '../../semaforo/utils/lecturaDelSemaforo';
import type { TipoObservacion } from '../api/liderMentoresSchemas';
import { NOMBRE_DE_OBSERVACION, fechaCorta } from './lecturaDeMentores';

/**
 * La persona de la que habla una observación al mentor (spec 005, FR-014, R-7): el servidor la guarda como
 * `personId` y `weekStart` (el primer día de los 7 que el líder estaba mirando), y la app arma el mensaje del chat con
 * su nombre.
 */
export interface SobreUnaPersona {
  personaId: string;
  nombre: string;
  /** El primer día de los 7 de los que se habla (el `desde` de la ventana de la ficha). */
  semanaDesde: string;
  /** El último. */
  semanaHasta: string;
}

/**
 * El texto que se manda por el chat directo al mentor. Sin persona va EXACTAMENTE lo que el líder escribió y
 * confirmó (RL-14, RL-16). Con persona **empieza con su nombre** y los 7 días —`Ana Pérez · semana del lunes 12
 * al domingo 18 de octubre`— y sigue lo escrito en otra línea, para que el mentor sepa de quién y de cuándo se
 * habla sin abrir nada.
 */
export function textoParaElChat(texto: string, sobre?: SobreUnaPersona): string {
  const limpio = texto.trim();
  if (!sobre) return limpio;
  const nombre = sobre.nombre.trim() || 'Esta persona';
  return `${nombre} · semana ${rangoDeFechas(sobre.semanaDesde, sobre.semanaHasta)}\n${limpio}`;
}

/** Lo que se dice al guardar: la observación queda guardada aunque el chat falle (RL-16). */
export function avisoAlGuardarObservacion(queriaEnviar: boolean, seEnvio: boolean): string {
  if (!queriaEnviar) return 'Observación guardada.';
  return seEnvio ? 'Observación guardada y enviada por el chat.' : 'Observación guardada. No se pudo enviar por el chat.';
}

/**
 * La línea que encabeza una observación en «Lo que le dijiste» (ficha del mentor): `5 oct · Alerta · enviada`, y
 * `· sobre Ana Pérez` cuando es sobre una persona (spec 005, R-7). Las de antes no traen persona y se leen igual.
 */
export function encabezadoDeLaObservacion(o: {
  createdAt: string;
  type: TipoObservacion;
  sentByChat: boolean;
  personName?: string | null;
}): string {
  const persona = o.personName?.trim() ? ` · sobre ${o.personName.trim()}` : '';
  return `${fechaCorta(o.createdAt)} · ${NOMBRE_DE_OBSERVACION[o.type]}${persona}${o.sentByChat ? ' · enviada' : ''}`;
}
