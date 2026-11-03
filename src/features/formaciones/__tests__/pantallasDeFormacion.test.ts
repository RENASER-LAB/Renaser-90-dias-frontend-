import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined } }));
jest.mock('../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View, Text: Texto } = require('react-native');
  const React = require('react');
  return {
    HojaDesdeAbajo: ({ visible, titulo, children }: { visible: boolean; titulo: string; children: unknown }) =>
      visible ? React.createElement(View, null, React.createElement(Texto, null, titulo), children) : null,
  };
});
const mockEstado: { formacion: unknown; elegir: jest.Mock; recargar: jest.Mock; logout: jest.Mock } = {
  formacion: null,
  elegir: jest.fn(),
  recargar: jest.fn(),
  logout: jest.fn(),
};
jest.mock('../context/FormacionContext', () => ({
  useFormacionDeLaSesion: () => ({ formacion: mockEstado.formacion, elegir: mockEstado.elegir, recargar: mockEstado.recargar }),
}));
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ logout: mockEstado.logout }) }));

import { NombreDeLaFormacion } from '../components/NombreDeLaFormacion';
import { SelectorDeFormacion } from '../components/SelectorDeFormacion';
import { EleccionDeFormacionScreen } from '../screens/EleccionDeFormacionScreen';
import { SinFormacionScreen } from '../screens/SinFormacionScreen';
import type { FormacionDeLaSesion } from '../types/formaciones.types';
import { MENSAJE_SIN_FORMACION, PREGUNTA_DE_FORMACION } from '../utils/vistaDeFormacion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ESCUELA = { codigo: 'ESCUELA', nombre: 'Escuela Renaser' };
const DIPLOMADO = { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' };
function sesion(parcial: Partial<FormacionDeLaSesion> = {}): FormacionDeLaSesion {
  return { activa: ESCUELA, disponibles: [ESCUELA, DIPLOMADO], puedeElegir: true, veTodas: false, sinFormacion: false, duracionDias: 90, fases: [], ...parcial };
}

let raiz: ReactTestRenderer | null = null;
const montar = (elemento: React.ReactElement) => {
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
};
const textos = () => raiz!.root.findAll(n => n.type === Text).map(n => String(n.props.children));
const boton = (etiqueta: string): ReactTestInstance =>
  raiz!.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

beforeEach(() => {
  mockEstado.formacion = sesion();
  mockEstado.elegir = jest.fn(async () => undefined);
  mockEstado.recargar = jest.fn(async () => undefined);
  mockEstado.logout = jest.fn(async () => undefined);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('el nombre de la formación en Hoy', () => {
  it('lo dice quien tiene varias y no dibuja nada para quien es de la Escuela con una sola', () => {
    montar(React.createElement(NombreDeLaFormacion));
    expect(textos()).toEqual(['Escuela Renaser']);
    act(() => raiz?.unmount());

    mockEstado.formacion = sesion({ disponibles: [ESCUELA], puedeElegir: false });
    montar(React.createElement(NombreDeLaFormacion));
    expect(raiz!.root.findAll(n => n.type === Text)).toHaveLength(0);
  });

  it('lo dice quien es de otra formación y no lo dice quien lo ve todo', () => {
    mockEstado.formacion = sesion({ activa: DIPLOMADO, disponibles: [DIPLOMADO], puedeElegir: false });
    montar(React.createElement(NombreDeLaFormacion));
    expect(textos()).toEqual(['Diplomado Renaser']);
    act(() => raiz?.unmount());

    mockEstado.formacion = sesion({ activa: null, veTodas: true, puedeElegir: false });
    montar(React.createElement(NombreDeLaFormacion));
    expect(raiz!.root.findAll(n => n.type === Text)).toHaveLength(0);
  });
});

describe('«Cambiar de formación» (hoja de Yo)', () => {
  it('lista las formaciones del personal con la activa marcada', () => {
    montar(React.createElement(SelectorDeFormacion, { visible: true, alCerrar: jest.fn() }));
    expect(textos()).toEqual(expect.arrayContaining(['Cambiar de formación', 'Escuela Renaser', 'Diplomado Renaser']));
    expect(boton('Escuela Renaser, la que usas ahora').props.accessibilityState.selected).toBe(true);
    expect(boton('Diplomado Renaser').props.accessibilityState.selected).toBe(false);
  });

  it('elegir otra la deja activa en el servidor y cierra la hoja', async () => {
    const alCerrar = jest.fn();
    montar(React.createElement(SelectorDeFormacion, { visible: true, alCerrar }));
    await act(async () => {
      boton('Diplomado Renaser').props.onPress();
    });
    expect(mockEstado.elegir).toHaveBeenCalledWith('DIPLOMADO');
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('tocar la que ya está activa solo cierra: no manda nada', async () => {
    const alCerrar = jest.fn();
    montar(React.createElement(SelectorDeFormacion, { visible: true, alCerrar }));
    await act(async () => {
      boton('Escuela Renaser, la que usas ahora').props.onPress();
    });
    expect(mockEstado.elegir).not.toHaveBeenCalled();
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('si el servidor rechaza el cambio, lo dice y la hoja sigue abierta', async () => {
    mockEstado.elegir = jest.fn(async () => {
      throw new Error('boom');
    });
    const alCerrar = jest.fn();
    montar(React.createElement(SelectorDeFormacion, { visible: true, alCerrar }));
    await act(async () => {
      boton('Diplomado Renaser').props.onPress();
    });
    expect(alCerrar).not.toHaveBeenCalled();
    expect(textos()).toContain('No pudimos cambiar de formación. Inténtalo de nuevo.');
  });
});

describe('la pregunta de la primera vez', () => {
  it('pregunta en qué formación trabaja hoy, y al elegir avisa que ya eligió', async () => {
    const onElegida = jest.fn();
    montar(React.createElement(EleccionDeFormacionScreen, { onElegida }));
    expect(textos()).toEqual(expect.arrayContaining([PREGUNTA_DE_FORMACION, 'Puedes cambiarla después desde Yo.']));
    await act(async () => {
      boton('Diplomado Renaser').props.onPress();
    });
    expect(mockEstado.elegir).toHaveBeenCalledWith('DIPLOMADO');
    expect(onElegida).toHaveBeenCalledTimes(1);
  });

  it('si el servidor no deja elegir, no sigue y dice por qué', async () => {
    mockEstado.elegir = jest.fn(async () => {
      throw new Error('boom');
    });
    const onElegida = jest.fn();
    montar(React.createElement(EleccionDeFormacionScreen, { onElegida }));
    await act(async () => {
      boton('Escuela Renaser, la que usas ahora').props.onPress();
    });
    expect(onElegida).not.toHaveBeenCalled();
    expect(textos()).toContain('No pudimos cambiar de formación. Inténtalo de nuevo.');
  });
});

describe('el personal sin formación', () => {
  it('ve el aviso, puede volver a revisar y puede cerrar sesión', async () => {
    montar(React.createElement(SinFormacionScreen));
    expect(textos()).toContain(MENSAJE_SIN_FORMACION);
    await act(async () => {
      boton('Volver a revisar').props.onPress();
    });
    expect(mockEstado.recargar).toHaveBeenCalledTimes(1);
    await act(async () => {
      boton('Cerrar sesión').props.onPress();
    });
    expect(mockEstado.logout).toHaveBeenCalledTimes(1);
  });
});
