/**
 * La guía de arranque («✳ SER») y el panel de SER (issue #50).
 *
 * E2E del 29/10: con una cuenta sin el Pacto firmado, la guía apareció ENCIMA del panel de SER y su «Ahora no» no
 * respondía (solo cerraba el «atrás»). Dos causas en el código:
 *  1. La tarjeta no sabía del panel: si le tocaba abrirse con el chat ya a la vista (sus tres lecturas al servidor
 *     terminaron tarde, o el estado cambió al volver de la cámara), su `Modal` quedaba encima del chat.
 *  2. Cualquier cambio de `estado.paso` —también «publicar» → «ninguno» → «publicar», que es lo que ocurre cuando una lectura
 *     falla al volver de segundo plano— reabría una guía que la persona ya había pospuesto.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { BackHandler, Modal } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { PasoArranque } from '../hooks/useArranqueGuiado';

const mockEstado: { actual: PasoArranque } = { actual: { paso: 'PUBLICAR_PRIMER_POST' } };
const mockSesion = { isAuthenticated: true, isOnboardingCompleted: true, user: { name: 'Marta Pérez' } };
const mockIrAPestana = jest.fn<(...args: unknown[]) => boolean>(() => true);

jest.mock('../hooks/useArranqueGuiado', () => ({
  useArranqueGuiado: () => ({ estado: mockEstado.actual, revisar: jest.fn(), marcarPactoFirmado: jest.fn() }),
}));
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => mockSesion }));
jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: { children?: unknown }) => children ?? null }));
jest.mock('../../onboarding/screens/PactoScreen', () => ({ PactoScreen: () => null }));
jest.mock('../../../navigation/navegacionRef', () => ({ irAPestana: (...args: unknown[]) => mockIrAPestana(...args) }));

import { hayCapaObligatoriaAbierta, olvidarCapasObligatorias } from '../../../navigation/capasObligatorias';
import { marcarPanelDeSerAbierto, olvidarPanelesDeSer } from '../../renasia/state/panelDeSerAbierto';
import { SparkieOverlay } from '../components/SparkieOverlay';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

function dibujar() {
  act(() => {
    raiz = TestRenderer.create(React.createElement(SparkieOverlay));
  });
}
/** Vuelve a dibujar (el estado del arranque vive en un doble que cambia fuera de React). */
function redibujar() {
  act(() => raiz!.update(React.createElement(SparkieOverlay)));
}
function pasarA(paso: PasoArranque['paso']) {
  mockEstado.actual = { paso } as PasoArranque;
  redibujar();
}

/** Los `Modal` montados con `visible` (el mock de React Native no dibuja el que va con `visible={false}`). */
const modalesVisibles = () => raiz!.root.findAll(n => (n.type as unknown) === Modal && n.props.visible === true);
const hayTarjeta = () => modalesVisibles().length > 0;
const boton = (etiqueta: string) =>
  raiz!.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
const hayBurbuja = () => boton('Volver a la guía de SER') !== undefined;

beforeEach(() => {
  mockEstado.actual = { paso: 'PUBLICAR_PRIMER_POST' };
  mockSesion.isAuthenticated = true;
  mockSesion.isOnboardingCompleted = true;
  mockIrAPestana.mockClear();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  olvidarPanelesDeSer();
  olvidarCapasObligatorias();
});

describe('la guía no se monta sobre el panel de SER', () => {
  it('sin panel abierto, la tarjeta aparece como siempre', () => {
    dibujar();
    expect(hayTarjeta()).toBe(true);
  });

  it('si el panel ya estaba abierto cuando a la guía le toca abrirse (las lecturas llegaron tarde), espera', () => {
    mockEstado.actual = { paso: 'CARGANDO' };
    dibujar();
    act(() => {
      marcarPanelDeSerAbierto();
    });
    pasarA('PUBLICAR_PRIMER_POST');
    expect(hayTarjeta()).toBe(false);
    // No se pierde ni se minimiza: no hay burbuja y sigue pendiente.
    expect(hayBurbuja()).toBe(false);
  });

  it('si el panel se abre con la tarjeta pendiente, la tarjeta se retira; al cerrar el panel, vuelve', () => {
    dibujar();
    let quitar!: () => void;
    act(() => {
      quitar = marcarPanelDeSerAbierto();
    });
    expect(hayTarjeta()).toBe(false);
    act(() => quitar());
    expect(hayTarjeta()).toBe(true);
  });

  it('con el panel abierto, el «atrás» es del panel: la guía suelta el suyo y no lo intercepta', () => {
    const quitar = jest.fn();
    const suscripciones = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({ remove: quitar }));
    dibujar();
    expect(suscripciones.mock.calls.filter(([evento]) => evento === 'hardwareBackPress')).toHaveLength(1);
    expect(quitar).not.toHaveBeenCalled();

    act(() => {
      marcarPanelDeSerAbierto();
    });
    expect(quitar).toHaveBeenCalledTimes(1);
    expect(suscripciones.mock.calls.filter(([evento]) => evento === 'hardwareBackPress')).toHaveLength(1);
    suscripciones.mockRestore();
  });

  it('un aviso del teléfono sigue esperando la guía aunque el panel la tape (D-218)', () => {
    dibujar();
    expect(hayCapaObligatoriaAbierta()).toBe(true);
    act(() => {
      marcarPanelDeSerAbierto();
    });
    expect(hayTarjeta()).toBe(false);
    expect(hayCapaObligatoriaAbierta()).toBe(true);
  });
});

describe('«Ahora no»', () => {
  it('guarda la tarjeta en la burbuja y la tarjeta no vuelve sola', () => {
    dibujar();
    act(() => boton('Posponer la guía de SER').props.onPress());
    expect(hayTarjeta()).toBe(false);
    expect(hayBurbuja()).toBe(true);
    // La capa obligatoria se libera: minimizada ya no frena los avisos.
    expect(hayCapaObligatoriaAbierta()).toBe(false);
  });

  it('la burbuja la vuelve a abrir', () => {
    dibujar();
    act(() => boton('Posponer la guía de SER').props.onPress());
    act(() => boton('Volver a la guía de SER').props.onPress());
    expect(hayTarjeta()).toBe(true);
  });
});

describe('una guía pospuesta no se reabre sola', () => {
  it('una lectura que falla («ninguno») y vuelve al mismo paso no la reabre', () => {
    dibujar();
    act(() => boton('Posponer la guía de SER').props.onPress());
    pasarA('NINGUNO');
    pasarA('PUBLICAR_PRIMER_POST');
    expect(hayTarjeta()).toBe(false);
    expect(hayBurbuja()).toBe(true);
  });

  it('pasar por «cargando» tampoco', () => {
    dibujar();
    act(() => boton('Posponer la guía de SER').props.onPress());
    pasarA('CARGANDO');
    pasarA('PUBLICAR_PRIMER_POST');
    expect(hayTarjeta()).toBe(false);
  });

  it('avanzar de verdad al Pacto sí la reabre: es lo que hay que cerrar', () => {
    dibujar();
    act(() => boton('Posponer la guía de SER').props.onPress());
    pasarA('FIRMAR_PACTO');
    expect(hayTarjeta()).toBe(true);
  });

  it('avanzar al Pacto pasando por «ninguno» también la reabre', () => {
    dibujar();
    act(() => boton('Posponer la guía de SER').props.onPress());
    pasarA('NINGUNO');
    pasarA('FIRMAR_PACTO');
    expect(hayTarjeta()).toBe(true);
  });

  it('otra cuenta que entra después de salir empieza con la guía abierta', () => {
    dibujar();
    act(() => boton('Posponer la guía de SER').props.onPress());
    mockSesion.isAuthenticated = false;
    pasarA('NINGUNO');
    mockSesion.isAuthenticated = true;
    pasarA('PUBLICAR_PRIMER_POST');
    expect(hayTarjeta()).toBe(true);
  });
});
