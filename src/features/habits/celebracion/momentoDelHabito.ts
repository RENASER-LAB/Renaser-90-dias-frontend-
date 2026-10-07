/**
 * El momento de cumplir UN hábito (pedido del dueño, 2026-10-07: «cuando alguien completa un hábito no hay
 * animación… lo quiero lo más fluido posible»). Lo que se ve, aprobado por el dueño:
 *
 * | Qué                           | Cómo                                                         | Dura    |
 * |-------------------------------|--------------------------------------------------------------|---------|
 * | El check de la tarjeta        | se llena de dorado con un rebote pequeño (resorte, desde 0.8) | ~300 ms |
 * | Los puntos                    | «+N» del servidor sube suave y se desvanece; 0 → «Registrado» | ~600 ms |
 * | El fénix del botón de SER     | un saltito (transform de la foto fija; nunca Rive)            | ~500 ms |
 * | Vibración                     | `tacto.logro`, una vez, la dispara la pantalla que cerró      | —       |
 * | Todos los del día             | la celebración corta que ya existe (`useCelebracionDelDia`)   | 2,5 s   |
 *
 * Acá vive la DECISIÓN (pura, probada sin dibujar); los componentes solo la ejecutan en el hilo de la interfaz. Esto
 * no celebra el día: ese hito sigue siendo de `tomarCelebracionDeHoy` (una vez al día, al volver a Hoy), y nada de lo
 * que hay acá lo llama, para que nunca haya dos celebraciones.
 *
 * Con «reducir movimiento» (apple-design §14: menos y más suave, no cero): el check y los puntos aparecen con un
 * fundido, sin escala ni desplazamiento, y el fénix no salta.
 */

/** Duraciones del momento. Todas por debajo de lo que dura el tacto de la persona con la pantalla. */
export const MOMENTO_MS = {
  /** El rebote del check: un resorte que se posa en ~300 ms. */
  check: 300,
  /** Los puntos: entran en 120, se quedan y se van; en total 600. */
  puntos: 600,
  puntosEntrada: 120,
  puntosSalida: 240,
  /** El saltito del fénix del botón: sube 180 y vuelve con un resorte de 320. */
  salto: 500,
  saltoSubida: 180,
  saltoBajada: 320,
  /** El fundido que reemplaza al movimiento con «reducir movimiento». */
  fundido: 160,
} as const;

/**
 * Escala desde la que rebota el check. Nunca 0: lo físico no aparece de la nada (Emil, «never animate from scale(0)»);
 * desde 0.8 con un resorte de amortiguación 0.6 pasa apenas de 1 (~8 %) y se posa: es el «rebote pequeño».
 */
export const ESCALA_INICIAL_DEL_CHECK = 0.8;
export const AMORTIGUACION_DEL_REBOTE = 0.6;
/** Cuánto sube el «+N» antes de desvanecerse (px). */
export const SUBIDA_DE_LOS_PUNTOS = 22;
/** Cuánto sube el fénix en el saltito (px) y cuánto crece: poco, es un «te vi», no una fiesta. */
export const ALTURA_DEL_SALTO = 7;
export const ESCALA_DEL_SALTO = 1.06;

export type PlanDelMomento = {
  /** `rebote`: escala 0.8 → 1 con resorte. `fundido`: solo opacidad. */
  check: 'rebote' | 'fundido';
  /** El texto que sube: «+10», o «Registrado» si el servidor no pagó (o no se sabe cuánto). */
  puntos: string;
  /** Si los puntos suben o solo aparecen y se van en su lugar. */
  puntosSuben: boolean;
};

/**
 * Lo que dicen los puntos. Solo el número que dio el SERVIDOR (`puntosOtorgados`), nunca uno calculado acá; con 0 o
 * sin dato, «Registrado» — un «+0» se lee como un error.
 */
export function textoDePuntos(puntosOtorgados: number | null | undefined): string {
  return typeof puntosOtorgados === 'number' && puntosOtorgados > 0 ? `+${puntosOtorgados}` : 'Registrado';
}

export function planDelMomento(puntosOtorgados: number | null | undefined, reducido: boolean): PlanDelMomento {
  return {
    check: reducido ? 'fundido' : 'rebote',
    puntos: textoDePuntos(puntosOtorgados),
    puntosSuben: !reducido,
  };
}

/**
 * El momento se juega solo cuando el hábito PASA a cumplido con la tarjeta a la vista. Montarse ya cumplido (abrir
 * Training con el hábito hecho), volver a dibujarse cumplido o el cambio de día (cumplido → pendiente) no celebran.
 */
export function seCumplioRecien(antes: boolean, ahora: boolean): boolean {
  return !antes && ahora;
}

/** Si el fénix del botón de SER salta al cumplir un hábito: siempre, salvo con «reducir movimiento». */
export function fenixSalta(reducido: boolean): boolean {
  return !reducido;
}
