import type { ClaveDePaso, CuotaDePago, MiIngreso, PagosDeLaPersona } from '../api/pagosSchemas';
import { montoConMoneda } from './dinero';
import { diaDeUnInstante, fechaCortaDePago, fechaEnPalabrasDePago, type FechaDePago } from './fechasDePago';

/**
 * Lo que dice y muestra Yo → «Mi ingreso» (spec 032, maqueta del dueño del 2026-11-01), sin React: se prueba suelto.
 *
 * Los textos son del dueño o de la maqueta (**«Tu pago fue cancelado»**, «Tus fechas de pago», «Revisa el cronograma acordado.», «Pagado»,
 * «Pendiente», «Revisé mis fechas y montos.», «Tu nombre», «Confirmar cronograma»). «Pendiente» no es un reproche: una cuota con la fecha pasada
 * se dice igual (nunca «atrasada»).
 */

export const TITULO_DE_PAGO_COMPLETO = 'Tu pago fue cancelado';
/** En el Perú «cancelado» es «pagado por completo»: una línea que lo dice para quien lo lee de otro modo. */
export const DETALLE_DE_PAGO_COMPLETO = 'No tienes cuotas por pagar.';
export const TITULO_DEL_CRONOGRAMA = 'Tus fechas de pago';
export const DETALLE_DEL_CRONOGRAMA = 'Revisa el cronograma acordado.';
export const TEXTO_DE_LA_CASILLA = 'Revisé mis fechas y montos.';
export const AVISO_DE_CAMBIO = 'Tu cronograma cambió. Revísalo y confírmalo de nuevo.';

export type EstadoDelPaso = 'hecho' | 'actual' | 'pendiente';

export type PasoVisible = { clave: ClaveDePaso; titulo: string; estado: EstadoDelPaso; etiqueta: string };

const TITULO_DE_PASO: Record<ClaveDePaso, string> = { DIAGNOSTICO: 'Diagnóstico', ACUERDO: 'Acuerdo', PAGOS: 'Pagos' };

/**
 * Los pasos de la cabecera: solo los que le aplican (un paso que no aplica —sin diagnóstico asignado— no llega y no se dibuja). El primero que no
 * está hecho es el «actual» (el aro de la maqueta); los demás, pendientes. Si todos están hechos, ninguno es el actual.
 */
export function pasosVisibles(ingreso: MiIngreso): PasoVisible[] {
  const primerPendiente = ingreso.pasos.findIndex(p => !p.hecho);
  return ingreso.pasos.map((paso, i) => {
    const estado: EstadoDelPaso = paso.hecho ? 'hecho' : i === primerPendiente ? 'actual' : 'pendiente';
    const titulo = TITULO_DE_PASO[paso.clave];
    const palabra = estado === 'hecho' ? 'hecho' : estado === 'actual' ? 'en curso' : 'pendiente';
    return { clave: paso.clave, titulo, estado, etiqueta: `${titulo}, ${palabra}` };
  });
}

export type CuotaVisible = {
  id: string;
  fecha: string;
  monto: string;
  pagada: boolean;
  /** «Pagado» o «Pendiente». */
  estado: string;
  /** Para el lector de pantalla: «15 de noviembre de 2026, US$ 1 000, pagado». */
  etiqueta: string;
};

export function cuotaVisible(cuota: CuotaDePago, moneda: string | null, hoy: FechaDePago): CuotaVisible {
  const monto = montoConMoneda(cuota.monto, moneda);
  const estado = cuota.pagada ? 'Pagado' : 'Pendiente';
  return {
    id: cuota.id,
    fecha: fechaCortaDePago(cuota.venceEl, hoy),
    monto,
    pagada: cuota.pagada,
    estado,
    etiqueta: `${fechaEnPalabrasDePago(cuota.venceEl)}, ${monto}, ${estado.toLowerCase()}`,
  };
}

export type VistaDelPago =
  | { tipo: 'completo'; titulo: string; detalle: string }
  | {
      tipo: 'cronograma';
      titulo: string;
      detalle: string;
      cuotas: CuotaVisible[];
      /** Qué se le pide a la persona al pie: confirmar, volver a confirmar (cambió) o nada (ya confirmó, con lo que dice). */
      confirmacion:
        | { tipo: 'pedir'; aviso: string | null }
        | { tipo: 'confirmada'; texto: string };
    };

/** «Confirmaste tu cronograma el 3 de noviembre.» (con su nombre, si lo escribió). */
export function textoDeLaConfirmacion(confirmadaEn: string | null, nombre: string | null): string {
  const dia = diaDeUnInstante(confirmadaEn);
  const cuando = dia ? ` el ${dia}` : '';
  return nombre ? `Confirmaste tu cronograma${cuando}. Firmó: ${nombre}.` : `Confirmaste tu cronograma${cuando}.`;
}

export function vistaDelPago(pagos: PagosDeLaPersona, hoy: FechaDePago): VistaDelPago {
  if (pagos.modo === 'SIN_CRONOGRAMA') return { tipo: 'completo', titulo: TITULO_DE_PAGO_COMPLETO, detalle: DETALLE_DE_PAGO_COMPLETO };
  const { confirmacion } = pagos;
  return {
    tipo: 'cronograma',
    titulo: TITULO_DEL_CRONOGRAMA,
    detalle: DETALLE_DEL_CRONOGRAMA,
    cuotas: pagos.cuotas.map(c => cuotaVisible(c, pagos.moneda, hoy)),
    confirmacion:
      confirmacion.estado === 'CONFIRMADA'
        ? { tipo: 'confirmada', texto: textoDeLaConfirmacion(confirmacion.confirmadaEn, confirmacion.nombre) }
        : { tipo: 'pedir', aviso: confirmacion.estado === 'DESACTUALIZADA' ? AVISO_DE_CAMBIO : null },
  };
}

/** Lo que falta para poder tocar «Confirmar cronograma»; `null` si ya se puede. */
export function loQueFaltaParaConfirmar(revisado: boolean, nombre: string): string | null {
  if (!revisado) return 'Marca que revisaste tus fechas y montos.';
  const limpio = nombre.trim();
  if (limpio.length === 0) return 'Escribe tu nombre.';
  if (limpio.length > 120) return 'Tu nombre es muy largo: hasta 120 letras.';
  return null;
}

/** ¿Tiene cuotas pendientes? Para decir si hay algo que recordar. */
export function hayCuotasPendientes(pagos: PagosDeLaPersona | null): boolean {
  return pagos?.modo === 'CON_CRONOGRAMA' && pagos.cuotas.some(c => !c.pagada);
}

/** ¿La fila «Mi ingreso» de Yo se dibuja? Solo si el servidor dijo que hay un pago anotado. */
export function hayAlgoQueMostrar(ingreso: MiIngreso | null | undefined): boolean {
  return !!ingreso && ingreso.pagos !== null;
}

/** La línea de la fila de Yo: «Tu pago fue cancelado» o lo que sigue («2 cuotas pendientes»). */
export function detalleDeLaFila(ingreso: MiIngreso): string {
  const pagos = ingreso.pagos;
  if (!pagos) return '';
  if (pagos.modo === 'SIN_CRONOGRAMA') return TITULO_DE_PAGO_COMPLETO;
  const pendientes = pagos.cuotas.filter(c => !c.pagada).length;
  if (pendientes === 0) return 'Todas tus cuotas figuran pagadas';
  return pendientes === 1 ? '1 cuota pendiente' : `${pendientes} cuotas pendientes`;
}
