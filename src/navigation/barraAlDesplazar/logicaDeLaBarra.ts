/**
 * «Ocultar la barra al desplazar» (pedido del dueño, 2026-10-02): como en X o Facebook, al bajar
 * por una lista la barra de pestañas se esconde y al subir vuelve. Acá vive SOLO la decisión
 * —¿la barra va visible o escondida después de este evento de scroll?—, sin React ni Reanimated,
 * para poder probarla con números.
 *
 * Reglas, en el orden en que se aplican:
 *
 * 1. **Cerca del tope, visible.** Con la lista arriba de todo (o casi), la barra siempre está.
 * 2. **Lista corta, visible.** Si lo que sobra para desplazar no alcanza para justificar el
 *    escondite (menos que el doble de lo que la barra le devuelve a la pantalla), no se esconde:
 *    esconderla agrandaría la vista lo justo para que la lista deje de desplazarse y la barra
 *    volvería, un parpadeo.
 * 3. **Cambió el alto de la vista, no se decide nada.** Esconder o mostrar la barra cambia el alto
 *    de la lista, y al final de una lista eso mueve el desplazamiento solo (el sistema lo recorta).
 *    Ese movimiento no lo hizo la persona: si se tomara como «subió», la barra volvería y se iría
 *    en bucle.
 * 4. **Dirección sostenida.** Se mide desde el punto donde cambió la dirección (`ancla`), no desde
 *    el evento anterior: hace falta recorrer {@link UMBRAL_PX} seguidos hacia un lado para cambiar
 *    de estado. Un temblor del dedo no hace parpadear la barra.
 */

/** Píxeles seguidos en una misma dirección para cambiar de estado. */
export const UMBRAL_PX = 10;
/** Por debajo de este desplazamiento la barra se ve siempre. */
export const CERCA_DEL_TOPE_PX = 24;

export interface MedidaDeDesplazamiento {
  /** `contentOffset.y` */
  y: number;
  /** `contentSize.height` */
  altoContenido: number;
  /** `layoutMeasurement.height` */
  altoVista: number;
}

export interface EstadoDeLaBarra {
  visible: boolean;
  /** Dónde empezó el tramo actual en una misma dirección. */
  ancla: number;
  ultimaY: number;
  altoVista: number | null;
}

export const ESTADO_INICIAL: EstadoDeLaBarra = { visible: true, ancla: 0, ultimaY: 0, altoVista: null };

/**
 * @param altoQueGana lo que la vista crece al esconderse la barra (alto de la barra menos el borde
 *   seguro de abajo, que queda). Se usa para la regla de la lista corta.
 */
export function siguienteEstadoDeLaBarra(
  estado: EstadoDeLaBarra,
  medida: MedidaDeDesplazamiento,
  altoQueGana: number
): EstadoDeLaBarra {
  const maximo = Math.max(0, medida.altoContenido - medida.altoVista);
  // El rebote de iOS y la rueda del mouse pueden reportar fuera de [0, máximo].
  const y = Math.min(Math.max(0, medida.y), maximo);
  const base = { ancla: y, ultimaY: y, altoVista: medida.altoVista };

  if (y <= CERCA_DEL_TOPE_PX) return { ...base, visible: true };

  // Lo que se podría desplazar CON la barra a la vista, esté como esté ahora.
  const maximoConBarra = estado.visible ? maximo : maximo + altoQueGana;
  if (maximoConBarra < altoQueGana * 2) return { ...base, visible: true };

  if (estado.altoVista !== null && estado.altoVista !== medida.altoVista) {
    return { ...base, visible: estado.visible };
  }

  const bajando = y > estado.ultimaY;
  const veniaBajando = estado.ultimaY >= estado.ancla;
  const cambioDeDireccion = y !== estado.ultimaY && bajando !== veniaBajando;
  const ancla = cambioDeDireccion ? estado.ultimaY : estado.ancla;
  const recorrido = y - ancla;

  let visible = estado.visible;
  if (recorrido >= UMBRAL_PX) visible = false;
  else if (recorrido <= -UMBRAL_PX) visible = true;

  // Al cambiar de estado se reinicia el tramo: el próximo cambio pide otro recorrido completo.
  return { visible, ancla: visible !== estado.visible ? y : ancla, ultimaY: y, altoVista: medida.altoVista };
}
