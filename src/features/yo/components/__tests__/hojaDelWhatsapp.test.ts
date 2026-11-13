import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text, TextInput } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/** Spec 051: la hoja de Yo → «WhatsApp»: número → código → confirmado, con lo que responde el servidor. */

const mockPedir = jest.fn<(n: string) => Promise<string | null>>();
const mockConfirmar = jest.fn<(n: string, c: string) => Promise<string | null>>();
jest.mock('../../api/whatsappConfirmadoApi', () => ({
  pedirCodigoDelWhatsapp: (n: string) => mockPedir(n),
  confirmarWhatsapp: (n: string, c: string) => mockConfirmar(n, c),
}));
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: { children?: unknown }) => children ?? null }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined } }));

import { ApiError } from '../../../../services/http/apiClient';
import { PhoneCountryInput } from '../../../../components/PhoneCountryInput';
import { HojaDelWhatsapp } from '../HojaDelWhatsapp';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
const textos = () => raiz!.root.findAll(n => (n.type as unknown) === Text).map(n => [n.props.children].flat().join(''));

function montar(props: Partial<React.ComponentProps<typeof HojaDelWhatsapp>> = {}) {
  const alConfirmar = jest.fn();
  const alCerrar = jest.fn();
  act(() => {
    raiz = TestRenderer.create(React.createElement(HojaDelWhatsapp, { visible: true, confirmado: null, alCerrar, alConfirmar, ...props }));
  });
  return { alConfirmar, alCerrar };
}

const botonDe = (etiqueta: string): ReactTestInstance =>
  raiz!.root.findAll(
    n => typeof n.props.onPress === 'function' && n.findAll((x: ReactTestInstance) => (x.type as unknown) === Text).some(t => [t.props.children].flat().join('') === etiqueta),
  )[0];
const botonApagado = (etiqueta: string) => !!botonDe(etiqueta).props.disabled;

function escribirNumero(valor: string) {
  const campo = raiz!.root.findAll(n => (n.type as unknown) === PhoneCountryInput)[0];
  act(() => campo.props.onChange(valor));
}
function escribirCodigo(valor: string) {
  const campo = raiz!.root.findAll(n => (n.type as unknown) === TextInput && n.props.keyboardType === 'number-pad')[0];
  act(() => campo.props.onChangeText(valor));
}
async function tocar(etiqueta: string) {
  await act(async () => botonDe(etiqueta).props.onPress());
}

beforeEach(() => {
  mockPedir.mockReset();
  mockConfirmar.mockReset();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('la hoja del WhatsApp', () => {
  // spec 051 FR-011
  it('parte en Perú, no deja enviar sin número y pide el código al número escrito', async () => {
    mockPedir.mockResolvedValue('+51 9•• ••• •21');
    montar();
    expect(textos()).toContain('Tu WhatsApp');
    expect(botonApagado('Enviar código')).toBe(true);
    escribirNumero('+51 987654321');
    expect(botonApagado('Enviar código')).toBe(false);
    await tocar('Enviar código');
    expect(mockPedir).toHaveBeenCalledWith('+51987654321');
    expect(textos()).toContain('Enviamos un código por WhatsApp a +51 9•• ••• •21.');
    expect(botonApagado('Confirmar')).toBe(true);
  });

  // spec 051 FR-011, FR-012
  it('confirma con las seis cifras, avisa a Yo para que relea y dice que quedó confirmado', async () => {
    mockPedir.mockResolvedValue('+51 9•• ••• •21');
    mockConfirmar.mockResolvedValue('+51 9•• ••• •21');
    const { alConfirmar } = montar();
    escribirNumero('+51 987654321');
    await tocar('Enviar código');
    escribirCodigo('12345');
    expect(botonApagado('Confirmar')).toBe(true);
    escribirCodigo('123456');
    await tocar('Confirmar');
    expect(mockConfirmar).toHaveBeenCalledWith('+51987654321', '123456');
    expect(alConfirmar).toHaveBeenCalledTimes(1);
    expect(textos()).toContain('Tu WhatsApp +51 9•• ••• •21 quedó confirmado.');
    expect(textos()).toContain('Listo');
  });

  // spec 051 FR-012
  it('un código incorrecto muestra el motivo del servidor bajo las casillas y no avisa a Yo', async () => {
    mockPedir.mockResolvedValue(null);
    mockConfirmar.mockRejectedValue(new ApiError(422, 'El código no es válido o ya venció. Pide uno nuevo.', { codigo: 'CODIGO_INCORRECTO' }));
    const { alConfirmar } = montar();
    escribirNumero('+51 987654321');
    await tocar('Enviar código');
    escribirCodigo('000000');
    await tocar('Confirmar');
    expect(textos()).toContain('El código no es válido o ya venció. Pide uno nuevo.');
    expect(alConfirmar).not.toHaveBeenCalled();
  });

  // spec 051 FR-012
  it('un número ya en uso o un límite al pedir el código se dicen bajo el campo y se puede volver a intentar', async () => {
    mockPedir.mockRejectedValueOnce(new ApiError(429, 'Ya pediste varios códigos por WhatsApp. Intenta de nuevo en una hora.')).mockResolvedValueOnce(null);
    montar();
    escribirNumero('+51 987654321');
    await tocar('Enviar código');
    expect(raiz!.root.findAll(n => (n.type as unknown) === PhoneCountryInput)[0].props.error).toBe(
      'Ya pediste varios códigos por WhatsApp. Intenta de nuevo en una hora.',
    );
    await tocar('Enviar código');
    expect(mockPedir).toHaveBeenCalledTimes(2);
  });

  // spec 051 FR-012
  it('un toque, un pedido: dos toques seguidos con el primero en vuelo mandan un solo código', async () => {
    let resolver: (v: string | null) => void = () => undefined;
    mockPedir.mockReturnValue(new Promise(r => { resolver = r; }));
    montar();
    escribirNumero('+51 987654321');
    const boton = botonDe('Enviar código');
    await act(async () => {
      boton.props.onPress();
      boton.props.onPress();
    });
    expect(mockPedir).toHaveBeenCalledTimes(1);
    await act(async () => resolver('+51 9•• ••• •21'));
  });

  // spec 051 FR-011
  it('«Cambiar número» vuelve al paso del número sin pedir nada', async () => {
    mockPedir.mockResolvedValue(null);
    montar();
    escribirNumero('+51 987654321');
    await tocar('Enviar código');
    await tocar('Cambiar número');
    expect(botonDe('Enviar código')).toBeDefined();
    expect(mockPedir).toHaveBeenCalledTimes(1);
  });
});
