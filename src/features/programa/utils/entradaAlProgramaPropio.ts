/**
 * Qué entrada al programa propio se ofrece (D-260). Pura, para probarla sin montar pantallas.
 *
 * - `ELEGIR_DIA_UNO`: la persona TIENE fila en el programa pero nunca eligió su Día 1 (el servidor
 *   responde `activated: false`). Pasa con el personal que fue aprendiz o al que le crearon la fila
 *   por otro camino: el onboarding, único lugar con el selector, no es para él. Vale para cualquier
 *   rol; un aprendiz llega al selector por el onboarding y nunca ve este estado en Hoy ni en Yo.
 * - `EMPEZAR`: no tiene fila y el servidor dice que puede empezar (`canStartProgram`, solo
 *   personal). Es la invitación de siempre.
 *
 * Ninguna de las dos depende del nombre del rol: lo dice el servidor. El rol viaja en dos idiomas
 * (`MENTOR_LEAD`/`LIDER_MENTORES`, `ALCHEMIST`/`ALQUIMISTA`) y comprobar uno solo es la clase de
 * fallo que no avisa.
 */
export type EntradaAlProgramaPropio = 'ELEGIR_DIA_UNO' | 'EMPEZAR' | null;

export function entradaAlProgramaPropio({
  diaUnoPorElegir,
  puedeEmpezar,
}: {
  diaUnoPorElegir: boolean;
  puedeEmpezar: boolean;
}): EntradaAlProgramaPropio {
  if (diaUnoPorElegir) return 'ELEGIR_DIA_UNO';
  if (puedeEmpezar) return 'EMPEZAR';
  return null;
}
