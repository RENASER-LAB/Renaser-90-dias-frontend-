/**
 * El momento de cumplir UN hábito (pedido del dueño, 2026-10-07: «cuando alguien completa un hábito no hay
 * animación… lo quiero lo más fluido posible»). Lo que se ve:
 *
 * | Cuándo                 | Qué                                                                          | Dura        |
 * |------------------------|------------------------------------------------------------------------------|-------------|
 * | Al apoyar el dedo      | el check se hunde a 0.92 (`Presionable`)                                     | 120 ms      |
 * | Al soltar (cierre directo) | «tic» de selección; el check se llena a medias y respira mientras espera | 140 ms + espera |
 * | Al confirmar el servidor | relleno dorado completo con un «pop» (1.15 → resorte a 1), el ✓, tachado que se dibuja, brillo dorado en el borde, «+N pts» que sube 32 px, saltito del fénix de SER; vibración de logro | ~800 ms |
 * | Si el servidor falla   | el check se vacía con un fundido corto; el error de siempre                  | 180 ms      |
 * | Desde una hoja (evidencia, foto, Pastilla) | lo mismo que al confirmar, 220 ms después: lo que tarda la hoja en irse | — |
 * | Todos los del día      | la pantalla completa «¡Día completo!» (`fenix/components/PantallaDeCelebracion`), 1 s después | ~3,8 s |
 *
 * > **Corregido 2026-10-07 (segunda vuelta).** La primera versión esperaba la respuesta del servidor sin mover nada
 * > (~1–2 s en el emulador) y después animaba de golpe: «+N» de 13 px que subía 22 px en 600 ms, rebote desde 0.8 y un
 * > salto del fénix de 7 px. El dueño: «No veo nada». Ahora hay respuesta en el mismo cuadro del toque
 * > (`momentoEnLaTarjeta.ts`), los puntos se leen (16 px en una pastilla, suben 32 px) y el fénix salta 11 px.
 *
 * Acá vive la DECISIÓN (pura, probada sin dibujar); los componentes solo la ejecutan en el hilo de la interfaz. Esto
 * no celebra el día: ese hito es de `tomarCelebracionDeHoy` (una vez al día, donde ocurra, 2026-10-07), y nada de lo
 * que hay acá lo llama, para que nunca haya dos celebraciones.
 *
 * Con «reducir movimiento» (apple-design §14: menos y más suave, no cero): todo es fundido — sin escala, sin
 * desplazamiento, sin rebote; el tachado aparece en vez de dibujarse y el fénix no salta.
 */

/** Duraciones del momento (ms). */
export const MOMENTO_MS = {
  /** El check responde al soltar: se llena a medias. */
  registrando: 140,
  /** Un ciclo de la respiración del check mientras espera al servidor (ida y vuelta: el doble). */
  respiracion: 600,
  /** El «pop» del check al confirmar: sube a 1.15 en 120 y vuelve con un resorte de 360. */
  pop: 120,
  check: 360,
  /** Los puntos: entran en 140, se quedan y se van en 260; suben durante todo el recorrido. */
  puntos: 820,
  puntosEntrada: 140,
  puntosSalida: 260,
  /** El brillo dorado del borde de la tarjeta: se enciende y se apaga. */
  brilloEntrada: 160,
  brilloSalida: 640,
  /** El tachado del título se dibuja de izquierda a derecha. */
  tachado: 280,
  /** El check que vuelve atrás si el servidor falla. */
  reversion: 180,
  /** El saltito del fénix del botón: sube 180 y vuelve con un resorte de 380. */
  salto: 560,
  saltoSubida: 180,
  saltoBajada: 380,
  /** El fundido que reemplaza al movimiento con «reducir movimiento». */
  fundido: 160,
  /**
   * Lo que se espera antes de celebrar un cierre que NO empezó en la tarjeta (la hoja de evidencia, la foto, la
   * Pastilla): la hoja tarda 200 ms en irse (`DURACION_HOJA_MS.salida`); sin esto la celebración pasa detrás de ella.
   */
  esperaHoja: 220,
} as const;

/** Cuánto se hunde el check al apoyar el dedo. Más que el 0.97 general: el check es chico y es EL gesto de Training. */
export const ESCALA_APRETADO_DEL_CHECK = 0.92;
/** El check a medio llenar mientras espera: tamaño y opacidad del disco, y cuánto baja al respirar. */
export const ESCALA_REGISTRANDO = 0.82;
export const RELLENO_REGISTRANDO = 0.55;
export const RELLENO_RESPIRANDO = 0.3;
/**
 * Escala desde la que rebota el check cuando no hubo «registrando» (cierre desde una hoja). Nunca 0: lo físico no
 * aparece de la nada (Emil, «never animate from scale(0)»).
 */
export const ESCALA_INICIAL_DEL_CHECK = 0.8;
/** El «pop» de la confirmación: el disco pasa a 1.15 y un resorte lo posa en 1 con un rebote que se ve. */
export const ESCALA_DEL_POP = 1.15;
export const AMORTIGUACION_DEL_REBOTE = 0.5;
/** Cuánto sube el «+N» antes de desvanecerse (px). */
export const SUBIDA_DE_LOS_PUNTOS = 32;
/** Cuánto sube el fénix en el saltito (px) y cuánto crece. */
export const ALTURA_DEL_SALTO = 11;
export const ESCALA_DEL_SALTO = 1.1;

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
  return typeof puntosOtorgados === 'number' && puntosOtorgados > 0 ? `+${puntosOtorgados} pts` : 'Registrado';
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

/**
 * Cuánto espera la celebración: nada si el check ya respondió al toque (la persona está mirando la tarjeta); si el
 * cierre vino de una hoja, lo que tarda la hoja en irse.
 */
export function demoraDeLaCelebracion(empezoEnLaTarjeta: boolean): number {
  return empezoEnLaTarjeta ? 0 : MOMENTO_MS.esperaHoja;
}

/** Si el fénix del botón de SER salta al cumplir un hábito: siempre, salvo con «reducir movimiento». */
export function fenixSalta(reducido: boolean): boolean {
  return !reducido;
}
