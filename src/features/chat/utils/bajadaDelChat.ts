/**
 * Cuándo la conversación baja sola al último mensaje y cuándo muestra el botón «↓» (chat estilo
 * WhatsApp, 2026-09-27). Todo puro: la pantalla le pasa el desplazamiento y los mensajes, y esto
 * decide.
 *
 * La lista de mensajes está INVERTIDA (`formatoChat.elementosDeLaListaInvertida`): el
 * desplazamiento 0 es el final, donde está el último mensaje, y crece al subir a leer historia.
 *
 * Las reglas, como WhatsApp:
 * - Quien está abajo ve llegar lo nuevo: la lista lo muestra sola.
 * - Quien subió a leer historia no es arrastrado: aparece «↓» con cuántos llegaron mientras leía.
 * - Lo que manda uno mismo siempre baja al final (ahí va a estar su mensaje).
 * - Volver abajo —desplazándose o con el botón— pone el contador en cero.
 */

/**
 * Hasta cuántos píxeles por encima del final todavía se considera que la persona está abajo.
 * Un poco más que media burbuja de una línea: un roce del dedo no cuenta como «subir a leer».
 */
export const TOLERANCIA_ABAJO_PX = 80;

export type EstadoDeLaBajada = {
  /** La persona está mirando el final de la conversación. */
  abajo: boolean;
  /** Mensajes de otros que llegaron mientras estaba arriba leyendo. */
  nuevosSinVer: number;
};

/** Al abrir una conversación: abajo, en el último mensaje, sin nada pendiente. */
export const ESTADO_INICIAL: EstadoDeLaBajada = Object.freeze({ abajo: true, nuevosSinVer: 0 });

/** Con la lista invertida, el final es el desplazamiento 0 (en iOS puede rebotar a negativo). */
export function estaAbajo(desplazamientoY: number): boolean {
  return desplazamientoY <= TOLERANCIA_ABAJO_PX;
}

/**
 * La persona se desplazó. Devuelve el MISMO objeto si nada cambió, para que la pantalla no se
 * vuelva a dibujar en cada evento de desplazamiento.
 */
export function alDesplazar(estado: EstadoDeLaBajada, desplazamientoY: number): EstadoDeLaBajada {
  if (estaAbajo(desplazamientoY)) {
    return estado.abajo && estado.nuevosSinVer === 0 ? estado : ESTADO_INICIAL;
  }
  return estado.abajo ? { abajo: false, nuevosSinVer: estado.nuevosSinVer } : estado;
}

/**
 * Los mensajes que llegaron DESPUÉS del que era el último la vez anterior (la lista va del más
 * viejo al más nuevo).
 *
 * Sin último anterior —se abrió la conversación, o recién cargó su historial— no llegó nada: es
 * una carga, y una carga abre en el final de todos modos. Si el anterior ya no está en la lista
 * (llegaron tantos que quedó fuera de la página), tampoco se cuentan: mejor sin contador que con
 * uno inventado.
 */
export function mensajesQueLlegaron<M extends { id: string }>(
  ultimoIdAnterior: string | null,
  mensajes: readonly M[]
): M[] {
  if (!ultimoIdAnterior) return [];
  for (let i = mensajes.length - 1; i >= 0; i--) {
    if (mensajes[i].id === ultimoIdAnterior) return mensajes.slice(i + 1);
  }
  return [];
}

/**
 * Llegaron mensajes a la conversación abierta. `bajar` dice si hay que llevar la lista al final.
 */
export function alLlegarMensajes(
  estado: EstadoDeLaBajada,
  llegados: readonly { isMe: boolean }[]
): { estado: EstadoDeLaBajada; bajar: boolean } {
  if (llegados.length === 0) return { estado, bajar: false };
  if (llegados.some(m => m.isMe)) return { estado: ESTADO_INICIAL, bajar: true };
  if (estado.abajo) return { estado, bajar: true };
  return { estado: { abajo: false, nuevosSinVer: estado.nuevosSinVer + llegados.length }, bajar: false };
}

/** El botón «↓» aparece cuando la persona no está en el final. */
export function mostrarBotonBajar(estado: EstadoDeLaBajada): boolean {
  return !estado.abajo;
}

/** Mantener a la vista el mensaje que se está leyendo cuando llegan otros debajo. */
const MANTENER_LO_QUE_SE_LEE = Object.freeze({ minIndexForVisible: 0 });

/**
 * El `maintainVisibleContentPosition` de la lista: SOLO cuando la persona subió a leer.
 *
 * Arriba, un mensaje nuevo entra por debajo y la lista corre el desplazamiento lo mismo que mide,
 * así lo que se estaba leyendo no se mueve (no se la arrastra). Abajo NO hace falta y estorbaría:
 * en una lista invertida lo nuevo aparece solo en el desplazamiento 0; con la propiedad puesta, la
 * lista primero lo escondería corriéndose y después tendría que volver, y ese ir y venir haría
 * parpadear el «↓». Es el mismo objeto siempre, para no mandarle a la vista nativa un cambio en
 * cada dibujo.
 */
export function posicionAMantener(estado: EstadoDeLaBajada): { minIndexForVisible: number } | undefined {
  return estado.abajo ? undefined : MANTENER_LO_QUE_SE_LEE;
}

/** El número del círculo del botón: nada si no llegó ninguno, «99+» si son muchos. */
export function contadorDelBoton(nuevosSinVer: number): string | null {
  if (nuevosSinVer <= 0) return null;
  return nuevosSinVer > 99 ? '99+' : String(nuevosSinVer);
}
