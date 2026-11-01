import { beforeEach, describe, expect, it } from '@jest/globals';

import type { OpcionDeRol } from '../../api/adminApi';
import type { OpcionesDeAceptacionApi } from '../../api/adminSchemas';
import { filaVacia } from '../../../pagos/utils/borradorDelCronograma';
import {
  alElegirPago,
  alElegirRol,
  borradorInicial,
  eleccionParaElPedido,
  frase,
  laUltimaEleccion,
  loQueFalta,
  modoDeFormacionDelRol,
  olvidarLaUltima,
  pagoParaElPedido,
  recordarLaUltima,
  valorDelPago,
  type BorradorDeAceptacion,
} from '../aceptarSolicitud';
import { OPCIONES_BASE } from '../rolesAsignables';

/**
 * El bloque «Pago» de la hoja «Aceptar» (spec 032, decisión del dueño del 2026-11-01): «Sin cronograma (pagó completo)» o «Con cronograma» para cualquier
 * rol; para el personal viene «Sin cronograma» y **no anota nada**; el aprendiz tiene que elegirlo. Solo se ofrece si el servidor lo dice
 * (`paymentScheduleAvailable`): contra un backend anterior la hoja queda como era.
 */

const OPCIONES: OpcionesDeAceptacionApi = {
  formations: [{ code: 'ESCUELA', name: 'Escuela Renaser', durationsDays: [90], durationLabels: ['90 días'], defaultDurationDays: 90, termsPublished: true }],
  diagnosisAvailable: true,
  paymentScheduleAvailable: true,
};
const SIN_PAGOS: OpcionesDeAceptacionApi = { ...OPCIONES, paymentScheduleAvailable: false };
const rol = (clave: string): OpcionDeRol => OPCIONES_BASE.find(o => o.clave === clave) as OpcionDeRol;
const conFilas = (b: BorradorDeAceptacion, moneda: 'PEN' | 'USD', filas: Array<[string, string]>): BorradorDeAceptacion =>
  alElegirPago(b, { modo: 'con', moneda, filas: filas.map(([fecha, monto]) => ({ ...filaVacia(), fecha, monto })) });

beforeEach(() => olvidarLaUltima());

describe('de dónde parte el pago', () => {
  it('el aprendiz sin elegir: no se anota «pagó completo» por descuido, y la hoja lo pide', () => {
    const b = borradorInicial(OPCIONES);
    expect(b.pago.modo).toBeNull();
    expect(loQueFalta(b, 'una', OPCIONES)).toBe('Elige cómo paga: sin cronograma o con cronograma.');
    expect(valorDelPago(b)).toBe('Sin elegir');
  });

  it('el personal con «Sin cronograma» desde que se elige su rol, sin que haga falta tocar nada', () => {
    for (const clave of ['MENTOR', 'TRAINEE_GUIDE', 'MENTOR_LEAD', 'ADMIN', 'ALCHEMIST']) {
      const b = alElegirRol(borradorInicial(OPCIONES), rol(clave), OPCIONES, 'TRAINEE');
      expect(b.pago.modo).toBe('sin');
      expect(loQueFalta(b, modoDeFormacionDelRol(rol(clave).rolBase), OPCIONES)).toBeNull();
    }
  });

  it('volver de personal a aprendiz re-pregunta si «Sin cronograma» venía puesto por el rol; lo que ya armó no se pierde', () => {
    const mentor = alElegirRol(borradorInicial(OPCIONES), rol('MENTOR'), OPCIONES, 'TRAINEE');
    expect(alElegirRol(mentor, rol('TRAINEE'), OPCIONES, 'MENTOR').pago.modo).toBeNull();

    const conCuotas = conFilas(alElegirRol(borradorInicial(OPCIONES), rol('MENTOR'), OPCIONES, 'TRAINEE'), 'USD', [['15/11/2026', '1000']]);
    const aprendiz = alElegirRol(conCuotas, rol('TRAINEE'), OPCIONES, 'MENTOR');
    expect(aprendiz.pago.modo).toBe('con');
    expect(aprendiz.pago.filas).toHaveLength(1);
  });

  it('contra un backend anterior (sin `paymentScheduleAvailable`) la hoja no pide nada del pago ni lo manda', () => {
    const b = borradorInicial(SIN_PAGOS);
    expect(loQueFalta(b, 'una', SIN_PAGOS)).toBeNull();
    expect(pagoParaElPedido(b, 'TRAINEE', SIN_PAGOS)).toBeNull();
    expect(eleccionParaElPedido(b, SIN_PAGOS, 'TRAINEE')?.pago).toBeNull();
    expect(pagoParaElPedido(conFilas(b, 'PEN', [['15/11/2026', '10']]), 'TRAINEE', { ...SIN_PAGOS, paymentScheduleAvailable: undefined })).toBeNull();
  });
});

describe('qué falta del cronograma', () => {
  it('con cronograma, la moneda y al menos una cuota completa', () => {
    const b = alElegirPago(borradorInicial(OPCIONES), { modo: 'con', moneda: null, filas: [] });
    expect(loQueFalta(b, 'una', OPCIONES)).toBe('Elige la moneda del cronograma.');
    expect(loQueFalta(alElegirPago(b, { ...b.pago, moneda: 'PEN' }), 'una', OPCIONES)).toBe('Agrega al menos una cuota.');
    expect(loQueFalta(conFilas(b, 'PEN', [['', '10']]), 'una', OPCIONES)).toBe('Cada cuota necesita su fecha.');
    expect(loQueFalta(conFilas(b, 'PEN', [['15/11/2026', '10']]), 'una', OPCIONES)).toBeNull();
  });

  it('lo de antes (formación, duración) sigue mandando primero', () => {
    expect(loQueFalta({ ...borradorInicial(OPCIONES), formaciones: [] }, 'una', OPCIONES)).toBe('Elige la formación.');
  });
});

describe('lo que se manda', () => {
  it('el aprendiz «sin cronograma» manda NONE: pagó completo', () => {
    const b = alElegirPago(borradorInicial(OPCIONES), { modo: 'sin', moneda: null, filas: [] });
    expect(pagoParaElPedido(b, 'TRAINEE', OPCIONES)).toEqual({ mode: 'NONE' });
    expect(eleccionParaElPedido(b, OPCIONES, 'TRAINEE')?.pago).toEqual({ mode: 'NONE' });
  });

  it('el personal «sin cronograma» (lo que viene puesto) no manda nada: no verá «Tu pago fue cancelado» por algo que no pagó', () => {
    for (const rolBase of ['MENTOR', 'TRAINEE_GUIDE', 'MENTOR_LEAD', 'ADMIN', 'ALCHEMIST']) {
      const b = alElegirRol(borradorInicial(OPCIONES), rol(rolBase), OPCIONES, 'TRAINEE');
      expect(pagoParaElPedido(b, rolBase, OPCIONES)).toBeNull();
    }
  });

  it('con cronograma manda la moneda y las cuotas, también para el personal («vale para cualquier rol»)', () => {
    const cuerpo = { mode: 'SCHEDULE', currency: 'USD', installments: [{ dueDate: '2026-11-15', amount: 1000 }, { dueDate: '2026-12-15', amount: 1000 }] };
    const aprendiz = conFilas(borradorInicial(OPCIONES), 'USD', [['15/11/2026', '1000'], ['15/12/2026', '1000']]);
    expect(pagoParaElPedido(aprendiz, 'TRAINEE', OPCIONES)).toEqual(cuerpo);
    expect(pagoParaElPedido(aprendiz, 'MENTOR', OPCIONES)).toEqual(cuerpo);
  });

  it('sin elegir, o con el cronograma a medias, no se manda nada', () => {
    expect(pagoParaElPedido(borradorInicial(OPCIONES), 'TRAINEE', OPCIONES)).toBeNull();
    expect(pagoParaElPedido(conFilas(borradorInicial(OPCIONES), 'USD', [['', '1000']]), 'TRAINEE', OPCIONES)).toBeNull();
  });
});

describe('lo que dice el bloque y la frase del resumen', () => {
  it('el bloque cerrado dice cómo paga, con las cuotas y el total', () => {
    expect(valorDelPago(alElegirPago(borradorInicial(OPCIONES), { modo: 'sin', moneda: null, filas: [] }))).toBe('Sin cronograma');
    expect(valorDelPago(alElegirPago(borradorInicial(OPCIONES), { modo: 'con', moneda: null, filas: [] }))).toBe('Con cronograma');
    const tres = conFilas(borradorInicial(OPCIONES), 'USD', [['15/11/2026', '1000'], ['15/12/2026', '1000'], ['15/01/2027', '1000']]);
    expect(valorDelPago(tres)).toBe('Con cronograma · 3 cuotas · US$ 3 000');
  });

  it('la frase suma el pago: «y con cronograma de 3 cuotas» o «y pagó completo»; y calla si el servidor no lo ofrece o aún no se eligió', () => {
    const tres = conFilas(borradorInicial(OPCIONES), 'USD', [['15/11/2026', '1000'], ['15/12/2026', '1000'], ['15/01/2027', '1000']]);
    expect(frase('María', false, tres, rol('TRAINEE'), OPCIONES)).toBe('María entrará a la Escuela Renaser como Aprendiz, sin diagnóstico y con cronograma de 3 cuotas.');
    const completo = alElegirPago(borradorInicial(OPCIONES), { modo: 'sin', moneda: null, filas: [] });
    expect(frase('María', false, completo, rol('TRAINEE'), OPCIONES)).toBe('María entrará a la Escuela Renaser como Aprendiz, sin diagnóstico y pagó completo.');
    expect(frase('María', false, borradorInicial(OPCIONES), rol('TRAINEE'), OPCIONES)).toBe('María entrará a la Escuela Renaser como Aprendiz, sin diagnóstico.');
    expect(frase('María', false, tres, rol('TRAINEE'), SIN_PAGOS)).toBe('María entrará a la Escuela Renaser como Aprendiz, sin diagnóstico.');
  });

  it('del personal con «Sin cronograma» la frase no dice nada del pago (no se anota); con cronograma sí', () => {
    const mentor = alElegirRol(borradorInicial(OPCIONES), rol('MENTOR'), OPCIONES, 'TRAINEE');
    expect(frase('Luis', false, mentor, rol('MENTOR'), OPCIONES)).not.toMatch(/pag/);
    expect(frase('Luis', false, conFilas(mentor, 'PEN', [['15/11/2026', '500']]), rol('MENTOR'), OPCIONES)).toMatch(/y con cronograma de 1 cuota\.$/);
    const admin = alElegirRol(borradorInicial(OPCIONES), rol('ADMIN'), OPCIONES, 'TRAINEE');
    expect(frase('Ana', false, conFilas(admin, 'PEN', [['15/11/2026', '500']]), rol('ADMIN'), OPCIONES)).toBe('Ana entrará como Administrador y ve las tres formaciones, sin diagnóstico y con cronograma de 1 cuota.');
  });
});

describe('«La misma que la última»', () => {
  it('recuerda también el cronograma, y una copia: cambiar lo recordado no toca lo que se está editando', () => {
    const b = conFilas(borradorInicial(OPCIONES), 'USD', [['15/11/2026', '1000']]);
    recordarLaUltima(b);
    const copia = laUltimaEleccion();
    expect(copia?.pago.filas).toHaveLength(1);
    expect(copia?.pago.moneda).toBe('USD');
    copia!.pago.filas[0].monto = '999';
    expect(laUltimaEleccion()?.pago.filas[0].monto).toBe('1000');
    expect(b.pago.filas[0].monto).toBe('1000');
  });
});
