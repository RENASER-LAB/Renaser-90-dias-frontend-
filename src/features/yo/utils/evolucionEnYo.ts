/**
 * Qué dice la parte «Tu evolución» de Yo según dónde esté la persona en su programa (issue #102, E2E del 2026-11-02).
 *
 * Antes dibujaba la tarjeta de fase y el semáforo SIEMPRE que `/home` trajera la fase y el semáforo, y el servidor los manda también antes del Día 1:
 * a quien empieza mañana le decía «Fase 1 de 4 · Días 1–7 · Día 0 de 90 · Te quedan 6 días en esta fase» y «Sin datos · 0 de 7 días con datos»
 * (una fase y unos días que no corren, y un semáforo de una semana que todavía no existe); a quien no tiene programa (el personal sin fila), lo
 * mismo. Tres casos, y en los tres sin hueco:
 *
 *  - `en-curso`: el programa ya corre (día 1 o más). La tarjeta de fase y el semáforo, como siempre.
 *  - `empieza`: tiene la fila y el programa activado, y el Día 1 todavía no llega. Una sola fila, «Tu programa empieza el martes 3 de noviembre»,
 *    la MISMA de Hoy y Plan; sin fase, sin días restantes y sin semáforo. Sin fecha del servidor dice «pronto».
 *  - `oculta`: sin programa (`inscrito` falso), con la fila sin activar —ahí manda «Todavía no empezaste tu programa» de `EntradaAlProgramaPropio`—,
 *    mientras se comprueba cuál de los dos casos es, o sin lectura de `/home`. No se dibuja NADA, ni siquiera el rótulo «Tu evolución»: un bloque
 *    vacío deja igual sus separaciones del scroll, y ese es el hueco.
 *
 * Pura, para probarla sin pantallas. Las lecturas son las que Yo ya hace (`/home` y `useDiaUnoPorElegir`): ningún pedido nuevo.
 */
export type EvolucionEnYo =
  | { tipo: 'en-curso' }
  | { tipo: 'empieza'; fechaInicio: string | null }
  | { tipo: 'oculta' };

export function evolucionEnYo({
  resumen,
  esperandoInicio,
  fechaInicio,
}: {
  /** Lo que `/home` dice del programa; `null` mientras no hay lectura. */
  resumen: { inscrito: boolean; diaPrograma: number } | null | undefined;
  /** `useDiaUnoPorElegir().esperando`: ya activó su programa y la fecha todavía no llega. */
  esperandoInicio: boolean;
  /** `useDiaUnoPorElegir().fechaInicio` (`YYYY-MM-DD`), `null` si el servidor no la mandó. */
  fechaInicio: string | null;
}): EvolucionEnYo {
  if (!resumen || resumen.inscrito !== true) return { tipo: 'oculta' };
  if (resumen.diaPrograma > 0) return { tipo: 'en-curso' };
  // Día 0 con fila: o ya activó y espera su Día 1, o todavía no activó (o aún no se sabe). Fase y semáforo no corresponden a ninguno de los dos.
  return esperandoInicio ? { tipo: 'empieza', fechaInicio } : { tipo: 'oculta' };
}
