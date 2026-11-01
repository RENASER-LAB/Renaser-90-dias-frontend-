import { describe, expect, it } from '@jest/globals';

import {
  borradorDeUnCronograma,
  cantidadDeCuotasEnPalabras,
  cuotaDeSusCampos,
  cuotasMensuales,
  filaVacia,
  MAXIMO_DE_CUOTAS,
  paraElPedido,
  pagoInicial,
  problemaDelBorrador,
  sinFilasVacias,
  totalDelBorrador,
  type BorradorDePago,
  type FilaDeCuota,
} from '../utils/borradorDelCronograma';

const fila = (fecha: string, monto: string): FilaDeCuota => ({ ...filaVacia(), fecha, monto });
const conCronograma = (moneda: BorradorDePago['moneda'], filas: FilaDeCuota[]): BorradorDePago => ({ modo: 'con', moneda, filas });

describe('de dónde parte el pago al aceptar', () => {
  it('el aprendiz sin elegir (no se anota «pagó completo» por descuido) y el personal con «Sin cronograma»', () => {
    expect(pagoInicial(false)).toEqual({ modo: null, moneda: null, filas: [] });
    expect(pagoInicial(true)).toEqual({ modo: 'sin', moneda: null, filas: [] });
  });
});

describe('qué falta para poder mandarlo', () => {
  it('sin elegir cómo paga, lo dice; «sin cronograma» no pide nada más', () => {
    expect(problemaDelBorrador({ modo: null, moneda: null, filas: [] })).toBe('Elige cómo paga: sin cronograma o con cronograma.');
    expect(problemaDelBorrador({ modo: 'sin', moneda: null, filas: [] })).toBeNull();
  });

  it('con cronograma: primero la moneda (no hay valor por defecto), después las cuotas, sus fechas y sus montos', () => {
    expect(problemaDelBorrador(conCronograma(null, []))).toBe('Elige la moneda del cronograma.');
    expect(problemaDelBorrador(conCronograma('PEN', []))).toBe('Agrega al menos una cuota.');
    expect(problemaDelBorrador(conCronograma('PEN', [fila('', '100')]))).toBe('Cada cuota necesita su fecha.');
    expect(problemaDelBorrador(conCronograma('PEN', [fila('15/11/2026', '')]))).toMatch(/monto mayor que cero/);
    expect(problemaDelBorrador(conCronograma('PEN', [fila('15/11/2026', '0')]))).toMatch(/monto mayor que cero/);
    expect(problemaDelBorrador(conCronograma('PEN', [fila('31/02/2026', '100')]))).toBe('Cada cuota necesita su fecha.');
    expect(problemaDelBorrador(conCronograma('PEN', [fila('15/11/2026', '100')]))).toBeNull();
  });

  it('hasta 60 cuotas', () => {
    const muchas = Array.from({ length: MAXIMO_DE_CUOTAS + 1 }, () => fila('15/11/2026', '10'));
    expect(problemaDelBorrador(conCronograma('USD', muchas))).toMatch(/hasta 60 cuotas/);
    expect(problemaDelBorrador(conCronograma('USD', muchas.slice(0, MAXIMO_DE_CUOTAS)))).toBeNull();
  });
});

describe('el cuerpo del pedido', () => {
  it('«sin cronograma» manda NONE; «con cronograma», la moneda y las cuotas con su fecha ISO y su monto', () => {
    expect(paraElPedido({ modo: 'sin', moneda: null, filas: [] })).toEqual({ mode: 'NONE' });
    expect(paraElPedido(conCronograma('USD', [fila('15/12/2026', '1 000'), fila('15/11/2026', '250,5')]))).toEqual({
      mode: 'SCHEDULE',
      currency: 'USD',
      installments: [
        { dueDate: '2026-12-15', amount: 1000 },
        { dueDate: '2026-11-15', amount: 250.5 },
      ],
    });
  });

  it('con algo que falta, no se puede mandar', () => {
    expect(paraElPedido({ modo: null, moneda: null, filas: [] })).toBeNull();
    expect(paraElPedido(conCronograma(null, [fila('15/11/2026', '10')]))).toBeNull();
    expect(paraElPedido(conCronograma('PEN', [fila('15/11/2026', 'diez')]))).toBeNull();
  });

  it('el total suma en céntimos y se salta las filas sin monto', () => {
    expect(totalDelBorrador(conCronograma('PEN', [fila('15/11/2026', '333.33'), fila('15/12/2026', '333.33'), fila('15/01/2027', '333.34'), fila('', '')]))).toBe(1000);
  });
});

describe('«N cuotas mensuales de X desde tal fecha»', () => {
  it('arma las filas: la primera en la fecha de partida y las demás un mes después cada una, con el monto de cada cuota', () => {
    const filas = cuotasMensuales({ cantidad: '3', monto: '1000', desde: '15/10/2026' });
    expect(Array.isArray(filas)).toBe(true);
    expect((filas as FilaDeCuota[]).map(f => f.fecha)).toEqual(['15/10/2026', '15/11/2026', '15/12/2026']);
    expect((filas as FilaDeCuota[]).map(f => f.monto)).toEqual(['1000', '1000', '1000']);
    expect(new Set((filas as FilaDeCuota[]).map(f => f.clave)).size).toBe(3);
  });

  it('un diplomado de un año: 12 cuotas que cruzan de año, y un día 31 que no se corre', () => {
    const doce = cuotasMensuales({ cantidad: '12', monto: '500', desde: '31/01/2026' }) as FilaDeCuota[];
    expect(doce).toHaveLength(12);
    expect(doce[1].fecha).toBe('28/02/2026');
    expect(doce[2].fecha).toBe('31/03/2026');
    expect(doce[11].fecha).toBe('31/12/2026');
    const cruza = cuotasMensuales({ cantidad: '4', monto: '500', desde: '15/11/2026' }) as FilaDeCuota[];
    expect(cruza.map(f => f.fecha)).toEqual(['15/11/2026', '15/12/2026', '15/01/2027', '15/02/2027']);
  });

  it('dice qué falta: cuántas, el monto o la fecha', () => {
    expect(cuotasMensuales({ cantidad: '', monto: '100', desde: '15/10/2026' })).toEqual({ error: expect.stringMatching(/cuántas cuotas/) });
    expect(cuotasMensuales({ cantidad: '0', monto: '100', desde: '15/10/2026' })).toEqual({ error: expect.stringMatching(/de 1 a 60/) });
    expect(cuotasMensuales({ cantidad: '61', monto: '100', desde: '15/10/2026' })).toEqual({ error: expect.stringMatching(/de 1 a 60/) });
    expect(cuotasMensuales({ cantidad: '2.5', monto: '100', desde: '15/10/2026' })).toEqual({ error: expect.stringMatching(/cuántas cuotas/) });
    expect(cuotasMensuales({ cantidad: '3', monto: 'mucho', desde: '15/10/2026' })).toEqual({ error: expect.stringMatching(/monto de cada cuota/) });
    expect(cuotasMensuales({ cantidad: '3', monto: '100', desde: '' })).toEqual({ error: expect.stringMatching(/fecha de la primera cuota/) });
  });

  it('quitar las filas en blanco antes de sumar las nuevas', () => {
    expect(sinFilasVacias([filaVacia(), fila('15/10/2026', ''), fila('', '10'), filaVacia()])).toHaveLength(2);
  });
});

describe('una cuota suelta y un cronograma que ya existe', () => {
  it('una cuota se arma de sus dos campos o dice qué falta', () => {
    expect(cuotaDeSusCampos('15/11/2026', '900,5')).toEqual({ dueDate: '2026-11-15', amount: 900.5 });
    expect(cuotaDeSusCampos('', '900')).toEqual({ error: 'Elige la fecha de la cuota.' });
    expect(cuotaDeSusCampos('15/11/2026', '')).toEqual({ error: expect.stringMatching(/Escribe el monto/) });
  });

  it('un cronograma guardado vuelve a ser un borrador editable, cuota por cuota', () => {
    const borrador = borradorDeUnCronograma('USD', [
      { venceEl: '2026-11-15', monto: 1000 },
      { venceEl: '2026-12-15', monto: 250.5 },
    ]);
    expect(borrador.modo).toBe('con');
    expect(borrador.moneda).toBe('USD');
    expect(borrador.filas.map(f => [f.fecha, f.monto])).toEqual([
      ['15/11/2026', '1000'],
      ['15/12/2026', '250.5'],
    ]);
    expect(paraElPedido(borrador)).toEqual({
      mode: 'SCHEDULE',
      currency: 'USD',
      installments: [
        { dueDate: '2026-11-15', amount: 1000 },
        { dueDate: '2026-12-15', amount: 250.5 },
      ],
    });
  });

  it('cuántas cuotas, en palabras', () => {
    expect(cantidadDeCuotasEnPalabras(1)).toBe('1 cuota');
    expect(cantidadDeCuotasEnPalabras(12)).toBe('12 cuotas');
  });
});
