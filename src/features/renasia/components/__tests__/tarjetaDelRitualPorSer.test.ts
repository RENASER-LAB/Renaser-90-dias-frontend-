import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Spec 038: la tarjeta de SER para un ritual dice «Escribir cómo me siento» (no «Tomar foto») y la de un hábito con foto, lo de siempre. Rótulos en
 * tipo oración y en segunda persona. Contra el código anterior fallan: la tarjeta decía siempre «TOMAR FOTO» y «EVIDENCIA DE TU HÁBITO».
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../components/GoldButton', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { GoldButton: (props: { label: string; onPress: () => void }) => R.createElement('BotonDeLaTarjeta', { label: props.label, onPress: props.onPress }) };
});
jest.mock('../../../../components/Icon', () => ({ Icon: () => null, TAMANO_ICONO: { chico: 16, normal: 20, grande: 24 } }));

import type { PedidoDeFotoUI } from '../../types/renasia.types';
import { TarjetaFotoDeHabito } from '../TarjetaFotoDeHabito';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MAÑANA = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
const pedido = (extra: Partial<PedidoDeFotoUI>): PedidoDeFotoUI => ({
  registroId: 'r-1',
  titulo: 'Ritual tierra - agua - fuego (mañana)',
  venceEn: MAÑANA,
  conPregunta: false,
  destino: 'habito',
  estado: 'pendiente',
  ...extra,
});

function dibujar(p: PedidoDeFotoUI) {
  const alTocar = jest.fn();
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(TarjetaFotoDeHabito, { pedido: p, onTomarFoto: alTocar }));
  });
  const textos = raiz.root
    .findAll(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string').join(''));
  const boton = raiz.root.findAll((x: ReactTestInstance) => (x.type as unknown) === 'BotonDeLaTarjeta')[0];
  return { textos, boton, alTocar };
}

describe('la tarjeta de SER', () => {
  it('un ritual dice «Escribir cómo me siento», no «Tomar foto», y al tocarla abre el registro', () => {
    const { textos, boton, alTocar } = dibujar(pedido({ conPregunta: true }));

    expect(boton.props.label).toBe('Escribir cómo me siento');
    expect(textos).toContain('Registro de tu ritual');
    expect(JSON.stringify(textos)).not.toMatch(/foto/i);
    boton.props.onPress();
    expect(alTocar).toHaveBeenCalledTimes(1);
  });

  it('un hábito con foto sigue diciendo «Tomar foto», en tipo oración', () => {
    const { textos, boton } = dibujar(pedido({ titulo: 'JUGO VERDE' }));

    expect(boton.props.label).toBe('Tomar foto');
    expect(textos).toContain('Evidencia de tu hábito');
  });

  it('una acción del día es «Evidencia de tu acción» con foto, aunque el servidor mande conPregunta', () => {
    const { textos, boton } = dibujar(pedido({ destino: 'roca', conPregunta: true, titulo: 'Llamar a 3 clientes' }));

    expect(boton.props.label).toBe('Tomar foto');
    expect(textos).toContain('Evidencia de tu acción');
  });

  it('registrado, el ritual dice que quedó registrado su ritual; vencido, habla en segunda persona', () => {
    expect(dibujar(pedido({ conPregunta: true, estado: 'registrado' })).textos).toContain('Listo, quedó registrado tu ritual.');
    expect(dibujar(pedido({ estado: 'vencido' })).textos).toContain('Tu día ya cerró: solo se registran los hábitos del día.');
  });
});
