import type { TipoDeComunidad, TipoDeComunidadDeLaFormacion } from '../types/formaciones.types';

/**
 * Los textos y las reglas de la sección «Comunidad» del detalle de una formación (Administración, spec 024). Todo puro.
 */

export const NOMBRE_DEL_TIPO: Record<TipoDeComunidad, string> = {
  GENERAL: 'Comunidad general',
  GRUPO: 'Grupo con mentor',
  SOPORTE: 'Soporte',
  DIRECTO: 'Directos',
};

export const AYUDA_DEL_TIPO: Record<TipoDeComunidad, string> = {
  GENERAL: 'El chat de toda la formación',
  GRUPO: 'El chat de cada mentor con sus aprendices',
  SOPORTE: 'El chat de cada aprendiz con el equipo',
  DIRECTO: 'Los chats de 1 a 1',
};

/** «1 conversación», «12 conversaciones». */
export function textoDeConversaciones(n: number): string {
  return `${n} ${n === 1 ? 'conversación' : 'conversaciones'}`;
}

/** La línea chica bajo el nombre del tipo: cuántas conversaciones tiene (o esconde). */
export function lineaDelTipo(tipo: TipoDeComunidadDeLaFormacion): string {
  return `${AYUDA_DEL_TIPO[tipo.tipo]} · ${textoDeConversaciones(tipo.conversaciones)}`;
}

export function tituloDeApagar(tipo: TipoDeComunidad): string {
  return `¿Apagar «${NOMBRE_DEL_TIPO[tipo]}»?`;
}

/**
 * Lo que dice la confirmación de APAGAR un tipo: cuántas conversaciones esconde para toda la formación, y que nada se borra. Con cero
 * conversaciones no hay nada que esconder hoy, pero apagarlo igual impide que nazcan nuevas mientras esté apagado.
 */
export function mensajeDeApagar(conversaciones: number): string {
  if (conversaciones <= 0) {
    return 'Hoy no esconde ninguna conversación, y no se crearán nuevas de este tipo mientras esté apagado. Los mensajes no se borran y vuelven si lo prendes.';
  }
  return `Esto esconde ${textoDeConversaciones(conversaciones)} para toda la formación. Los mensajes no se borran y vuelven si lo prendes.`;
}

export function avisoDeGuardado(tipo: TipoDeComunidad, prendido: boolean): string {
  return `«${NOMBRE_DEL_TIPO[tipo]}» ${prendido ? 'prendido' : 'apagado'}.`;
}

/** Con el cambio ya aplicado en la lista (para que el interruptor responda al instante). */
export function conElTipoCambiado(
  tipos: readonly TipoDeComunidadDeLaFormacion[],
  tipo: TipoDeComunidad,
  prendido: boolean,
): TipoDeComunidadDeLaFormacion[] {
  return tipos.map(t => (t.tipo === tipo ? { ...t, prendido } : t));
}
