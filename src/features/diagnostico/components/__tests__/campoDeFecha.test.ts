import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/** La pregunta de tipo FECHA (spec 026): el campo que abre las ruedas de día, mes y año y guarda `DD/MM/AAAA`. */

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
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() } }));
/* Las ruedas animan con el hilo nativo y la hoja con gestos: aquí solo importa lo que el campo hace con ellas. */
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HojaDesdeAbajo: ({ visible, pie, subtitulo }: { visible: boolean; pie: React.ReactNode; subtitulo?: string }) =>
      visible ? React.createElement(View, { testID: 'hoja' }, React.createElement('Text', null, subtitulo), pie) : null,
  };
});
jest.mock('../../../../components/fechaEnRuedas/RuedaDeValores', () => ({
  ALTO_FILA_RUEDA: 40,
  ARRIBA_FILA_CENTRAL: 80,
  RuedaDeValores: () => null,
}));

import { hoyEnLima } from '../../../../components/fechaEnRuedas/logicaDeFecha';
import { CampoDeFecha } from '../CampoDeFecha';
import { botonDe, textos, tocar, vaciar } from './ayudasDePrueba';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

async function montar(valor: string, alCambiar = jest.fn()): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(CampoDeFecha, { etiqueta: '¿Cuándo empezó tu negocio?', valor, alCambiar }));
    await vaciar();
  });
  raiz = r;
  return r;
}

describe('CampoDeFecha', () => {
  it('sin fecha invita a elegirla; con fecha la dice en palabras', async () => {
    expect(textos(await montar(''))).toContain('Elige la fecha');
    act(() => raiz?.unmount());
    expect(textos(await montar('15/06/2026'))).toContain('15 de junio de 2026');
  });

  it('el lector de pantalla dice la pregunta y la fecha', async () => {
    const r = await montar('15/06/2026');
    expect(r.root.findAll(n => n.props.accessibilityLabel === '¿Cuándo empezó tu negocio?: 15 de junio de 2026').length).toBeGreaterThan(0);
  });

  it('al abrir las ruedas arranca en la fecha elegida y «Listo» la confirma', async () => {
    const alCambiar = jest.fn();
    const r = await montar('15/06/2026', alCambiar);
    await tocar(r, '¿Cuándo empezó tu negocio?: 15 de junio de 2026');
    expect(textos(r)).toContain('15 de junio de 2026');
    await act(async () => {
      botonDe(r, 'LISTO').props.onPress();
      await vaciar();
    });
    expect(alCambiar).toHaveBeenCalledWith('15/06/2026');
  });

  it('sin fecha, las ruedas arrancan en hoy (en Lima) y no hay tope de mayoría de edad', async () => {
    const alCambiar = jest.fn();
    const r = await montar('', alCambiar);
    await tocar(r, '¿Cuándo empezó tu negocio?: sin elegir');
    await act(async () => {
      botonDe(r, 'LISTO').props.onPress();
      await vaciar();
    });
    const hoy = hoyEnLima();
    const esperado = `${String(hoy.dia).padStart(2, '0')}/${String(hoy.mes).padStart(2, '0')}/${hoy.anio}`;
    expect(alCambiar).toHaveBeenCalledWith(esperado);
  });
});
