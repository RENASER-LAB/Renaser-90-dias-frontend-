/**
 * El volumen del micrófono mientras la voz en vivo escucha (0–1, `onInputVolumeLevelData` del módulo nativo), para
 * que el fénix del centro de Hoy se mueva con la voz de la persona (2026-10-07, pedido del dueño). Solo lo da la voz
 * en vivo; la de siempre (dictado) no tiene nivel y el fénix escucha sin él.
 *
 * Es un aviso y no un estado de React a propósito: llega varias veces por segundo y un `setState` volvería a dibujar
 * Hoy entera en cada uno (lo mismo que E-458 enseñó con la transcripción). Mismo emisor mínimo que
 * `avisoPropuestaConfirmada.ts`.
 */
type Oyente = (nivel: number) => void;

const oyentes = new Set<Oyente>();

export function avisarNivelDelMicrofono(nivel: number): void {
  for (const oyente of [...oyentes]) {
    try {
      oyente(nivel);
    } catch {
      /* el fénix no puede cortar la conversación */
    }
  }
}

/** Devuelve la función para darse de baja — pensado para el `return` de un `useEffect`. */
export function alNivelDelMicrofono(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
