import type { AccionDelMapa } from '../../mapa-renacimiento/hooks/useAccionesDelMapa';
import type { EjeObjetivo } from '../types/objetivos.types';

/**
 * Las dos reglas de las acciones que la persona escribe a mano al agendar su día.
 *
 * ── Por qué viven acá y no dentro del modal ──
 *
 * Porque se escribieron dentro del componente y **no se pudo confirmar que funcionaran probando en
 * el emulador**: entre el teclado tapando el botón, `ESC` cerrando el modal nativo sin avisarle a
 * React y los recargues de Metro, cada intento medía otra cosa. Una lógica que no se puede
 * verificar no está terminada. Acá son dos funciones puras con sus pruebas, que es como está hecho
 * el resto de `utils/` en este módulo.
 */

/** Una acción ya elegida para el día. Es la forma mínima que necesitan estas reglas. */
export interface AccionElegida {
  eje: EjeObjetivo;
  titulo: string;
  hora: string;
  pasos: string[];
}

/**
 * Lo que se ofrece en un eje: lo que la persona escribió en el Mapa **más** lo que agregó a mano.
 *
 * Las propias entran a la lista visible para que se dibujen igual que las del Mapa —con su hora y
 * sus pasos—. Sin esto, una acción escrita a mano quedaba elegida pero invisible: el contador subía
 * y en pantalla no aparecía nada.
 *
 * Una propia que coincide palabra por palabra con una del Mapa **no se duplica**: es la misma.
 */
export function opcionesDelEje(
  eje: EjeObjetivo,
  delMapa: AccionDelMapa[],
  elegidas: AccionElegida[]
): AccionDelMapa[] {
  const textos = new Set(delMapa.map(a => a.texto));
  const propias = elegidas
    .filter(e => e.eje === eje && !textos.has(e.titulo))
    .map<AccionDelMapa>(e => ({ texto: e.titulo, dias: [], frecuenciaSemanal: 0 }));
  return [...delMapa, ...propias];
}

/**
 * Agrega una acción escrita a mano. Devuelve `null` cuando no corresponde agregarla, y el llamador
 * no hace nada — ni error ni aviso: no pasó nada porque no había nada que pasar.
 *
 * Se rechaza si el texto está vacío, si ese eje ya llegó a su tope, o si esa acción ya está
 * elegida. El tope lo impone la base (`rocas_diarias.posicion BETWEEN 1 AND 3`), no la pantalla.
 */
export function conAccionPropia(
  elegidas: AccionElegida[],
  eje: EjeObjetivo,
  texto: string,
  maximoPorEje: number
): AccionElegida[] | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  if (elegidas.filter(e => e.eje === eje).length >= maximoPorEje) return null;
  if (elegidas.some(e => e.eje === eje && e.titulo === limpio)) return null;
  return [...elegidas, { eje, titulo: limpio, hora: '', pasos: [] }];
}
