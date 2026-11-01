import { describe, expect, it } from '@jest/globals';

import type { AccionDelCierre, CierreDelDia } from '../../types/cierre.types';
import { horaDeUnInstante, lineaDeManana, textosDeLaTarjeta } from '../tarjetaDelCierre';

const accion = (id: string, titulo: string, manana: string | null, extra: Partial<AccionDelCierre> = {}): AccionDelCierre => ({
  id,
  titulo,
  horaInicio: null,
  cumplida: false,
  cumplidaEn: null,
  cierre: manana ? { motivo: 'SIN_TIEMPO', manana, nota: null } : null,
  ...extra,
});
const cierre = (acciones: AccionDelCierre[], extra: Partial<CierreDelDia> = {}): CierreDelDia => ({
  fecha: '2026-10-29',
  estado: 'CERRADO',
  cerradoEn: '2026-10-29T22:02:00',
  nota: null,
  acciones,
  puedeCerrar: true,
  semana: null,
  ...extra,
});

describe('lo que dijo para mañana, en una línea', () => {
  it('«Mañana: «Revisar las facturas» a otra hora»', () => {
    expect(lineaDeManana(cierre([accion('b', 'Revisar las facturas', 'OTRA_HORA')]))).toBe('Mañana: «Revisar las facturas» a otra hora');
  });

  it('cada plan se dice en una frase corta', () => {
    const frase = (plan: string) => lineaDeManana(cierre([accion('b', 'X', plan)]));
    expect(frase('MAS_CORTA')).toBe('Mañana: «X» más corta');
    expect(frase('PEDIR_AYUDA')).toBe('Mañana: «X» con ayuda');
    expect(frase('DEJARLA')).toBe('Mañana: «X» la dejas');
  });

  it('con varias, la primera y cuántas más', () => {
    expect(lineaDeManana(cierre([accion('b', 'A', 'OTRA_HORA'), accion('c', 'B', 'DEJARLA'), accion('d', 'C', 'MAS_CORTA')]))).toBe(
      'Mañana: «A» a otra hora y 2 más',
    );
  });

  it('lo cumplido no entra, ni una respuesta que no se entiende; sin nada, null', () => {
    expect(lineaDeManana(cierre([accion('a', 'Hecha', 'OTRA_HORA', { cumplida: true })]))).toBeNull();
    expect(lineaDeManana(cierre([accion('b', 'X', 'NUEVO')]))).toBeNull();
    expect(lineaDeManana(cierre([]))).toBeNull();
  });
});

describe('lo que dice la tarjeta de hoy', () => {
  it('sin cerrar: «Cierra tu día» y que son 2 minutos, es opcional y no da puntos', () => {
    expect(textosDeLaTarjeta(cierre([], { estado: 'ABIERTO', cerradoEn: null }))).toEqual({
      cerrado: false,
      titulo: 'Cierra tu día',
      segundaLinea: '2 minutos · opcional, no da puntos',
    });
  });

  it('cerrado: «Día cerrado» con lo que dijo para mañana', () => {
    expect(textosDeLaTarjeta(cierre([accion('b', 'Revisar las facturas', 'OTRA_HORA')]))).toEqual({
      cerrado: true,
      titulo: 'Día cerrado',
      segundaLinea: 'Mañana: «Revisar las facturas» a otra hora',
    });
  });

  it('cerrado sin nada para mañana: la hora en que cerró, en su texto y no en una columna', () => {
    const textos = textosDeLaTarjeta(cierre([]));
    expect(textos.titulo).toBe('Día cerrado');
    expect(textos.segundaLinea).toBe('Cerrado a las 22:02');
  });

  it('cerrado sin hora legible ni respuestas: sin segunda línea (no se inventa)', () => {
    expect(textosDeLaTarjeta(cierre([], { cerradoEn: null })).segundaLinea).toBeNull();
  });

  it('un estado que no se entiende (null) se trata como sin cerrar: la tarjeta invita, no afirma', () => {
    expect(textosDeLaTarjeta(cierre([], { estado: null, cerradoEn: null })).cerrado).toBe(false);
  });
});

describe('la hora de un instante', () => {
  it('HH:mm en la hora del teléfono; null si no hay o no se entiende', () => {
    expect(horaDeUnInstante('2026-10-29T22:02:00')).toBe('22:02');
    expect(horaDeUnInstante(null)).toBeNull();
    expect(horaDeUnInstante('no es una fecha')).toBeNull();
  });
});
