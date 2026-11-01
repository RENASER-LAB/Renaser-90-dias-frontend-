import { formatearFechaLarga } from '../hooks/useArranqueDelPrograma';
import type { EntradaAlProgramaPropio } from './entradaAlProgramaPropio';

/**
 * Qué dice la fila compacta del programa propio, en Hoy y en Plan (2026-11-01, pedido del dueño: «ese de los 90 días con menos texto, el
 * tamaño que antes de coherencia y racha»). Lógica pura, sin React ni red: una sola función para las dos pantallas.
 *
 * Tres casos, todos con el mismo esqueleto (`FilaCompacta`: ícono, título en negrita, una línea corta, chevron; sin botón dorado):
 *
 *  - `empezar`: no tiene fila en el programa y el servidor dice que puede empezar (`canStartProgram`, solo personal).
 *    «Haz tu programa de 90 días · Elige tu Día 1 ›». Es la invitación de siempre, sin el párrafo «Puedes recorrerlo tú también…».
 *    Es la única que lleva «Ahora no» (una ✕ chica a la derecha).
 *  - `elegir`: tiene fila pero nunca eligió su Día 1 (`activated: false`). «Todavía no elegiste tu Día 1 · Elige cuándo empiezas ›».
 *  - `esperando` (issue #72): ya eligió su Día 1 y la fecha todavía no llega (día 0). «Tu programa empieza el martes 3 de noviembre», sin
 *    chevron porque no lleva a nada. El Día 1 nunca puede ser hoy, así que todo aprendiz recién activado pasa por aquí al menos un día. Si el
 *    servidor no mandó la fecha: «Tu programa empieza pronto» (no se inventa ninguna).
 *
 * `empezar` y `elegir` abren el MISMO selector del Día 1 que ya abría «Elegir mi Día 1» (`ActivarProgramaScreen`).
 *
 * `plazo` es el de SU programa («90 días», «3 meses», «1 año»; `plazoDelObjetivo`), el mismo con que se nombra el objetivo grande.
 * Qué entrada corresponde (`entrada`) lo decide `entradaAlProgramaPropio`; esto solo redacta.
 */
export type VistaDeLaFilaDelPrograma = {
  tipo: 'empezar' | 'elegir' | 'esperando';
  titulo: string;
  /** Una línea corta debajo del título. */
  linea: string | null;
  /** Toda la fila abre el selector del Día 1. */
  abreElSelector: boolean;
  /** «Ahora no» (la ✕): solo la invitación a quien todavía no tiene programa. */
  conAhoraNo: boolean;
  /** Lo que oye el lector de pantalla: el título y la línea juntos. */
  etiquetaAccesible: string;
};

function vista(
  tipo: VistaDeLaFilaDelPrograma['tipo'],
  titulo: string,
  linea: string | null,
  extra: Pick<VistaDeLaFilaDelPrograma, 'abreElSelector' | 'conAhoraNo'>,
): VistaDeLaFilaDelPrograma {
  return { tipo, titulo, linea, ...extra, etiquetaAccesible: linea ? `${titulo}. ${linea}.` : titulo };
}

export function vistaDeLaFilaDelPrograma({
  entrada,
  plazo,
  fechaInicio,
}: {
  entrada: EntradaAlProgramaPropio;
  plazo: string;
  /** `YYYY-MM-DD`, el Día 1 que eligió. Solo importa con `ESPERANDO_INICIO`. */
  fechaInicio?: string | null;
}): VistaDeLaFilaDelPrograma | null {
  switch (entrada) {
    case 'ESPERANDO_INICIO': {
      const titulo = fechaInicio ? `Tu programa empieza el ${formatearFechaLarga(fechaInicio)}` : 'Tu programa empieza pronto';
      return vista('esperando', titulo, null, { abreElSelector: false, conAhoraNo: false });
    }
    case 'ELEGIR_DIA_UNO':
      return vista('elegir', 'Todavía no elegiste tu Día 1', 'Elige cuándo empiezas', { abreElSelector: true, conAhoraNo: false });
    case 'EMPEZAR':
      return vista('empezar', `Haz tu programa de ${plazo}`, 'Elige tu Día 1', { abreElSelector: true, conAhoraNo: true });
    default:
      return null;
  }
}
