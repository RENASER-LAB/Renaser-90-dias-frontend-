import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { TextInput } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El campo «WhatsApp» de Editar perfil: el control de la ficha (la píldora del país y el número), ya lleno con el número guardado, y los otros dos
 * estados —leyendo y sin poder leer— sin que el campo se dibuje a medias.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined },
}));

import { CampoWhatsappDelPerfil } from '../CampoWhatsappDelPerfil';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

function montar(props: Partial<React.ComponentProps<typeof CampoWhatsappDelPerfil>> = {}): ReactTestRenderer {
  const onCambiar = jest.fn();
  const onReintentar = jest.fn();
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(CampoWhatsappDelPerfil, {
        lectura: 'listo',
        valor: '+51 987654321',
        version: 0,
        error: null,
        onCambiar,
        onReintentar,
        ...props,
      }),
    );
  });
  return raiz!;
}

const textos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => typeof n.props.children === 'string' || Array.isArray(n.props.children))
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string').join(''));

function numero(r: ReactTestRenderer): ReactTestInstance | undefined {
  return r.root.findAll(n => n.type === TextInput && n.props.keyboardType === 'phone-pad')[0];
}

describe('el campo de WhatsApp de Editar perfil', () => {
  it('llega con el número de la ficha: el país en la píldora y el resto en el campo', () => {
    const r = montar();
    expect(textos(r)).toContain('WhatsApp');
    expect(numero(r)?.props.value).toBe('987654321');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Código de país: Perú, +51').length).toBeGreaterThan(0);
  });

  it('con el número de otro país, la píldora de ese país', () => {
    const r = montar({ valor: '+591 71234567' });
    expect(numero(r)?.props.value).toBe('71234567');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Código de país: Bolivia, +591').length).toBeGreaterThan(0);
  });

  it('escribir manda el número completo con su código, solo con dígitos', () => {
    const onCambiar = jest.fn();
    const r = montar({ valor: '+51 ', onCambiar });
    act(() => numero(r)!.props.onChangeText('9 12-34a5678'));
    expect(onCambiar).toHaveBeenCalledWith('+51 912345678');
  });

  it('el largo máximo lo pone el país (9 dígitos en Perú)', () => {
    const r = montar();
    expect(numero(r)?.props.maxLength).toBe(9);
  });

  it('el número rechazado se muestra con su motivo', () => {
    const r = montar({ error: 'Por favor ingresa tu número de WhatsApp para contacto con tu mentor.' });
    expect(textos(r)).toContain('Por favor ingresa tu número de WhatsApp para contacto con tu mentor.');
  });

  it('mientras se lee no se dibuja el campo: queda una caja que dice «Cargando…»', () => {
    for (const lectura of ['pendiente', 'cargando'] as const) {
      const r = montar({ lectura });
      expect(numero(r)).toBeUndefined();
      expect(textos(r)).toContain('Cargando…');
      act(() => raiz?.unmount());
    }
  });

  it('si no se pudo leer, lo dice y deja reintentar; no se dibuja un campo vacío que se pueda guardar', () => {
    const onReintentar = jest.fn();
    const r = montar({ lectura: 'error', onReintentar });
    expect(numero(r)).toBeUndefined();
    expect(textos(r)).toContain('No pudimos cargar tu WhatsApp.');
    const reintentar = r.root.findAll(n => n.props.accessibilityLabel === 'No pudimos cargar tu WhatsApp. Reintentar' && typeof n.props.onPress === 'function')[0];
    act(() => reintentar.props.onPress());
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it('una lectura nueva (otra versión) arma el campo de nuevo con el país del número nuevo', () => {
    const r = montar();
    act(() => {
      r.update(
        React.createElement(CampoWhatsappDelPerfil, {
          lectura: 'listo',
          valor: '+52 5512345678',
          version: 1,
          error: null,
          onCambiar: () => undefined,
          onReintentar: () => undefined,
        }),
      );
    });
    expect(numero(r)?.props.value).toBe('5512345678');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Código de país: México, +52').length).toBeGreaterThan(0);
  });
});
