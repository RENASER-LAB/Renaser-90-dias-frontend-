/**
 * Cuánto se aparta el reloj de este teléfono del reloj del servidor.
 *
 * ## Por qué existe
 *
 * El Código Renaser abre y cierra por hora en punto, y esa hora se decide con el reloj del
 * dispositivo — decisión del dueño, y es la correcta: "las 10" tiene que significar las 10 de la
 * persona, no las 10 de un servidor en otro país. Pero eso deja dos agujeros:
 *
 *  1. **Un reloj mal puesto corre la ventana entera.** Un teléfono adelantado tres horas ve
 *     terminado el día a las 17:00 reales, y uno atrasado no ve abrir hasta las 11:00.
 *  2. **El reloj se puede mover a propósito.** Poner el teléfono en 21:00 apagaba el radar.
 *
 * La forma de cerrarlos sin perder lo primero es separar dos cosas que se suelen confundir:
 *
 *  - **La ZONA la sigue poniendo el teléfono.** Es lo que traduce un instante a "las 10 de la
 *    mañana" para quien mira la pantalla, y es suyo.
 *  - **El INSTANTE lo pone el servidor.** Toda respuesta HTTP trae una cabecera `Date` con la hora
 *    del servidor; de ahí sale el desfase, y sumándolo al reloj local se obtiene el instante real
 *    sin una sola llamada extra.
 *
 * Resultado: alguien que corre su reloj sigue viendo su propia zona horaria, pero el radar abre y
 * cierra cuando de verdad corresponde.
 *
 * ## Lo que NO hace
 *
 * No corrige una ZONA mal configurada — si el teléfono cree estar en Madrid, verá la ventana en
 * horario de Madrid. Eso es indistinguible de alguien que de verdad viajó, y corregirlo sería
 * decidir por la persona dónde está.
 *
 * Tampoco es una defensa criptográfica: quien quiera saltarse su propio registro de conciencia
 * puede. Esto evita el caso común y honesto —el reloj mal puesto— no al adversario.
 */

/** Milisegundos que hay que SUMAR al reloj local para llegar al del servidor. */
let desfaseMs = 0;
/** `false` hasta la primera respuesta del backend: antes de eso sólo tenemos el reloj local. */
let medido = false;

/**
 * Desfase a partir del cual se considera que el reloj local no sirve para decidir la hora.
 *
 * Dos minutos: por debajo, la diferencia es latencia de red y deriva normal, y corregirla sólo
 * agregaría ruido. Por encima, ya puede mover a alguien de franja horaria, que es lo único que
 * acá importa.
 */
const TOLERANCIA_MS = 2 * 60 * 1000;

/**
 * Anota la hora del servidor de una respuesta. La llama `apiFetch` en cada petición, así que el
 * desfase se mantiene fresco solo.
 *
 * El valor se toma tal cual, sin compensar el viaje de ida y vuelta: media latencia son
 * milisegundos y acá se decide una franja de una hora. Añadir esa corrección sería precisión
 * inventada.
 */
export function registrarHoraDelServidor(cabeceraDate: string | null): void {
  if (!cabeceraDate) return;
  const servidor = Date.parse(cabeceraDate);
  if (Number.isNaN(servidor)) return;
  desfaseMs = servidor - Date.now();
  medido = true;
}

/** Milisegundos de diferencia con el servidor. `0` mientras no se haya medido ninguna respuesta. */
export function desfaseConElServidor(): number {
  return medido ? desfaseMs : 0;
}

/** `true` si el reloj del teléfono está lo bastante corrido como para cambiar de franja. */
export function relojLocalDesfasado(): boolean {
  return medido && Math.abs(desfaseMs) > TOLERANCIA_MS;
}

/**
 * El instante actual, corregido con el reloj del servidor cuando se conoce.
 *
 * Sigue siendo un `Date` normal, así que `getHours()` traduce a la zona del dispositivo — que es
 * justamente lo que se quería conservar.
 */
export function ahoraConfiable(): Date {
  return new Date(Date.now() + desfaseConElServidor());
}

/** Solo para pruebas: devuelve el módulo a "todavía no medí nada". */
export function olvidarHoraDelServidor(): void {
  desfaseMs = 0;
  medido = false;
}
