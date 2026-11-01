import { describe, expect, it } from '@jest/globals';

import type { MiIngreso, PagosDeLaPersona } from '../api/pagosSchemas';
import {
  AVISO_DE_CAMBIO,
  detalleDeLaFila,
  hayAlgoQueMostrar,
  hayCuotasPendientes,
  loQueFaltaParaConfirmar,
  pasosVisibles,
  textoDeLaConfirmacion,
  TITULO_DE_PAGO_COMPLETO,
  vistaDelPago,
} from '../utils/vistaDeMiIngreso';

const nb = (texto: string): string => texto.replace(/ /g, ' ');
const HOY = { dia: 3, mes: 11, anio: 2026 };

const cuota = (id: string, venceEl: string, pagada: boolean, monto = 1000) => ({ id, venceEl, monto, pagada, marcadaEn: null, marcadaPor: null });
const conCronograma = (cuotas: ReturnType<typeof cuota>[], confirmacion: Extract<PagosDeLaPersona, { modo: 'CON_CRONOGRAMA' }>['confirmacion'], moneda: 'PEN' | 'USD' = 'USD'): PagosDeLaPersona => ({
  modo: 'CON_CRONOGRAMA', moneda, cuotas, confirmacion,
});
const SIN_CONFIRMAR = { estado: 'SIN_CONFIRMAR', confirmadaEn: null, nombre: null } as const;

describe('los pasos de la cabecera', () => {
  it('el primero que no está hecho es el actual (el aro de la maqueta); los demás, pendientes', () => {
    const ingreso: MiIngreso = { pasos: [{ clave: 'DIAGNOSTICO', hecho: true }, { clave: 'ACUERDO', hecho: true }, { clave: 'PAGOS', hecho: false }], pagos: null };
    expect(pasosVisibles(ingreso).map(p => [p.titulo, p.estado])).toEqual([['Diagnóstico', 'hecho'], ['Acuerdo', 'hecho'], ['Pagos', 'actual']]);
    const sinHacer: MiIngreso = { pasos: [{ clave: 'ACUERDO', hecho: false }, { clave: 'PAGOS', hecho: false }], pagos: null };
    expect(pasosVisibles(sinHacer).map(p => p.estado)).toEqual(['actual', 'pendiente']);
  });

  it('un paso que no aplica (sin diagnóstico asignado) no llega y no se dibuja', () => {
    const ingreso: MiIngreso = { pasos: [{ clave: 'ACUERDO', hecho: true }, { clave: 'PAGOS', hecho: true }], pagos: null };
    expect(pasosVisibles(ingreso).map(p => p.titulo)).toEqual(['Acuerdo', 'Pagos']);
  });

  it('con todos hechos ninguno es el actual, y cada uno se lee con su estado en palabras', () => {
    const todos: MiIngreso = { pasos: [{ clave: 'ACUERDO', hecho: true }, { clave: 'PAGOS', hecho: true }], pagos: null };
    expect(pasosVisibles(todos).every(p => p.estado === 'hecho')).toBe(true);
    expect(pasosVisibles(todos)[0].etiqueta).toBe('Acuerdo, hecho');
    expect(pasosVisibles({ pasos: [{ clave: 'PAGOS', hecho: false }], pagos: null })[0].etiqueta).toBe('Pagos, en curso');
  });
});

describe('sin cronograma: «Tu pago fue cancelado»', () => {
  it('el título es el del dueño y una línea dice que no hay cuotas por pagar', () => {
    const vista = vistaDelPago({ modo: 'SIN_CRONOGRAMA', moneda: null, cuotas: [], confirmacion: null }, HOY);
    expect(vista).toEqual({ tipo: 'completo', titulo: 'Tu pago fue cancelado', detalle: 'No tienes cuotas por pagar.' });
    expect(TITULO_DE_PAGO_COMPLETO).toBe('Tu pago fue cancelado');
  });
});

describe('con cronograma: «Tus fechas de pago»', () => {
  it('el título y el subtítulo de la maqueta, y una fila por cuota con fecha corta, monto con su moneda y «Pagado» o «Pendiente»', () => {
    const vista = vistaDelPago(conCronograma([cuota('a', '2026-10-15', true), cuota('b', '2026-11-15', false), cuota('c', '2026-12-15', false)], SIN_CONFIRMAR), HOY);
    if (vista.tipo !== 'cronograma') throw new Error('debía ser un cronograma');
    expect(vista.titulo).toBe('Tus fechas de pago');
    expect(vista.detalle).toBe('Revisa el cronograma acordado.');
    expect(vista.cuotas.map(c => [c.fecha, c.monto, c.estado])).toEqual([
      ['15 oct', nb('US$ 1 000'), 'Pagado'],
      ['15 nov', nb('US$ 1 000'), 'Pendiente'],
      ['15 dic', nb('US$ 1 000'), 'Pendiente'],
    ]);
    expect(vista.cuotas[0].etiqueta).toBe(`15 de octubre de 2026, ${nb('US$ 1 000')}, pagado`);
  });

  it('una cuota pendiente con la fecha ya pasada se dice igual, «Pendiente»: sin «atrasada» ni reproche', () => {
    const vista = vistaDelPago(conCronograma([cuota('a', '2026-09-01', false)], SIN_CONFIRMAR), HOY);
    if (vista.tipo !== 'cronograma') throw new Error('debía ser un cronograma');
    expect(vista.cuotas[0].estado).toBe('Pendiente');
    expect(JSON.stringify(vista)).not.toMatch(/atrasad|vencid|mora|deuda/i);
  });

  it('las cuotas de otro año llevan el año', () => {
    const vista = vistaDelPago(conCronograma([cuota('a', '2027-01-15', false)], SIN_CONFIRMAR), HOY);
    expect(vista.tipo === 'cronograma' && vista.cuotas[0].fecha).toBe('15 ene 2027');
  });

  it('sin confirmar, se pide confirmar; si el cronograma cambió, también, con su aviso', () => {
    const pendiente = vistaDelPago(conCronograma([cuota('a', '2026-11-15', false)], SIN_CONFIRMAR), HOY);
    expect(pendiente.tipo === 'cronograma' && pendiente.confirmacion).toEqual({ tipo: 'pedir', aviso: null });
    const cambio = vistaDelPago(conCronograma([cuota('a', '2026-11-15', false)], { estado: 'DESACTUALIZADA', confirmadaEn: '2026-11-01T15:00:00Z', nombre: 'Beto' }), HOY);
    expect(cambio.tipo === 'cronograma' && cambio.confirmacion).toEqual({ tipo: 'pedir', aviso: AVISO_DE_CAMBIO });
    expect(AVISO_DE_CAMBIO).toBe('Tu cronograma cambió. Revísalo y confírmalo de nuevo.');
  });

  it('ya confirmado, dice cuándo y con qué nombre, y no vuelve a pedir nada', () => {
    const instante = new Date(2026, 10, 3, 12, 0).toISOString();
    const vista = vistaDelPago(conCronograma([cuota('a', '2026-11-15', false)], { estado: 'CONFIRMADA', confirmadaEn: instante, nombre: 'Beto Aprendiz' }), HOY);
    expect(vista.tipo === 'cronograma' && vista.confirmacion).toEqual({ tipo: 'confirmada', texto: 'Confirmaste tu cronograma el 3 de noviembre. Firmó: Beto Aprendiz.' });
    expect(textoDeLaConfirmacion(null, null)).toBe('Confirmaste tu cronograma.');
  });
});

describe('confirmar', () => {
  it('pide marcar la casilla y escribir el nombre, y no acepta uno de más de 120 letras', () => {
    expect(loQueFaltaParaConfirmar(false, 'Beto')).toBe('Marca que revisaste tus fechas y montos.');
    expect(loQueFaltaParaConfirmar(true, '   ')).toBe('Escribe tu nombre.');
    expect(loQueFaltaParaConfirmar(true, 'a'.repeat(121))).toMatch(/120/);
    expect(loQueFaltaParaConfirmar(true, ' Beto ')).toBeNull();
  });
});

describe('la fila de Yo', () => {
  it('se dibuja solo si el servidor dijo que hay un pago anotado', () => {
    expect(hayAlgoQueMostrar(null)).toBe(false);
    expect(hayAlgoQueMostrar({ pasos: [], pagos: null })).toBe(false);
    expect(hayAlgoQueMostrar({ pasos: [], pagos: { modo: 'SIN_CRONOGRAMA', moneda: null, cuotas: [], confirmacion: null } })).toBe(true);
  });

  it('dice en una línea cómo va: pagó completo, cuántas cuotas pendientes o que todas figuran pagadas', () => {
    const de = (pagos: PagosDeLaPersona): MiIngreso => ({ pasos: [], pagos });
    expect(detalleDeLaFila(de({ modo: 'SIN_CRONOGRAMA', moneda: null, cuotas: [], confirmacion: null }))).toBe('Tu pago fue cancelado');
    expect(detalleDeLaFila(de(conCronograma([cuota('a', '2026-11-15', false), cuota('b', '2026-12-15', false)], SIN_CONFIRMAR)))).toBe('2 cuotas pendientes');
    expect(detalleDeLaFila(de(conCronograma([cuota('a', '2026-11-15', true), cuota('b', '2026-12-15', false)], SIN_CONFIRMAR)))).toBe('1 cuota pendiente');
    expect(detalleDeLaFila(de(conCronograma([cuota('a', '2026-11-15', true)], SIN_CONFIRMAR)))).toBe('Todas tus cuotas figuran pagadas');
  });

  it('hay cuotas pendientes solo con cronograma y alguna sin pagar', () => {
    expect(hayCuotasPendientes(null)).toBe(false);
    expect(hayCuotasPendientes({ modo: 'SIN_CRONOGRAMA', moneda: null, cuotas: [], confirmacion: null })).toBe(false);
    expect(hayCuotasPendientes(conCronograma([cuota('a', '2026-11-15', true)], SIN_CONFIRMAR))).toBe(false);
    expect(hayCuotasPendientes(conCronograma([cuota('a', '2026-11-15', false)], SIN_CONFIRMAR))).toBe(true);
  });
});
