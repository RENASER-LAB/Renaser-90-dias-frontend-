/**
 * `AvisoDeMantenimiento` y el proveedor de los interruptores (spec 002): el aviso se lee, se anuncia y «Reintentar»
 * relee; el proveedor relee al entrar, al volver al frente, cada 60 s y con un 503 `FUNCIONALIDAD_APAGADA`.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo, AppState, Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

import { apiFetch, setTokenSesion } from '../../../services/http/apiClient';
import { AVISO_GENERICO, AvisoDeMantenimiento } from '../components/AvisoDeMantenimiento';
import type { LecturaDeFuncionalidades } from '../api/funcionalidadesApi';
import { crearAlmacenDeFuncionalidades, type AlmacenDeFuncionalidades } from '../estado/almacenDeFuncionalidades';
import { INTERVALO_DE_RELECTURA_MS, ProveedorDeFuncionalidades } from '../estado/FuncionalidadesProvider';
import { useAlVolverAPrenderse, useFuncionalidad } from '../estado/useFuncionalidad';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const textos = () => raiz!.root.findAll(n => n.type === Text).map(n => n.props.children);
const boton = (etiqueta: string) =>
  raiz!.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

/** Un almacén con una lectura que el test controla. */
function almacenDePrueba(respuestas: LecturaDeFuncionalidades[]): { almacen: AlmacenDeFuncionalidades; leer: jest.Mock } {
  const leer = jest.fn(async () => respuestas.shift() ?? ({ tipo: 'sin_cambios' } as LecturaDeFuncionalidades));
  const almacen = crearAlmacenDeFuncionalidades({ leer, recuperar: async () => null, guardar: async () => undefined });
  return { almacen, leer };
}

describe('AvisoDeMantenimiento', () => {
  it('sin aviso escrito muestra el genérico y lo anuncia al lector de pantalla', () => {
    const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    act(() => {
      raiz = TestRenderer.create(React.createElement(AvisoDeMantenimiento, { aviso: '   ' }));
    });
    expect(AVISO_GENERICO).toBe('Esta función está en mantenimiento. Vuelve a intentarlo en un rato.');
    expect(textos()).toContain(AVISO_GENERICO);
    expect(anunciar).toHaveBeenCalledWith(AVISO_GENERICO);
    expect(raiz!.root.findAll(n => n.props.accessibilityLiveRegion === 'polite').length).toBeGreaterThan(0);
  });

  it('con aviso, el texto de Soporte TI; «Reintentar» relee y hace lo de quien lo usa', async () => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    const { almacen } = almacenDePrueba([{ tipo: 'nueva', version: 1, etag: null, apagadas: [] }]);
    const releer = jest.spyOn(almacen, 'releer');
    const alReintentar = jest.fn();
    await act(async () => {
      raiz = TestRenderer.create(
        React.createElement(
          ProveedorDeFuncionalidades,
          { cuenta: 'u-1', almacen },
          React.createElement(AvisoDeMantenimiento, { aviso: 'El chat vuelve a las 18:00.', alReintentar }),
        ),
      );
    });
    expect(textos()).toContain('El chat vuelve a las 18:00.');
    releer.mockClear();
    await act(async () => {
      boton('Reintentar: ver si ya volvió').props.onPress();
    });
    expect(releer).toHaveBeenCalledTimes(1);
    expect(alReintentar).toHaveBeenCalledTimes(1);
  });

  it('sin proveedor, «Reintentar» no revienta', () => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    act(() => {
      raiz = TestRenderer.create(React.createElement(AvisoDeMantenimiento, { aviso: null }));
    });
    expect(() => boton('Reintentar: ver si ya volvió').props.onPress()).not.toThrow();
  });
});

describe('useFuncionalidad con el proveedor', () => {
  function Sonda({ clave, alPrenderse }: { clave: string; alPrenderse?: () => void }) {
    const f = useFuncionalidad(clave);
    useAlVolverAPrenderse(clave, alPrenderse ?? (() => undefined));
    return React.createElement(Text, null, f.prendida ? 'prendida' : `apagada:${f.aviso ?? ''}`);
  }

  it('sin proveedor, todo prendido', () => {
    act(() => {
      raiz = TestRenderer.create(React.createElement(Sonda, { clave: 'muro' }));
    });
    expect(textos()).toEqual(['prendida']);
  });

  it('refleja lo apagado y avisa cuando vuelve a prenderse', async () => {
    const { almacen } = almacenDePrueba([
      { tipo: 'nueva', version: 1, etag: '"v1"', apagadas: [{ clave: 'muro', aviso: 'Spam: volvemos pronto.' }] },
      { tipo: 'nueva', version: 2, etag: '"v2"', apagadas: [] },
    ]);
    const alPrenderse = jest.fn();
    await act(async () => {
      raiz = TestRenderer.create(
        React.createElement(ProveedorDeFuncionalidades, { cuenta: 'u-1', almacen }, React.createElement(Sonda, { clave: 'muro.publicar', alPrenderse })),
      );
    });
    expect(textos()).toEqual(['apagada:Spam: volvemos pronto.']);
    expect(alPrenderse).not.toHaveBeenCalled();
    await act(async () => {
      await almacen.releer();
    });
    expect(textos()).toEqual(['prendida']);
    expect(alPrenderse).toHaveBeenCalledTimes(1);
  });
});

describe('cuándo relee el proveedor', () => {
  let alCambiarEstado: ((estado: string) => void) | null = null;
  beforeEach(() => {
    alCambiarEstado = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_tipo: string, oyente: (estado: string) => void) => {
      alCambiarEstado = oyente;
      return { remove: () => undefined };
    }) as unknown as typeof AppState.addEventListener);
  });

  it('al entrar, cada 60 s al frente, al volver al frente, y nada en segundo plano', async () => {
    jest.useFakeTimers();
    const { almacen, leer } = almacenDePrueba([]);
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(ProveedorDeFuncionalidades, { cuenta: 'u-1', almacen }, null));
    });
    expect(leer).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(INTERVALO_DE_RELECTURA_MS);
    });
    expect(leer).toHaveBeenCalledTimes(2);

    await act(async () => {
      alCambiarEstado?.('background');
      jest.advanceTimersByTime(INTERVALO_DE_RELECTURA_MS * 3);
    });
    expect(leer).toHaveBeenCalledTimes(2);

    await act(async () => {
      alCambiarEstado?.('active');
    });
    expect(leer).toHaveBeenCalledTimes(3);
  });

  it('sin cuenta no pide nada', async () => {
    const { almacen, leer } = almacenDePrueba([]);
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(ProveedorDeFuncionalidades, { cuenta: null, almacen }, null));
    });
    expect(leer).not.toHaveBeenCalled();
  });

  it('un 503 FUNCIONALIDAD_APAGADA visto por apiFetch marca la clave y relee', async () => {
    const { almacen, leer } = almacenDePrueba([]);
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(ProveedorDeFuncionalidades, { cuenta: 'u-1', almacen }, null));
    });
    setTokenSesion('sesion-1');
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({ message: 'Volvemos a las 18:00.', codigo: 'FUNCIONALIDAD_APAGADA', funcionalidad: 'chat.grupos' }),
    }));
    await act(async () => {
      await apiFetch('/api/v1/chat/conversations/c-1/messages').catch(() => undefined);
    });
    expect(almacen.estado().apagadas['chat.grupos']).toBe('Volvemos a las 18:00.');
    expect(leer).toHaveBeenCalledTimes(2);
    expect(leer).toHaveBeenLastCalledWith(null);
  });
});
