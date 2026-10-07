/**
 * Qué hito abre qué pantalla completa (y qué no), la jerarquía cuando coinciden y el tope de una por día por cuenta.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { tomarCelebracionDeHoy } from '../estado/celebracionDelDia';
import { claveDelDia, hitoDelDia, hitosDelDia, rachaCelebradaTrasMirar } from '../utils/hitosDelFenix';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const pocos = { completados: 2, total: 5 };
const todosLosDeHoy = { completados: 5, total: 5 };

describe('hitosDelDia', () => {
  it('cumplir UN hábito (o varios, sin terminar) no es un hito', () => {
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: { completados: 1, total: 5 } }, null)).toBeNull();
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: pocos }, null)).toBeNull();
  });
  it('todos los hábitos del día, con al menos uno', () => {
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: todosLosDeHoy }, null)).toBe('todosLosHabitos');
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: { completados: 0, total: 0 } }, null)).toBeNull();
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: null }, null)).toBeNull();
  });
  it('rachas de 7 y 30, y no las de otro largo', () => {
    expect(hitoDelDia({ rachaActual: 7, habitosHoy: pocos }, null)).toBe('racha7');
    expect(hitoDelDia({ rachaActual: 30, habitosHoy: pocos }, 7)).toBe('racha30');
    expect(hitoDelDia({ rachaActual: 8, habitosHoy: pocos }, null)).toBeNull();
    expect(hitoDelDia({ rachaActual: null, habitosHoy: pocos }, null)).toBeNull();
  });
  it('fase nueva es un hito', () => {
    expect(hitoDelDia({ rachaActual: 2, habitosHoy: pocos, faseNueva: true }, null)).toBe('fase');
  });
  it('si coinciden: fase > racha 30 > racha 7 > día completo, y el resto queda en orden', () => {
    expect(hitosDelDia({ rachaActual: 30, habitosHoy: todosLosDeHoy, faseNueva: true }, 7)).toEqual([
      'fase',
      'racha30',
      'todosLosHabitos',
    ]);
    expect(hitosDelDia({ rachaActual: 7, habitosHoy: todosLosDeHoy }, null)).toEqual(['racha7', 'todosLosHabitos']);
  });
  it('la misma racha no se festeja dos veces', () => {
    expect(hitoDelDia({ rachaActual: 7, habitosHoy: pocos }, 7)).toBeNull();
  });
  it('si la racha se corta, la celebrada se olvida; la de una línea también cuenta como celebrada', () => {
    expect(rachaCelebradaTrasMirar(2, 7, [])).toBeNull();
    expect(rachaCelebradaTrasMirar(9, 7, [])).toBe(7);
    expect(rachaCelebradaTrasMirar(7, null, ['fase', 'racha7'])).toBe(7);
  });
});

describe('una pantalla por día por cuenta', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });
  const lunes = new Date(2026, 9, 5, 9, 0);
  const lunesNoche = new Date(2026, 9, 5, 22, 0);
  const martes = new Date(2026, 9, 6, 9, 0);
  const miercoles = new Date(2026, 9, 7, 9, 0);
  const todos = { rachaActual: 3, habitosHoy: todosLosDeHoy, faseNumero: 2 };

  it('el segundo hito del mismo día no abre otra; al día siguiente sí', async () => {
    expect(await tomarCelebracionDeHoy('u1', todos, lunes)).toEqual({ principal: 'todosLosHabitos', otros: [] });
    expect(await tomarCelebracionDeHoy('u1', { ...todos, rachaActual: 7 }, lunesNoche)).toBeNull();
    expect(await tomarCelebracionDeHoy('u1', { ...todos, rachaActual: 7 }, martes)).toEqual({
      principal: 'racha7',
      otros: ['todosLosHabitos'],
    });
  });
  it('cada cuenta lleva su propio tope', async () => {
    expect((await tomarCelebracionDeHoy('u1', todos, lunes))?.principal).toBe('todosLosHabitos');
    expect((await tomarCelebracionDeHoy('u2', todos, lunes))?.principal).toBe('todosLosHabitos');
  });
  it('la racha de 7 que sigue valiendo 7 al otro día no se repite', async () => {
    const siete = { rachaActual: 7, habitosHoy: pocos, faseNumero: 2 };
    expect((await tomarCelebracionDeHoy('u1', siete, lunes))?.principal).toBe('racha7');
    expect(await tomarCelebracionDeHoy('u1', siete, martes)).toBeNull();
  });
  it('la fase: la primera vez se anota sin celebrar; la siguiente más alta, sí, con lo demás como línea', async () => {
    expect(await tomarCelebracionDeHoy('u1', { rachaActual: 3, habitosHoy: pocos, faseNumero: 1 }, lunes)).toBeNull();
    expect(await tomarCelebracionDeHoy('u1', { ...todos, rachaActual: 7, faseNumero: 2 }, martes)).toEqual({
      principal: 'fase',
      otros: ['racha7', 'todosLosHabitos'],
    });
    expect(await AsyncStorage.getItem('yo.faseVista.u1')).toBe('2');
  });
  it('la fase que llega con el día ya ocupado no se pierde: sale al día siguiente', async () => {
    await AsyncStorage.setItem('yo.faseVista.u1', '1');
    expect((await tomarCelebracionDeHoy('u1', { ...todos, faseNumero: 1 }, lunes))?.principal).toBe('todosLosHabitos');
    expect(await tomarCelebracionDeHoy('u1', { ...todos, faseNumero: 2 }, lunesNoche)).toBeNull();
    expect(await AsyncStorage.getItem('yo.faseVista.u1')).toBe('1');
    expect((await tomarCelebracionDeHoy('u1', { rachaActual: 4, habitosHoy: pocos, faseNumero: 2 }, martes))?.principal).toBe('fase');
    expect(await tomarCelebracionDeHoy('u1', { rachaActual: 5, habitosHoy: pocos, faseNumero: 2 }, miercoles)).toBeNull();
  });
  it('quien ya vio su fase en Yo (clave de siempre) no la vuelve a celebrar', async () => {
    await AsyncStorage.setItem('yo.faseVista.u1', '2');
    expect(await tomarCelebracionDeHoy('u1', { rachaActual: 3, habitosHoy: pocos, faseNumero: 2 }, lunes)).toBeNull();
  });
  it('la clave del día es la fecha del teléfono', () => {
    expect(claveDelDia(new Date(2026, 0, 3, 23, 59))).toBe('2026-01-03');
  });
});
