/**
 * Errores del servidor que NO van en un diálogo (spec 002, fase 2, contrato `fase-2.md` §6):
 *
 * - **404 `FUNCIONALIDAD_NO_DISPONIBLE`**: lo que la persona tocó no le corresponde (un despliegue en el que no entró).
 *   La app relee qué tiene y esa entrada desaparece; un diálogo diciendo «no está disponible» sobre algo que se acaba
 *   de esconder solo confunde.
 * - **403 `MODO_SOLO_LECTURA`**: Soporte TI está viendo la app como otro rol. El rechazo se dice en línea, en la franja
 *   de arriba («Viendo como…»), no en un diálogo por cada intento.
 *
 * Las pantallas muestran sus errores con `Alert.alert(título, mensajeDeError(e))` en cientos de lugares; en vez de
 * tocarlos uno por uno, `apiFetch` anota acá el error y el diálogo de la app (`components/Alerta`, `admin/utils/dialogo`)
 * pregunta antes de abrirse. Se omite solo un **aviso** (sin botones que hagan algo: una confirmación o una elección
 * nunca se tragan, porque quien la abrió espera la respuesta) que llega enseguida del error o que repite su texto.
 */

/** Un aviso que llega hasta este tiempo después del error es la respuesta de la pantalla a ese error. */
export const VENTANA_DEL_DIALOGO_MS = 1500;
/** Con el mismo texto que el error, se reconoce aunque llegue un poco más tarde. */
const VENTANA_POR_TEXTO_MS = 5000;

let ultimo: { mensaje: string | null; en: number } | null = null;
let reloj: () => number = () => Date.now();

/** El reloj, para las pruebas. */
export function usarRelojDeErroresSinDialogo(nuevo: (() => number) | null): void {
  reloj = nuevo ?? (() => Date.now());
}

export function registrarErrorSinDialogo(mensaje: string | null | undefined): void {
  ultimo = { mensaje: typeof mensaje === 'string' && mensaje.trim() ? mensaje.trim() : null, en: reloj() };
}

export function olvidarErroresSinDialogo(): void {
  ultimo = null;
}

/** ¿Este diálogo es la respuesta de una pantalla a un error que no va en diálogo? */
export function debeOmitirseElDialogo(
  titulo: string | null | undefined,
  mensaje: string | null | undefined,
  botones?: readonly { onPress?: unknown }[] | null,
): boolean {
  if (!ultimo) return false;
  if (botones?.some(boton => typeof boton.onPress === 'function')) return false;
  const edad = reloj() - ultimo.en;
  if (edad < 0 || edad > VENTANA_POR_TEXTO_MS) return false;
  const texto = (mensaje ?? '').trim();
  if (ultimo.mensaje && (texto === ultimo.mensaje || (titulo ?? '').trim() === ultimo.mensaje)) return true;
  return edad <= VENTANA_DEL_DIALOGO_MS;
}
