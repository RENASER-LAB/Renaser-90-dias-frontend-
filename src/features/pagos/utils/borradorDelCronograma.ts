import { montoDeTexto, sumarMontos, type Moneda } from './dinero';
import { aDdMmAaaa, ddMmAaaaAIso, isoADdMmAaaa, partirDdMmAaaa, sumarMeses } from './fechasDePago';

/**
 * Lo que Administración arma al aceptar a alguien o al ajustar su cronograma desde la ficha (spec 032): la moneda y las cuotas, con la fecha y el
 * monto como se escriben. Todo puro: el servidor valida de nuevo, la app solo evita mandar lo que sabe que no sirve y dice qué falta.
 */

/** Los topes del servidor (`CronogramaDePagos.MAXIMO_DE_CUOTAS`). */
export const MAXIMO_DE_CUOTAS = 60;

/** Una fila del borrador: la fecha como `DD/MM/AAAA` (lo que guarda el campo de fecha de la app) o vacía, y el monto como se escribió. */
export type FilaDeCuota = { clave: string; fecha: string; monto: string };

/**
 * Cómo paga la persona. `modo: null` = Administración todavía no eligió (un aprendiz tiene que elegirlo: «pagó completo» no se anota por
 * descuido); `'sin'` = «Sin cronograma (pagó completo)»; `'con'` = «Con cronograma».
 */
export type BorradorDePago = { modo: 'sin' | 'con' | null; moneda: Moneda | null; filas: FilaDeCuota[] };

let contador = 0;
/** Una clave estable para la fila (la lista se reordena y se quitan filas: el índice no sirve de clave). */
export function claveDeFila(): string {
  contador += 1;
  return `cuota-${contador}`;
}

export function filaVacia(): FilaDeCuota {
  return { clave: claveDeFila(), fecha: '', monto: '' };
}

/** Un aprendiz parte sin elegir; el personal, con «Sin cronograma» (decisión del dueño del 2026-11-01). */
export function pagoInicial(esPersonal: boolean): BorradorDePago {
  return { modo: esPersonal ? 'sin' : null, moneda: null, filas: [] };
}

export type MontoDeFila = { fila: FilaDeCuota; fechaIso: string | null; monto: number | null };

export function leerFilas(filas: readonly FilaDeCuota[]): MontoDeFila[] {
  return filas.map(fila => ({ fila, fechaIso: ddMmAaaaAIso(fila.fecha), monto: montoDeTexto(fila.monto) }));
}

/** Lo que falta o está mal del cronograma, en una frase; `null` si se puede mandar. Solo mira «con cronograma». */
export function problemaDelBorrador(pago: BorradorDePago): string | null {
  if (pago.modo === null) return 'Elige cómo paga: sin cronograma o con cronograma.';
  if (pago.modo === 'sin') return null;
  if (pago.moneda === null) return 'Elige la moneda del cronograma.';
  if (pago.filas.length === 0) return 'Agrega al menos una cuota.';
  if (pago.filas.length > MAXIMO_DE_CUOTAS) return `Un cronograma lleva hasta ${MAXIMO_DE_CUOTAS} cuotas.`;
  const filas = leerFilas(pago.filas);
  if (filas.some(f => f.fechaIso === null)) return 'Cada cuota necesita su fecha.';
  if (filas.some(f => f.monto === null)) return 'Cada cuota necesita un monto mayor que cero, con hasta dos decimales.';
  return null;
}

/** El total de las cuotas que ya tienen monto válido. */
export function totalDelBorrador(pago: BorradorDePago): number {
  return sumarMontos(leerFilas(pago.filas).flatMap(f => (f.monto === null ? [] : [f.monto])));
}

/** El cuerpo de `payment` (acepta y ficha): `NONE` o `SCHEDULE` con sus cuotas. `null` si todavía no se puede mandar. */
export type PagoParaElPedido =
  | { mode: 'NONE' }
  | { mode: 'SCHEDULE'; currency: Moneda; installments: Array<{ dueDate: string; amount: number }> };

export function paraElPedido(pago: BorradorDePago): PagoParaElPedido | null {
  if (problemaDelBorrador(pago) !== null) return null;
  if (pago.modo === 'sin') return { mode: 'NONE' };
  const moneda = pago.moneda;
  if (moneda === null) return null;
  const cuotas = leerFilas(pago.filas).flatMap(f => (f.fechaIso !== null && f.monto !== null ? [{ dueDate: f.fechaIso, amount: f.monto }] : []));
  return { mode: 'SCHEDULE', currency: moneda, installments: cuotas };
}

/** «1 cuota», «3 cuotas»: el resumen corto de un cronograma. */
export function cantidadDeCuotasEnPalabras(cantidad: number): string {
  return cantidad === 1 ? '1 cuota' : `${cantidad} cuotas`;
}

/**
 * El atajo «N cuotas mensuales de X desde tal fecha»: arma las filas, que después se editan una por una. La primera cae en `desde`; las demás, un mes
 * más tarde cada una, siempre contando desde `desde` (un 31 cae el último día de los meses cortos y vuelve al 31). Devuelve el motivo si no se puede.
 */
export function cuotasMensuales(entrada: { cantidad: string; monto: string; desde: string }): FilaDeCuota[] | { error: string } {
  const cantidad = Number(entrada.cantidad.trim());
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAXIMO_DE_CUOTAS) {
    return { error: `Escribe cuántas cuotas: de 1 a ${MAXIMO_DE_CUOTAS}.` };
  }
  if (montoDeTexto(entrada.monto) === null) return { error: 'Escribe el monto de cada cuota, mayor que cero y con hasta dos decimales.' };
  const inicio = partirDdMmAaaa(entrada.desde);
  if (!inicio) return { error: 'Elige la fecha de la primera cuota.' };
  return Array.from({ length: cantidad }, (_, i) => ({
    clave: claveDeFila(),
    fecha: aDdMmAaaa(sumarMeses(inicio, i)),
    monto: entrada.monto.trim(),
  }));
}

/** Quita las filas que no tienen nada escrito (el atajo parte de una lista vacía y la persona puede haber dejado una sin llenar). */
export function sinFilasVacias(filas: readonly FilaDeCuota[]): FilaDeCuota[] {
  return filas.filter(f => f.fecha.trim() !== '' || f.monto.trim() !== '');
}

/** El borrador de un cronograma que ya existe, para reemplazarlo editando (la ficha de Administración): cada cuota vuelve a ser una fila. */
export function borradorDeUnCronograma(moneda: Moneda | null, cuotas: ReadonlyArray<{ venceEl: string; monto: number }>): BorradorDePago {
  return {
    modo: 'con',
    moneda,
    filas: cuotas.map(c => ({ clave: claveDeFila(), fecha: isoADdMmAaaa(c.venceEl), monto: String(c.monto) })),
  };
}

/** Una cuota suelta (agregar o editar una): lo que sale de sus dos campos, o el motivo si no se puede. */
export function cuotaDeSusCampos(fecha: string, monto: string): { dueDate: string; amount: number } | { error: string } {
  const dueDate = ddMmAaaaAIso(fecha);
  if (dueDate === null) return { error: 'Elige la fecha de la cuota.' };
  const amount = montoDeTexto(monto);
  if (amount === null) return { error: 'Escribe el monto: mayor que cero y con hasta dos decimales.' };
  return { dueDate, amount };
}
