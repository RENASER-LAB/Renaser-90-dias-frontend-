import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HojaDesdeAbajo: (p: { visible: boolean; titulo: string; alCerrar: () => void; children: React.ReactNode }) =>
      p.visible ? R.createElement(View, { testID: 'hoja', onClose: p.alCerrar } as object, R.createElement(Text, null, p.titulo), p.children) : null,
  };
});

import { HojaGuiaDeBateria } from '../HojaGuiaDeBateria';

function textos(r: ReactTestRenderer): string[] {
  return r.root.findAll((n: ReactTestInstance) => (n.type as unknown) === 'Text').map(n => [n.props.children].flat().join(''));
}
function botones(r: ReactTestRenderer): ReactTestInstance[] {
  return r.root.findAll((n: ReactTestInstance) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
}

describe('hoja de la guía de batería', () => {
  let alRevisar: jest.Mock;
  let alAhoraNo: jest.Mock;
  beforeEach(() => {
    alRevisar = jest.fn();
    alAhoraNo = jest.fn();
  });
  const montar = (visible = true) => {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(React.createElement(HojaGuiaDeBateria, { visible, linea: 'Línea de la marca.', alRevisar, alAhoraNo }));
    });
    return r;
  };

  it('dice el título, la línea de la marca y los dos botones', () => {
    const t = textos(montar());
    expect(t).toContain('Para que tu carrera siga con la app cerrada');
    expect(t).toContain('Línea de la marca.');
    expect(t).toContain('Revisar');
    expect(t).toContain('Ahora no');
  });

  it('«Revisar» llama a revisar y «Ahora no» a ahora no', () => {
    const r = montar();
    const [revisar] = botones(r).filter(b => b.findAll((n: ReactTestInstance) => (n.type as unknown) === 'Text' && n.props.children === 'Revisar').length > 0);
    act(() => revisar.props.onPress());
    expect(alRevisar).toHaveBeenCalledTimes(1);
    const ahoraNo = botones(r).find(b => b.props.accessibilityLabel === 'Ahora no')!;
    act(() => ahoraNo.props.onPress());
    expect(alAhoraNo).toHaveBeenCalledTimes(1);
  });

  it('cerrar la hoja es «Ahora no»', () => {
    const r = montar();
    act(() => r.root.findAll((n: ReactTestInstance) => n.props.testID === 'hoja')[0].props.onClose());
    expect(alAhoraNo).toHaveBeenCalledTimes(1);
    expect(alRevisar).not.toHaveBeenCalled();
  });

  it('oculta, no dibuja nada', () => {
    expect(textos(montar(false))).toEqual([]);
  });
});
