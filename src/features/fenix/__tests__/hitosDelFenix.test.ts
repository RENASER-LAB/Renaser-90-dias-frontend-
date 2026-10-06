/**
 * Qué celebra el fénix (y qué no), y el tope de una celebración por día por usuario.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { registrarCelebracionFuera, tomarCelebracionDeHoy } from '../estado/celebracionDelDia';
import { claveDelDia, hitoDelDia, rachaCelebradaTrasMirar } from '../utils/hitosDelFenix';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const pocos = { completados: 2, total: 5 };

describe('hitoDelDia', () => {
  it('cumplir UN hábito (o varios, sin terminar) no es un hito', () => {
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: { completados: 1, total: 5 } }, null)).toBeNull();
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: pocos }, null)).toBeNull();
  });
  it('todos los hábitos del día, con al menos uno', () => {
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: { completados: 5, total: 5 } }, null)).toBe('todosLosHabitos');
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: { completados: 0, total: 0 } }, null)).toBeNull();
    expect(hitoDelDia({ rachaActual: 3, habitosHoy: null }, null)).toBeNull();
  });
  it('rachas de 7 y 30, y no las de otro largo', () => {
    expect(hitoDelDia({ rachaActual: 7, habitosHoy: pocos }, null)).toBe('racha7');
    expect(hitoDelDia({ rachaActual: 30, habitosHoy: pocos }, 7)).toBe('racha30');
    expect(hitoDelDia({ rachaActual: 8, habitosHoy: pocos }, null)).toBeNull();
    expect(hitoDelDia({ rachaActual: null, habitosHoy: pocos }, null)).toBeNull();
  });
  it('la misma racha no se festeja dos veces; gana la más rara si coinciden', () => {
    expect(hitoDelDia({ rachaActual: 7, habitosHoy: pocos }, 7)).toBeNull();
    expect(hitoDelDia({ rachaActual: 7, habitosHoy: { completados: 5, total: 5 } }, null)).toBe('racha7');
  });
  it('si la racha se corta, la celebrada se olvida', () => {
    expect(rachaCelebradaTrasMirar(2, 7, null)).toBeNull();
    expect(rachaCelebradaTrasMirar(9, 7, null)).toBe(7);
    expect(rachaCelebradaTrasMirar(7, null, 'racha7')).toBe(7);
  });
});

describe('una por día por usuario', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });
  const lunes = new Date(2026, 9, 5, 9, 0);
  const lunesNoche = new Date(2026, 9, 5, 22, 0);
  const martes = new Date(2026, 9, 6, 9, 0);
  const todos = { rachaActual: 3, habitosHoy: { completados: 5, total: 5 } };

  it('el segundo hito del mismo día no se celebra; al día siguiente sí', async () => {
    expect(await tomarCelebracionDeHoy('u1', todos, lunes)).toBe('todosLosHabitos');
    expect(await tomarCelebracionDeHoy('u1', { ...todos, rachaActual: 7 }, lunesNoche)).toBeNull();
    expect(await tomarCelebracionDeHoy('u1', { ...todos, rachaActual: 7 }, martes)).toBe('racha7');
  });
  it('cada cuenta lleva su propio tope', async () => {
    expect(await tomarCelebracionDeHoy('u1', todos, lunes)).toBe('todosLosHabitos');
    expect(await tomarCelebracionDeHoy('u2', todos, lunes)).toBe('todosLosHabitos');
  });
  it('la racha de 7 que sigue valiendo 7 al otro día no se repite', async () => {
    const siete = { rachaActual: 7, habitosHoy: pocos };
    expect(await tomarCelebracionDeHoy('u1', siete, lunes)).toBe('racha7');
    expect(await tomarCelebracionDeHoy('u1', siete, martes)).toBeNull();
  });
  it('el momento de la fase nueva en Yo ocupa el día: el fénix no suma otro', async () => {
    await registrarCelebracionFuera('u1', lunes);
    expect(await tomarCelebracionDeHoy('u1', todos, lunesNoche)).toBeNull();
  });
  it('la clave del día es la fecha del teléfono', () => {
    expect(claveDelDia(new Date(2026, 0, 3, 23, 59))).toBe('2026-01-03');
  });
});
