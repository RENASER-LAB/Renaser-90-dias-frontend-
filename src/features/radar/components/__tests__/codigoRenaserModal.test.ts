import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { ScrollView } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Registrar» del Código Renaser con una respuesta sin dar (fallo visto en el emulador el
 * 2026-09-28, aprendiz en su día 2): con las cuatro preguntas escritas y el nivel de energía sin
 * marcar, tocar «Registrar» no hacía ninguna llamada —bien— pero tampoco decía nada a la vista: el
 * selector de energía y el aviso «Falta 1 respuesta» quedaban al final del scroll, debajo del
 * pliegue. La persona quedaba atrapada en un formulario innegociable que parecía roto.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../storage/borradorRadar', () => ({
  borrarBorrador: async () => undefined,
  guardarBorrador: async () => undefined,
  leerBorrador: async () => null,
  limpiarBorradoresViejos: async () => undefined,
}));

import { SliderRating } from '../../../../components/SliderRating';
import { CodigoRenaserModal } from '../CodigoRenaserModal';
import type { CheckInRadarApi } from '../../types/radar.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const onEnviar = jest.fn(async (_c: CheckInRadarApi) => true);
const slot = { hora: 14, etiqueta: '14:00', cierraA: '15:00' } as never;

function montar(): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(CodigoRenaserModal, {
        visible: true,
        slot,
        obligatorio: true,
        usuarioId: null,
        enviando: false,
        error: null,
        onEnviar,
        onCerrar: () => undefined,
        onLimpiarError: () => undefined,
      }),
    );
  });
  return r;
}

function textoDe(n: ReactTestInstance): string {
  return n
    .findAll(h => (h.type as unknown) === 'Text')
    .map(h => React.Children.toArray(h.props.children).filter(x => typeof x === 'string').join(''))
    .join(' | ');
}

function escribirLasCuatro(r: ReactTestRenderer) {
  const campos = r.root.findAll(n => (n.type as unknown) === 'TextInput');
  expect(campos).toHaveLength(4);
  act(() => {
    campos.forEach(campo => campo.props.onChangeText('algo'));
  });
}

async function tocarRegistrar(r: ReactTestRenderer) {
  const [boton] = r.root.findAll((n: ReactTestInstance) => n.props.accessibilityRole === 'button' && textoDe(n) === 'Registrar');
  expect(boton).toBeDefined();
  await act(async () => {
    boton.props.onPress();
  });
}

describe('Código Renaser: «Registrar» con algo sin responder', () => {
  beforeEach(() => {
    onEnviar.mockClear();
  });

  it('sin el nivel de energía no llama al servidor y dice QUÉ falta, fuera del scroll (a la vista, junto al botón)', async () => {
    const r = montar();
    escribirLasCuatro(r);

    await tocarRegistrar(r);

    expect(onEnviar).not.toHaveBeenCalled();
    const alertas = r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'alert');
    expect(alertas.map(textoDe).join(' ')).toContain('nivel de energía');
    const [scroll] = r.root.findAll((n: ReactTestInstance) => n.type === ScrollView);
    expect(textoDe(scroll)).not.toContain('Falta');
  });

  it('con las cinco respuestas, registra', async () => {
    const r = montar();
    escribirLasCuatro(r);
    act(() => {
      r.root.findAll((n: ReactTestInstance) => n.type === SliderRating)[0].props.onChange(7);
    });

    await tocarRegistrar(r);

    expect(onEnviar).toHaveBeenCalledWith(expect.objectContaining({ energyLevel: 7, whatAmIDoing: 'algo' }));
  });
});
