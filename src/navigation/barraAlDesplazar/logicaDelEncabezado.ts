/**
 * «El encabezado de Comunidad se esconde al desplazar» (pedido del dueño, 2026-10-02). Va de la
 * mano de la barra de pestañas (`logicaDeLaBarra.ts`): misma dirección, mismo umbral y MISMO
 * estado. Acá vive solo la decisión, sin React ni Reanimated, para poder probarla con números.
 *
 * El encabezado tiene tres estados:
 *
 * - `completo`: título, lema y fila de secciones, como siempre.
 * - `circulos`: solo la fila de secciones, compacta, para poder cambiar de sección sin volver arriba.
 * - `oculto`: nada; el contenido usa toda la pantalla.
 *
 * Reglas, en el orden en que se aplican:
 *
 * 1. **Cerca del tope, completo.** Con la lista arriba de todo (los mismos
 *    {@link CERCA_DEL_TOPE_PX} que la barra), el encabezado está entero.
 * 2. **Barra escondida, encabezado oculto.** Bajar lo esconde junto con la barra: no hay un umbral
 *    propio, así se van y vuelven juntos.
 * 3. **Barra a la vista lejos del tope: solo los círculos** — salvo que el encabezado viniera
 *    completo. Al bajar desde el tope la barra tarda `UMBRAL_PX` en irse; si en ese tramo el
 *    encabezado pasara a `circulos`, perdería el título y medio segundo después desaparecería
 *    entero: dos saltos para un solo gesto. Completo sigue completo hasta que la barra se va.
 *
 * Los «reinicios» de la barra (cambio de pestaña, de sección, volver a la app) lo dejan `completo`:
 * eso lo hace el hook, porque no depende del desplazamiento.
 */
import { CERCA_DEL_TOPE_PX } from './logicaDeLaBarra';

export type EstadoDelEncabezado = 'completo' | 'circulos' | 'oculto';

export function siguienteEstadoDelEncabezado(
  actual: EstadoDelEncabezado,
  medida: { y: number; barraVisible: boolean }
): EstadoDelEncabezado {
  if (medida.y <= CERCA_DEL_TOPE_PX) return 'completo';
  if (!medida.barraVisible) return 'oculto';
  return actual === 'completo' ? 'completo' : 'circulos';
}

/**
 * Cuánto sube el encabezado en cada estado. `altoSobreLaFila` es lo que hay arriba de la fila de
 * secciones (título y lema); sin fila (la lección a pantalla completa), es el alto entero y
 * `circulos` equivale a `oculto`: no hay círculos que mostrar.
 */
export function desplazamientoDelEncabezado(
  estado: EstadoDelEncabezado,
  alto: { total: number; sobreLaFila: number | null }
): number {
  if (estado === 'completo') return 0;
  if (estado === 'oculto' || alto.sobreLaFila === null) return -alto.total;
  return -Math.min(alto.sobreLaFila, alto.total);
}
