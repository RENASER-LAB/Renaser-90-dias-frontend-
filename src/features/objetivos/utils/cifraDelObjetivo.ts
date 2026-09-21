import type { RocaMaestraApi } from '../types/objetivos.types';

/**
 * La cifra de un objetivo de 90 días, lista para mostrar: `"82 → 75 kg"`.
 *
 * ── Por qué ──
 *
 * La tarjeta de PRIORIDADES CLAVE mostraba la frase redactada entera —"Al Día 90 pesaré 75 kg,
 * partiendo de 82 kg, con evidencia en foto y báscula los lunes, porque quiero llegar al día 90
 * con más energía…"— recortada a tres líneas con puntos suspensivos. Tres tarjetas así son un
 * muro de texto donde lo único que se busca de un vistazo, el número, es lo que queda escondido.
 *
 * Pedido del dueño el 2026-09-14: que se vea el número, no el párrafo. La frase completa sigue
 * disponible a un toque, en el modal de edición.
 *
 * ── Qué devuelve `null` ──
 *
 * Un objetivo puramente cualitativo, que es válido y frecuente: Relaciones se mide en una escala
 * 1-10 y el Mapa la manda a propósito SIN meta numérica, porque un puntaje no es una unidad de
 * negocio y mezclarlo con kilos o soles rompería el porcentaje. Quien llame decide qué poner en su
 * lugar; acá no se inventa una cifra.
 */
export function cifraDelObjetivo(roca: RocaMaestraApi | null | undefined): string | null {
  if (!roca || roca.meta === null || !roca.unidad?.trim()) return null;
  const unidad = roca.unidad.trim();
  const meta = formatearNumero(roca.meta);

  // Sin punto de partida no hay recorrido que mostrar, solo el destino. Es el caso de las rocas
  // anteriores a la columna `linea_base` (V43) y el de una meta ascendente que arranca en cero.
  if (roca.lineaBase === null) return `${meta} ${unidad}`;

  return `${formatearNumero(roca.lineaBase)} → ${meta} ${unidad}`;
}

/**
 * Separador de miles: un espacio duro (U+00A0), no una coma ni un punto.
 *
 * **Por qué un espacio y no lo de siempre.** Esta app ya trata la coma como separador DECIMAL: el
 * Mapa acepta "78,5 kg" y lo normaliza con `.replace(',', '.')`. Si la cifra mostrara "15,000",
 * alguien que escribe así leería quince, no quince mil. El punto tiene el problema espejo. El
 * espacio no es ambiguo con ninguna de las dos convenciones y además es lo que recomienda la RAE.
 *
 * Duro (` `) y no un espacio normal para que el número nunca se parta en dos renglones.
 */
const SEPARADOR_MILES = ' ';

/**
 * Sin decimales cuando el número es entero: `78.00` viene así del backend (es un `BigDecimal` con
 * la escala de la columna) y "78 kg" se lee mejor que "78.00 kg". Los decimales de verdad se
 * conservan —hay quien mide 78,5 kg— y se recortan a dos, que es la escala de la columna.
 *
 * Los miles se agrupan a mano y no con `toLocaleString`: en Android el motor de JS se compila sin
 * los datos de ICU completos, así que el resultado depende del dispositivo — el mismo objetivo se
 * vería distinto en dos teléfonos.
 *
 * Exportada para `objetivoMensual.ts`, que escribe la cifra del mes justo debajo de la de 90 días:
 * dos números del mismo objetivo con distinto separador de miles se leen como dos datos distintos.
 */
export function formatearNumero(valor: number): string {
  const redondeado = Number.isInteger(valor) ? valor : Number(valor.toFixed(2));
  const [entera, decimal] = String(Math.abs(redondeado)).split('.');
  const signo = redondeado < 0 ? '-' : '';
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARADOR_MILES);
  return decimal ? `${signo}${conMiles}.${decimal}` : `${signo}${conMiles}`;
}

/**
 * La cifra de Relaciones: `"5/10 → 8/10"`.
 *
 * Su objetivo se mide en una escala de 1 a 10 y por eso viaja a la Roca Maestra SIN meta
 * cuantitativa — un puntaje no es una unidad de negocio. Sus dos números viven en las respuestas
 * del Mapa (`map_relations_baseline_scale` / `_target_scale`), que es de donde salen acá.
 *
 * `null` mientras no estén las dos puntas: media escala no dice nada. Es el caso de quien recorrió
 * el Mapa antes del 2026-09-14, cuando esos números todavía no salían del teléfono.
 */
export function cifraDeEscala(base: number | null, meta: number | null): string | null {
  if (base === null || meta === null || !Number.isFinite(base) || !Number.isFinite(meta)) return null;
  return `${base}/10 → ${meta}/10`;
}

/**
 * La primera cláusula de una meta redactada, sin el resto.
 *
 * **Para qué.** La redacción SMART encadena cuatro cosas con comas: "Al Día 90 mi conexión con
 * pareja pasará de 5/10 a 8/10, una conversación sin pantallas cada noche, con evidencia en la
 * agenda, porque no quiero llegar al día 90 igual". En una tarjeta entra la primera y el resto se
 * corta con puntos suspensivos justo donde deja de entenderse. Quedarse con la primera cláusula da
 * una línea completa en vez de un párrafo mutilado.
 *
 * Se corta en la primera coma y no en un largo fijo: el largo corta a mitad de palabra, la coma
 * corta donde la frase ya dijo algo. Si no hay coma, se devuelve tal cual y que la tarjeta la
 * recorte — no hay nada mejor que hacer con un texto que la persona escribió de una sola tirada.
 */
export function primeraClausula(texto: string): string {
  const limpio = texto.trim();
  const coma = limpio.indexOf(',');
  return coma > 0 ? limpio.slice(0, coma) : limpio;
}
