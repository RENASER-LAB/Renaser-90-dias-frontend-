import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * ONB-02 (e2e web del 27/09): en Términos del onboarding, «CONTINUAR» quedaba apagado hasta marcar
 * la casilla y firmar, sin ningún texto que dijera qué faltaba. Las alertas que lo dicen («Aceptación
 * requerida», «Firma requerida») ya estaban escritas, pero con el botón apagado nunca salían. Los
 * otros capítulos avisan así, con el botón encendido (AGENTS.md §5).
 */

const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockFirma = jest.fn<(props: { onSignatureChange: (valida: boolean, datos: { type: string; data: string }) => void }) => void>();
const mockGuardarCapitulo = jest.fn(async (_respuestas: unknown) => ({ pendientes: 0 }));
const mockGuardarFirma = jest.fn(async (_firma: unknown) => ({ ok: true }));

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
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, mensaje?: string) => mockAlerta(titulo, mensaje) },
}));
jest.mock('../../../../components/SignatureCanvas', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    SignatureCanvas: React.forwardRef((props: Parameters<typeof mockFirma>[0], ref) => {
      React.useImperativeHandle(ref, () => ({ capturarComoPngBase64: async () => 'png-base64' }));
      mockFirma(props);
      return null;
    }),
    safeParsePaths: (valor: unknown) => valor,
  };
});
jest.mock('../../hooks/usePersistenciaOnboarding', () => ({
  usePersistenciaOnboarding: () => ({
    guardarCapitulo: (respuestas: unknown) => mockGuardarCapitulo(respuestas),
    guardarFirma: (firma: unknown) => mockGuardarFirma(firma),
    aceptarHito: async () => undefined,
    avanzarEstado: async () => undefined,
  }),
}));

import { TerminosScreen } from '../TerminosScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
const onAccept = jest.fn();

function montar(): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(TerminosScreen, { onAccept, onBack: () => undefined }));
  });
  return r;
}

const continuar = (r: ReactTestRenderer) => r.root.findAll(n => n.props.label === 'CONTINUAR')[0];

/** Como en la pantalla: un botón apagado (o guardando) no responde al toque. */
async function tocarContinuar(r: ReactTestRenderer) {
  const boton = continuar(r);
  if (boton.props.disabled || boton.props.loading) return;
  await act(async () => {
    boton.props.onPress();
  });
}

function marcarCasilla(r: ReactTestRenderer) {
  const [casilla] = r.root.findAll(n => n.props.title === 'He leído y acepto los Términos y Condiciones');
  act(() => casilla.props.onToggle(true));
}

function firmar() {
  act(() => mockFirma.mock.lastCall![0].onSignatureChange(true, { type: 'draw', data: '[[1,2],[3,4]]' }));
}

beforeEach(() => {
  mockAlerta.mockReset();
  mockFirma.mockReset();
  mockGuardarCapitulo.mockClear();
  mockGuardarFirma.mockClear();
  onAccept.mockReset();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('Términos: CONTINUAR dice qué falta', () => {
  it('sin casilla ni firma, el botón no está apagado y avisa la casilla', async () => {
    raiz = montar();
    expect(continuar(raiz).props.disabled).toBeFalsy();

    await tocarContinuar(raiz);
    expect(mockAlerta).toHaveBeenCalledWith(
      'Aceptación requerida',
      'Por favor marca la casilla de lectura y aceptación de los términos y condiciones.'
    );
    // La firma que falta se marca en su recuadro.
    expect(mockFirma.mock.lastCall![0]).toEqual(
      expect.objectContaining({ error: 'Por favor dibuja tu firma con el dedo para continuar' })
    );
    expect(mockGuardarCapitulo).not.toHaveBeenCalled();
  });

  it('con la casilla y sin firma, avisa la firma', async () => {
    raiz = montar();
    marcarCasilla(raiz);

    await tocarContinuar(raiz);
    expect(mockAlerta).toHaveBeenCalledWith(
      'Firma requerida',
      'Por favor dibuja tu firma con el dedo en el recuadro para validar la aceptación legal.'
    );
    expect(mockGuardarCapitulo).not.toHaveBeenCalled();
  });

  it('con las dos, guarda y sigue como siempre', async () => {
    raiz = montar();
    marcarCasilla(raiz);
    firmar();

    await tocarContinuar(raiz);
    expect(mockAlerta).not.toHaveBeenCalled();
    expect(mockGuardarCapitulo).toHaveBeenCalledTimes(1);
    expect(mockGuardarFirma).toHaveBeenCalledWith(expect.objectContaining({ flow: 'terminos', pngBase64: 'png-base64' }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
