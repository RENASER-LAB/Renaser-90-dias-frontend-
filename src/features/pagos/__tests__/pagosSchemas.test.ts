import { describe, expect, it } from '@jest/globals';

import { leerMiIngreso, leerPagosEnLaFicha } from '../api/pagosSchemas';

const cuota = (extra: Record<string, unknown> = {}) => ({
  id: 'c1', dueDate: '2026-11-15', amount: 1000, status: 'PENDING', statusChangedAt: null, statusChangedByName: null, ...extra,
});

describe('Mi ingreso, tal como llega del servidor', () => {
  it('lee los pasos, el cronograma con su moneda, las cuotas y la confirmación', () => {
    const ingreso = leerMiIngreso({
      steps: [{ key: 'AGREEMENT', done: true }, { key: 'PAYMENTS', done: false }],
      payments: {
        mode: 'SCHEDULE', currency: 'USD',
        installments: [cuota({ status: 'PAID', statusChangedAt: '2026-11-03T15:00:00Z' }), cuota({ id: 'c2', amount: '1250.50' })],
        confirmation: { state: 'CONFIRMED', confirmedAt: '2026-11-03T15:00:00Z', name: 'Beto' },
      },
    });

    expect(ingreso?.pasos).toEqual([{ clave: 'ACUERDO', hecho: true }, { clave: 'PAGOS', hecho: false }]);
    expect(ingreso?.pagos).toEqual({
      modo: 'CON_CRONOGRAMA',
      moneda: 'USD',
      cuotas: [
        { id: 'c1', venceEl: '2026-11-15', monto: 1000, pagada: true, marcadaEn: '2026-11-03T15:00:00Z', marcadaPor: null },
        { id: 'c2', venceEl: '2026-11-15', monto: 1250.5, pagada: false, marcadaEn: null, marcadaPor: null },
      ],
      confirmacion: { estado: 'CONFIRMADA', confirmadaEn: '2026-11-03T15:00:00Z', nombre: 'Beto' },
    });
  });

  it('«sin cronograma» llega sin cuotas, sin moneda y sin confirmación', () => {
    const ingreso = leerMiIngreso({ steps: [{ key: 'PAYMENTS', done: true }], payments: { mode: 'NONE', currency: null, installments: [], confirmation: null } });
    expect(ingreso?.pagos).toEqual({ modo: 'SIN_CRONOGRAMA', moneda: null, cuotas: [], confirmacion: null });
  });

  it('sin nada anotado, el pago es nulo: la fila de Yo no se dibuja', () => {
    expect(leerMiIngreso({ steps: [], payments: null })?.pagos).toBeNull();
    expect(leerMiIngreso({ steps: [] })?.pagos).toBeNull();
  });

  it('una modalidad que la app no conoce se lee como «nada que mostrar», no como un cronograma inventado', () => {
    expect(leerMiIngreso({ steps: [], payments: { mode: 'TRIMESTRAL', installments: [cuota()] } })?.pagos).toBeNull();
  });

  it('un paso con una clave que no conoce no se dibuja; un `done` que falta es «no hecho»', () => {
    const ingreso = leerMiIngreso({ steps: [{ key: 'SORPRESA', done: true }, { key: 'DIAGNOSIS' }, { key: 'AGREEMENT', done: true }], payments: null });
    expect(ingreso?.pasos).toEqual([{ clave: 'DIAGNOSTICO', hecho: false }, { clave: 'ACUERDO', hecho: true }]);
  });

  it('una cuota rota (sin id, sin monto, con un monto que no es número) se pierde ELLA, no la lista', () => {
    const ingreso = leerMiIngreso({
      steps: [],
      payments: {
        mode: 'SCHEDULE', currency: 'PEN',
        installments: [cuota(), { dueDate: '2026-12-15', amount: 10 }, cuota({ id: 'c3', amount: 'mucho' }), 'basura', null, cuota({ id: 'c4', dueDate: '2026-12-15' })],
        confirmation: { state: 'NOT_YET' },
      },
    });
    expect(ingreso?.pagos?.modo === 'CON_CRONOGRAMA' && ingreso.pagos.cuotas.map(c => c.id)).toEqual(['c1', 'c4']);
  });

  it('un estado de cuota o de confirmación desconocido se lee del lado seguro: pendiente y sin confirmar', () => {
    const ingreso = leerMiIngreso({
      steps: [],
      payments: { mode: 'SCHEDULE', currency: 'PEN', installments: [cuota({ status: 'EN_REVISION' })], confirmation: { state: 'QUIZAS' } },
    });
    const pagos = ingreso?.pagos;
    expect(pagos?.modo === 'CON_CRONOGRAMA' && pagos.cuotas[0].pagada).toBe(false);
    expect(pagos?.modo === 'CON_CRONOGRAMA' && pagos.confirmacion.estado).toBe('SIN_CONFIRMAR');
  });

  it('una moneda desconocida no tumba la lista: queda sin moneda', () => {
    const ingreso = leerMiIngreso({ steps: [], payments: { mode: 'SCHEDULE', currency: 'EUR', installments: [cuota()] } });
    expect(ingreso?.pagos?.modo === 'CON_CRONOGRAMA' && ingreso.pagos.moneda).toBeNull();
  });

  it('un campo nuevo del servidor no rompe nada', () => {
    expect(leerMiIngreso({ steps: [], payments: null, mañana: 'algo' })).not.toBeNull();
  });

  it('una respuesta que no es un objeto no se entiende: nunca se inventa algo', () => {
    expect(leerMiIngreso(null)).toBeNull();
    expect(leerMiIngreso('hola')).toBeNull();
  });
});

describe('los pagos en la ficha de Administración', () => {
  it('trae el nombre de la persona y, por cuota, quién la marcó', () => {
    const ficha = leerPagosEnLaFicha({
      personName: 'Ana Quispe',
      payments: { mode: 'SCHEDULE', currency: 'PEN', installments: [cuota({ status: 'PAID', statusChangedAt: '2026-11-03T15:00:00Z', statusChangedByName: 'Ana Admin' })], confirmation: { state: 'OUTDATED', confirmedAt: '2026-11-01T10:00:00Z', name: 'Ana' } },
    });
    expect(ficha?.nombre).toBe('Ana Quispe');
    expect(ficha?.pagos?.modo === 'CON_CRONOGRAMA' && ficha.pagos.cuotas[0].marcadaPor).toBe('Ana Admin');
    expect(ficha?.pagos?.modo === 'CON_CRONOGRAMA' && ficha.pagos.confirmacion.estado).toBe('DESACTUALIZADA');
  });

  it('sin nada anotado, `pagos` es nulo y el nombre llega igual', () => {
    expect(leerPagosEnLaFicha({ personName: 'Ana', payments: null })).toEqual({ nombre: 'Ana', pagos: null });
    expect(leerPagosEnLaFicha({})).toEqual({ nombre: null, pagos: null });
  });
});
