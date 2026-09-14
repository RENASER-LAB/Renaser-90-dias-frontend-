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
 */
function formatearNumero(valor: number): string {
  const redondeado = Number.isInteger(valor) ? valor : Number(valor.toFixed(2));
  const [entera, decimal] = String(Math.abs(redondeado)).split('.');
  const signo = redondeado < 0 ? '-' : '';
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARADOR_MILES);
  return decimal ? `${signo}${conMiles}.${decimal}` : `${signo}${conMiles}`;
}
