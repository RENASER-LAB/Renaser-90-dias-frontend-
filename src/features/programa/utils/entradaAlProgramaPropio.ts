/**
 * Qué entrada al programa propio se ofrece (D-260). Pura, para probarla sin montar pantallas.
 *
 * - `ELEGIR_DIA_UNO`: la persona TIENE fila en el programa pero nunca eligió su Día 1 (el servidor
 *   responde `activated: false`). Pasa con el personal que fue aprendiz o al que le crearon la fila
 *   por otro camino: el onboarding, único lugar con el selector, no es para él. Vale para cualquier
 *   rol; un aprendiz llega al selector por el onboarding y nunca ve este estado en Hoy ni en Yo.
 * - `ESPERANDO_INICIO` (2026-11-01, issue #72): ya eligió su Día 1 y la fecha todavía no llega. No hay nada que hacer, solo saber
 *   cuándo empieza. Lo usa la fila compacta de Hoy y de Plan; la tarjeta de Yo no lo pide.
 * - `EMPEZAR`: no tiene fila y el servidor dice que puede empezar (`canStartProgram`, solo
 *   personal). Es la invitación de siempre.
 *
 * Ninguna de las dos depende del nombre del rol: lo dice el servidor. El rol viaja en dos idiomas
 * (`MENTOR_LEAD`/`LIDER_MENTORES`, `ALCHEMIST`/`ALQUIMISTA`) y comprobar uno solo es la clase de
 * fallo que no avisa.
 */
export type EntradaAlProgramaPropio = 'ELEGIR_DIA_UNO' | 'ESPERANDO_INICIO' | 'EMPEZAR' | null;

export function entradaAlProgramaPropio({
  diaUnoPorElegir,
  puedeEmpezar,
  esperandoInicio = false,
}: {
  diaUnoPorElegir: boolean;
  puedeEmpezar: boolean;
  /** Ya eligió su Día 1 y todavía no llega. Opcional: la tarjeta de Yo no lo pregunta. */
  esperandoInicio?: boolean;
}): EntradaAlProgramaPropio {
  if (diaUnoPorElegir) return 'ELEGIR_DIA_UNO';
  if (esperandoInicio) return 'ESPERANDO_INICIO';
  if (puedeEmpezar) return 'EMPEZAR';
  return null;
}
