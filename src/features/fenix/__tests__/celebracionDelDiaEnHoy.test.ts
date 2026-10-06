/**
 * Dónde se celebra un hito: en el fénix del centro de Hoy si está; si no, la superposición.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { act } from 'react-test-renderer';

import { anotarCelebrador } from '../estado/celebracionEnElCentro';
import { useCelebracionDelDia } from '../hooks/useCelebracionDelDia';
import type { HitoDelFenix } from '../utils/hitosDelFenix';
import { crear, desmontarTodo } from './ayudasDePrueba';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const todos = { rachaActual: 2, habitosHoy: { completados: 4, total: 4 } };
const visto: { hito: HitoDelFenix | null } = { hito: null };

function Prueba() {
  visto.hito = useCelebracionDelDia('u1', todos).hito;
  return null;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  visto.hito = null;
});
afterEach(desmontarTodo);

describe('useCelebracionDelDia', () => {
  it('con el fénix del centro, salta él y no hay superposición', async () => {
    const celebrar = jest.fn(() => Promise.resolve());
    const quitar = anotarCelebrador(celebrar);
    await act(async () => {
      crear(React.createElement(Prueba));
    });
    expect(celebrar).toHaveBeenCalledTimes(1);
    expect(visto.hito).toBeNull();
    quitar();
  });

  it('sin fénix del centro, la superposición', async () => {
    await act(async () => {
      crear(React.createElement(Prueba));
    });
    expect(visto.hito).toBe('todosLosHabitos');
  });
});
