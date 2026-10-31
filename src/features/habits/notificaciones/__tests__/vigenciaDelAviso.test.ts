/**
 * Issue #40 (2026-10-31): «un aviso de inicio vale hasta la hora del hábito; después no se muestra». La regla pura:
 * qué es un aviso de inicio, a qué hora del hábito pertenece (aunque llegue tarde) y cuándo ya no vale.
 *
 * Las pruebas corren en `America/Lima` (jest.config.js).
 */
import { describe, expect, it } from '@jest/globals';

import {
  avisoDeInicioVencido,
  fechaDelInstante,
  GRACIA_DEL_AVISO_MIN,
  horaDelHabitoDelAviso,
  leerAvisoDeInicio,
  vigenciaDelAvisoMin,
} from '../utils/vigenciaDelAviso';

const hora = (d: number, h: number, m: number, s = 0) => new Date(2026, 9, d, h, m, s, 0).getTime();

describe('cuántos minutos vale un aviso', () => {
  it('su antelación más la gracia', () => {
    expect(GRACIA_DEL_AVISO_MIN).toBe(2);
    expect(vigenciaDelAvisoMin(30)).toBe(32);
    expect(vigenciaDelAvisoMin(10)).toBe(12);
    // «A la hora»: no vale cero, o llegar a las 07:00:03 lo descartaría.
    expect(vigenciaDelAvisoMin(0)).toBe(2);
  });

  it('una antelación rara no da una vigencia negativa', () => {
    expect(vigenciaDelAvisoMin(-5)).toBe(2);
  });
});

describe('qué es un aviso de inicio', () => {
  const aviso = (extra: Record<string, unknown> = {}) => ({
    title: 'En 30 min: GIMNASIO',
    body: 'Te toca a las 07:00.',
    data: { route: '/habitos/h-gym?dimension=BODY', ...extra },
  });

  it('lo lee: el hábito de la ruta, la antelación del título y la hora del cuerpo', () => {
    expect(leerAvisoDeInicio(aviso())).toEqual({ habitoId: 'h-gym', minutosAntes: 30, hora: '07:00' });
  });

  it('sin «En N min:» es el aviso a la hora', () => {
    expect(leerAvisoDeInicio({ ...aviso(), title: 'GIMNASIO' })).toEqual({ habitoId: 'h-gym', minutosAntes: 0, hora: '07:00' });
  });

  it('una ruta sin dimensión también es de un hábito', () => {
    expect(leerAvisoDeInicio({ ...aviso(), data: { route: '/habitos/h-gym' } })?.habitoId).toBe('h-gym');
  });

  it('un aviso agrupado (E-410) se lee por su texto original, no por «2 hábitos a las 07:00»', () => {
    const agrupado = {
      title: '2 hábitos a las 07:00',
      body: 'GIMNASIO · Agua',
      data: { route: '/habitos/h-gym', avisoOriginal: { title: 'En 10 min: GIMNASIO', body: 'Te toca a las 07:00.' } },
    };
    expect(leerAvisoDeInicio(agrupado)).toEqual({ habitoId: 'h-gym', minutosAntes: 10, hora: '07:00' });
  });

  it('las repeticiones («Te tocaba a las …») no son avisos de inicio: suenan después de la hora a propósito', () => {
    expect(leerAvisoDeInicio({ ...aviso(), title: 'GIMNASIO', body: 'Te tocaba a las 07:00.' })).toBeNull();
  });

  it('lo que no es de un hábito no lo es: acciones de los objetivos, eventos, mensajes, avisos sin ruta', () => {
    expect(leerAvisoDeInicio({ ...aviso(), data: { route: '/objetivos' } })).toBeNull();
    expect(leerAvisoDeInicio({ ...aviso(), data: { route: '/eventos/e-1' } })).toBeNull();
    expect(leerAvisoDeInicio({ ...aviso(), data: {} })).toBeNull();
    expect(leerAvisoDeInicio({ ...aviso(), data: null })).toBeNull();
    expect(leerAvisoDeInicio({ title: 'Mensaje', body: 'Hola', data: { route: '/chat/c-1' } })).toBeNull();
  });

  it('un cuerpo que no es «Te toca a las HH:mm.» exacto no se toca', () => {
    expect(leerAvisoDeInicio({ ...aviso(), body: 'Te toca a las 7:00.' })).toBeNull();
    expect(leerAvisoDeInicio({ ...aviso(), body: 'Te toca a las 25:00.' })).toBeNull();
    expect(leerAvisoDeInicio({ ...aviso(), body: 'Te toca a las 07:00. En juego: 8 puntos.' })).toBeNull();
    expect(leerAvisoDeInicio({ ...aviso(), body: null })).toBeNull();
  });

  it('un id de ruta con caracteres codificados se decodifica', () => {
    expect(leerAvisoDeInicio({ ...aviso(), data: { route: '/habitos/h%20gym?dimension=BODY' } })?.habitoId).toBe('h gym');
  });
});

describe('a qué hora del hábito pertenece un aviso', () => {
  it('uno a tiempo es el de hoy', () => {
    // «En 30 min» de las 07:00 suena a las 06:30.
    expect(horaDelHabitoDelAviso(hora(21, 6, 30, 0), '07:00', 30)).toBe(hora(21, 7, 0));
    // «A la hora»: suena a las 07:00 en punto.
    expect(horaDelHabitoDelAviso(hora(21, 7, 0, 0), '07:00', 0)).toBe(hora(21, 7, 0));
  });

  it('uno que llegó TARDE sigue siendo el de hoy (ya vencido), no el de mañana', () => {
    // El caso de la issue: el aviso de las 07:00 se muestra a las 08:58.
    expect(horaDelHabitoDelAviso(hora(21, 8, 58), '07:00', 30)).toBe(hora(21, 7, 0));
    expect(horaDelHabitoDelAviso(hora(21, 8, 58), '07:00', 0)).toBe(hora(21, 7, 0));
  });

  it('un hábito pasada la medianoche: el aviso de las 23:40 es el de las 00:10 de MAÑANA', () => {
    expect(horaDelHabitoDelAviso(hora(21, 23, 40), '00:10', 30)).toBe(hora(22, 0, 10));
  });

  it('y el mismo, mostrado a las 00:50, ya es el de las 00:10 de hoy (vencido)', () => {
    expect(horaDelHabitoDelAviso(hora(22, 0, 50), '00:10', 30)).toBe(hora(22, 0, 10));
  });

  it('un reloj que se corrige unos segundos no cambia de día al aviso', () => {
    // Publicado 20 s antes de su hora nominal (06:29:40 para un «En 30 min» de las 07:00).
    expect(horaDelHabitoDelAviso(hora(21, 6, 29, 40), '07:00', 30)).toBe(hora(21, 7, 0));
  });
});

describe('cuándo ya no vale', () => {
  const aviso = { habitoId: 'h-gym', minutosAntes: 30, hora: '07:00' };

  it('hasta la hora del hábito más la gracia, vale', () => {
    const publicado = hora(21, 6, 30);
    expect(avisoDeInicioVencido(aviso, publicado, hora(21, 6, 31))).toBe(false);
    expect(avisoDeInicioVencido(aviso, publicado, hora(21, 7, 0))).toBe(false);
    expect(avisoDeInicioVencido(aviso, publicado, hora(21, 7, 2, 0))).toBe(false);
  });

  it('pasada la hora y la gracia, no', () => {
    const publicado = hora(21, 6, 30);
    expect(avisoDeInicioVencido(aviso, publicado, hora(21, 7, 2, 1))).toBe(true);
    expect(avisoDeInicioVencido(aviso, publicado, hora(21, 8, 58))).toBe(true);
  });

  it('el caso de la issue: «te toca a las 07:00» mostrado a las 08:58 está vencido en el momento', () => {
    expect(avisoDeInicioVencido(aviso, hora(21, 8, 58), hora(21, 8, 58, 5))).toBe(true);
  });

  it('el aviso a la hora llegado con 3 segundos de atraso no se descarta', () => {
    expect(avisoDeInicioVencido({ ...aviso, minutosAntes: 0 }, hora(21, 7, 0, 3), hora(21, 7, 0, 4))).toBe(false);
  });

  it('el de mañana (hábito pasada la medianoche) vale esta noche aunque la fecha del reloj cambie', () => {
    const noche = { habitoId: 'h-dormir', minutosAntes: 30, hora: '00:10' };
    expect(avisoDeInicioVencido(noche, hora(21, 23, 40), hora(21, 23, 50))).toBe(false);
    expect(avisoDeInicioVencido(noche, hora(21, 23, 40), hora(22, 0, 11))).toBe(false);
    expect(avisoDeInicioVencido(noche, hora(21, 23, 40), hora(22, 0, 13))).toBe(true);
  });
});

describe('la fecha del instante', () => {
  it('es AAAAMMDD en la hora del teléfono', () => {
    expect(fechaDelInstante(hora(21, 23, 59))).toBe('20261021');
    expect(fechaDelInstante(hora(5, 0, 0))).toBe('20261005');
  });
});
