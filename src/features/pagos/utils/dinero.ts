import { formatearNumero } from '../../objetivos/utils/cifraDelObjetivo';

/**
 * Dinero de un cronograma de pagos (spec 032). Una sola moneda por cronograma, sin valor por defecto: S/ o US$. Pura, sin React.
 *
 * El número se escribe como el resto de la app (`formatearNumero`: miles con espacio, «30 000») y, si tiene céntimos, siempre con dos
 * («1 000.50», nunca «1 000.5»). El símbolo va pegado al monto con un espacio duro: «S/ 1 000» no se parte en dos renglones.
 */
export type Moneda = 'PEN' | 'USD';

export const MONEDAS: readonly Moneda[] = ['PEN', 'USD'];

const SIMBOLO: Record<Moneda, string> = { PEN: 'S/', USD: 'US$' };
const ESPACIO_DURO = '\u00a0';

export function esMoneda(valor: unknown): valor is Moneda {
  return valor === 'PEN' || valor === 'USD';
}

/** «S/» o «US$»; vacío si la moneda no se conoce (un servidor que mandó otra no tumba la pantalla). */
export function simboloDeLaMoneda(moneda: string | null | undefined): string {
  return esMoneda(moneda) ? SIMBOLO[moneda] : '';
}

/** Cómo se dice la moneda para elegirla: «Soles (S/)» o «Dólares (US$)». */
export function nombreDeLaMoneda(moneda: Moneda): string {
  return moneda === 'PEN' ? 'Soles (S/)' : 'Dólares (US$)';
}

/** El número solo: «1 000», «1 000.50». */
export function formatearMonto(monto: number): string {
  if (!Number.isFinite(monto)) return '';
  if (Number.isInteger(monto)) return formatearNumero(monto);
  const [entera, decimales] = Math.abs(monto).toFixed(2).split('.');
  return `${monto < 0 ? '-' : ''}${formatearNumero(Number(entera))}.${decimales}`;
}

/** «S/ 1 000» o «US$ 1 000.50». Sin moneda conocida, solo el número. */
export function montoConMoneda(monto: number, moneda: string | null | undefined): string {
  const simbolo = simboloDeLaMoneda(moneda);
  const numero = formatearMonto(monto);
  return simbolo ? `${simbolo}${ESPACIO_DURO}${numero}` : numero;
}

/** El tope del servidor (`Cuota.MONTO_MAXIMO`): lo que pasa de ahí es un error de tipeo. */
export const MONTO_MAXIMO = 9_999_999.99;

/**
 * Lo que se escribe en el campo del monto, como número: «1000», «1 000», «250,5» y «250.50» valen; más de dos decimales, letras, negativos o
 * cero no. `null` si no se entiende. La coma o el punto son decimales (nunca miles): «1.000» se rechaza antes que leerse como uno.
 */
export function montoDeTexto(texto: string): number | null {
  const limpio = texto.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const valor = Number(limpio);
  return valor > 0 && valor <= MONTO_MAXIMO ? valor : null;
}

/** Suma exacta en céntimos: tres cuotas de 333.33 dan 999.99 y no 999.9899999999999. */
export function sumarMontos(montos: readonly number[]): number {
  return montos.reduce((total, monto) => total + Math.round(monto * 100), 0) / 100;
}
