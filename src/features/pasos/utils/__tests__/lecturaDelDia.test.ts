/**
 * De lo que dice Health Connect a lo que se muestra y se manda (spec 037, D-310): los km del día, las fuentes que cuentan y las que no
 * se suman, y el cuerpo del pedido al servidor.
 */
import { describe, expect, it } from '@jest/globals';

import type { LecturaCrudaDelDia, RegistroDeSalud } from '../../types/pasos.types';
import { armarLaLectura, cuerpoParaElServidor, kilometrosDe, lecturaTieneDatos, ZANCADA_MEDIA_EN_METROS } from '../lecturaDelDia';

const TELEFONO = 'com.android.healthconnect.phone.abc123';
const RELOJ = 'com.sec.android.app.shealth';
const AHORA = new Date('2026-11-04T22:10:03Z');

const reg = (origen: string, metodo: number, extra: Partial<RegistroDeSalud> = {}): RegistroDeSalud => ({ origen, metodo, ...extra });
const cruda = (extra: Partial<LecturaCrudaDelDia>): LecturaCrudaDelDia => ({
  pasos: null,
  distanciaM: null,
  origenesUsados: [],
  registros: [],
  ...extra,
});

describe('kilometrosDe', () => {
  // spec 037 FR-006
  it('con distancia medida usa la distancia, sin «aprox.»', () => {
    expect(kilometrosDe(5400, 7120)).toEqual({ km: 5.4, aproximado: false });
  });

  // spec 037 FR-006
  it('sin distancia estima con los pasos y la zancada media, y lo dice «aprox.»', () => {
    expect(ZANCADA_MEDIA_EN_METROS).toBe(0.75);
    expect(kilometrosDe(null, 8000)).toEqual({ km: 6, aproximado: true });
    expect(kilometrosDe(0, 7120)).toEqual({ km: 5.34, aproximado: true });
  });

  it('sin nada son 0 km, no aproximados', () => {
    expect(kilometrosDe(null, null)).toEqual({ km: 0, aproximado: false });
    expect(kilometrosDe(0, 0)).toEqual({ km: 0, aproximado: false });
  });

  it('redondea a dos decimales, como el servidor', () => {
    expect(kilometrosDe(5404.4, null).km).toBe(5.4);
    expect(kilometrosDe(5405.6, null).km).toBe(5.41);
  });

  it('un número roto no cuenta', () => {
    expect(kilometrosDe(Number.NaN, 1000)).toEqual({ km: 0.75, aproximado: true });
    expect(kilometrosDe(-5, null)).toEqual({ km: 0, aproximado: false });
  });
});

describe('armarLaLectura', () => {
  it('con una sola fuente limpia: sus km, sus pasos y esa fuente', () => {
    const lectura = armarLaLectura(
      cruda({ pasos: 7120, distanciaM: 5400, origenesUsados: [TELEFONO], registros: [reg(TELEFONO, 2), reg(TELEFONO, 2)] }),
      AHORA,
    );
    expect(lectura.km).toBe(5.4);
    expect(lectura.pasos).toBe(7120);
    expect(lectura.aproximado).toBe(false);
    expect(lectura.fuentes.map(f => f.etiqueta)).toEqual(['Tu teléfono']);
    expect(lectura.noSumadas).toEqual([]);
    expect(lectura.hayManuales).toBe(false);
    expect(lectura.leidoEn).toBe(AHORA);
  });

  // spec 037 FR-005
  it('con dos fuentes a la vez: cuenta la que Health Connect usó y dice cuál no se suma', () => {
    const lectura = armarLaLectura(
      cruda({
        pasos: 7840,
        distanciaM: 5900,
        origenesUsados: [RELOJ],
        registros: [reg(RELOJ, 2, { tipoDeDispositivo: 1, modelo: 'Galaxy Watch' }), reg(TELEFONO, 2)],
      }),
      AHORA,
    );
    expect(lectura.fuentes.map(f => f.etiqueta)).toEqual(['Galaxy Watch']);
    expect(lectura.noSumadas.map(f => f.etiqueta)).toEqual(['Tu teléfono']);
  });

  it('lo escrito a mano no cuenta, aunque el agregado lo hubiera usado: se avisa que se descartó', () => {
    const lectura = armarLaLectura(
      cruda({ pasos: 20000, distanciaM: 15000, origenesUsados: ['com.mala.app', TELEFONO], registros: [reg('com.mala.app', 3), reg(TELEFONO, 2)] }),
      AHORA,
    );
    expect(lectura.fuentes.map(f => f.paquete)).toEqual([TELEFONO]);
    expect(lectura.hayManuales).toBe(true);
  });

  it('si todos los orígenes están sucios no hay fuente, y la lectura no trae datos aunque haya números', () => {
    const lectura = armarLaLectura(cruda({ registros: [reg('com.mala.app', 3)] }), AHORA);
    expect(lectura.fuentes).toEqual([]);
    expect(lectura.hayManuales).toBe(true);
    expect(lecturaTieneDatos(lectura)).toBe(false);
  });

  it('las fuentes salen con el reloj primero', () => {
    const lectura = armarLaLectura(
      cruda({
        pasos: 9000,
        distanciaM: 6000,
        origenesUsados: [TELEFONO, RELOJ],
        registros: [reg(TELEFONO, 2), reg(RELOJ, 2, { tipoDeDispositivo: 1, modelo: 'Galaxy Watch' })],
      }),
      AHORA,
    );
    expect(lectura.fuentes.map(f => f.dispositivo)).toEqual(['RELOJ', 'TELEFONO']);
  });
});

describe('lecturaTieneDatos', () => {
  it('hay datos con km o con pasos', () => {
    expect(lecturaTieneDatos(armarLaLectura(cruda({ pasos: 100 }), AHORA))).toBe(true);
    expect(lecturaTieneDatos(armarLaLectura(cruda({ distanciaM: 500 }), AHORA))).toBe(true);
    expect(lecturaTieneDatos(armarLaLectura(cruda({}), AHORA))).toBe(false);
  });
});

describe('cuerpoParaElServidor', () => {
  it('manda los km, los pasos, la fuente principal, su tipo y la hora de la lectura', () => {
    const lectura = armarLaLectura(
      cruda({
        pasos: 7840,
        distanciaM: 5900,
        origenesUsados: [RELOJ],
        registros: [reg(RELOJ, 2, { tipoDeDispositivo: 1, modelo: 'Galaxy Watch' })],
      }),
      AHORA,
    );
    expect(cuerpoParaElServidor(lectura)).toEqual({
      kilometros: 5.9,
      pasos: 7840,
      fuente: 'Galaxy Watch',
      dispositivo: 'RELOJ',
      leidoEn: '2026-11-04T22:10:03.000Z',
    });
  });

  it('sin pasos (un reloj con solo la distancia) no manda el campo', () => {
    const lectura = armarLaLectura(
      cruda({ distanciaM: 6000, origenesUsados: [RELOJ], registros: [reg(RELOJ, 2, { tipoDeDispositivo: 1, modelo: 'Reloj' })] }),
      AHORA,
    );
    expect(cuerpoParaElServidor(lectura)).not.toHaveProperty('pasos');
  });

  it('sin fuente o sin km no hay nada que mandar', () => {
    expect(cuerpoParaElServidor(armarLaLectura(cruda({}), AHORA))).toBeNull();
    expect(cuerpoParaElServidor(armarLaLectura(cruda({ pasos: 100, registros: [reg('com.mala.app', 3)] }), AHORA))).toBeNull();
  });

  it('la etiqueta se corta a los 60 caracteres que acepta el servidor', () => {
    const largo = 'M'.repeat(100);
    const lectura = armarLaLectura(
      cruda({ pasos: 8000, origenesUsados: ['p'], registros: [reg('p', 2, { tipoDeDispositivo: 1, modelo: largo })] }),
      AHORA,
    );
    expect(cuerpoParaElServidor(lectura)?.fuente).toHaveLength(60);
  });
});
