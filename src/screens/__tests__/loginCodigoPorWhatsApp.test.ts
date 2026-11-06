import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Spec 043 (D-325): el código de verificación por WhatsApp en la pantalla del ingreso. Con el canal apagado (o contra un backend anterior) el
 * ingreso es el de siempre; con el canal, «Solicitar acceso» pide el WhatsApp y, a los 60 segundos en la pantalla del código, aparece
 * «¿No te llegó? Envíamelo por WhatsApp».
 */

const mockDisponible = jest.fn<() => Promise<boolean>>();
const mockPedirRegistro = jest.fn<(email: string, whatsapp: string) => Promise<string | null>>();
const mockPedirRecuperacion = jest.fn<(email: string) => Promise<void>>();
const mockEnviarCodigo = jest.fn<(correo: string) => Promise<void>>();
const mockConfirmar = jest.fn<(datos: Record<string, unknown>, codigo: string) => Promise<string>>();
const mockEnviarCodigoReset = jest.fn<(correo: string) => Promise<void>>();

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) };
});
jest.mock('expo-image', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { Image: (props: Record<string, unknown>) => R.createElement('ExpoImage', props) };
});
jest.mock('../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined } }));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: jest.fn(), register: jest.fn(), loginWithGoogle: jest.fn(), loginWithApple: jest.fn() }),
}));
jest.mock('../../features/auth/hooks/useRegistroConOtp', () => ({
  ...jest.requireActual<typeof import('../../features/auth/hooks/useRegistroConOtp')>('../../features/auth/hooks/useRegistroConOtp'),
  useRegistroConOtp: () => ({
    accountRequestId: null,
    estadoSolicitud: null,
    enviarCodigo: (correo: string) => mockEnviarCodigo(correo),
    reenviarCodigo: jest.fn(),
    confirmarYRegistrar: (datos: Record<string, unknown>, codigo: string) => mockConfirmar(datos, codigo),
    confirmarRegistroSocial: jest.fn(),
    consultarEstado: jest.fn(),
  }),
}));
jest.mock('../../features/auth/hooks/useRecuperacionContrasena', () => ({
  useRecuperacionContrasena: () => ({
    enviarCodigo: (correo: string) => mockEnviarCodigoReset(correo),
    verificarCodigo: jest.fn(),
    cambiarContrasena: jest.fn(),
    reiniciar: () => undefined,
  }),
}));
jest.mock('../../features/legal/enlacesLegales', () => ({ abrirPoliticaDePrivacidad: () => undefined }));
jest.mock('../../features/auth/hooks/useDisponibilidadCorreo', () => ({ useDisponibilidadCorreo: () => 'idle' }));
jest.mock('../../features/auth/api/codigoPorWhatsAppApi', () => ({
  codigoPorWhatsAppDisponible: () => mockDisponible(),
  pedirCodigoDelRegistroPorWhatsApp: (email: string, whatsapp: string) => mockPedirRegistro(email, whatsapp),
  pedirCodigoDeRecuperacionPorWhatsApp: (email: string) => mockPedirRecuperacion(email),
}));

import { ApiError } from '../../services/http/apiClient';
import LoginScreen from '../LoginScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ENLACE = '¿No te llegó? Envíamelo por WhatsApp';
const EMPIEZA_CON_EL_ENLACE = new RegExp(`^${ENLACE.replace(/[?¿.]/g, m => `\\${m}`)}`);

async function montar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(LoginScreen));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
}

const tocable = (r: ReactTestRenderer, etiqueta: string | RegExp) =>
  r.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && typeof n.props.onPress === 'function'
    && (typeof etiqueta === 'string' ? n.props.accessibilityLabel === etiqueta : etiqueta.test(n.props.accessibilityLabel)))[0];

const campo = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onChangeText === 'function')[0];

async function pasar(segundos: number) {
  await act(async () => {
    jest.advanceTimersByTime(segundos * 1000);
  });
}

async function solicitarAcceso(r: ReactTestRenderer, conWhatsapp: boolean) {
  await act(async () => tocable(r, '¿No tienes cuenta? Solicitar acceso').props.onPress());
  act(() => campo(r, 'Nombres').props.onChangeText('Ana'));
  act(() => campo(r, 'Apellidos').props.onChangeText('Quispe'));
  act(() => campo(r, 'Correo electrónico').props.onChangeText('ana@renaser.test'));
  if (conWhatsapp) act(() => campo(r, 'WhatsApp').props.onChangeText('987654321'));
  act(() => campo(r, 'Contraseña').props.onChangeText('una-clave-muy-larga'));
  act(() => campo(r, 'Confirmar contraseña').props.onChangeText('una-clave-muy-larga'));
  await act(async () => tocable(r, 'Continuar y recibir código').props.onPress());
}

beforeEach(() => {
  jest.useFakeTimers();
  mockDisponible.mockReset();
  mockPedirRegistro.mockReset();
  mockPedirRecuperacion.mockReset();
  mockEnviarCodigo.mockReset().mockResolvedValue(undefined);
  mockConfirmar.mockReset().mockResolvedValue('solicitud-1');
  mockEnviarCodigoReset.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('el código por WhatsApp en el ingreso (spec 043)', () => {
  // spec 043 FR-013, SC-002
  it('sin el canal (interruptor apagado o backend anterior), «Solicitar acceso» no pide WhatsApp y nunca aparece el enlace', async () => {
    mockDisponible.mockResolvedValue(false);
    const r = await montar();
    await solicitarAcceso(r, false);
    expect(mockEnviarCodigo).toHaveBeenCalledWith('ana@renaser.test');
    await pasar(120);
    expect(campo(r, 'WhatsApp')).toBeUndefined();
    expect(textos(r)).not.toContain(ENLACE);
  });

  // spec 043 FR-003
  it('con el canal, «Solicitar acceso» pide el WhatsApp con el selector de país y no deja seguir sin él', async () => {
    mockDisponible.mockResolvedValue(true);
    const r = await montar();
    await act(async () => tocable(r, '¿No tienes cuenta? Solicitar acceso').props.onPress());
    expect(campo(r, 'WhatsApp')).toBeDefined();
    expect(tocable(r, /^Código de país/)).toBeDefined();
    act(() => campo(r, 'Nombres').props.onChangeText('Ana'));
    act(() => campo(r, 'Apellidos').props.onChangeText('Quispe'));
    act(() => campo(r, 'Correo electrónico').props.onChangeText('ana@renaser.test'));
    act(() => campo(r, 'Contraseña').props.onChangeText('una-clave-muy-larga'));
    act(() => campo(r, 'Confirmar contraseña').props.onChangeText('una-clave-muy-larga'));
    await act(async () => tocable(r, 'Continuar y recibir código').props.onPress());
    expect(mockEnviarCodigo).not.toHaveBeenCalled();
    expect(textos(r)).toMatch(/WhatsApp/);
  });

  // spec 043 FR-003, FR-012, FR-015
  it('en la pantalla del código, a los 60 s aparece el enlace con el número enmascarado y al tocarlo dice a dónde se envió', async () => {
    mockDisponible.mockResolvedValue(true);
    mockPedirRegistro.mockResolvedValue('+51 9•• ••• •21');
    const r = await montar();
    await solicitarAcceso(r, true);

    await pasar(59);
    expect(textos(r)).not.toContain(ENLACE);
    await pasar(2);
    expect(textos(r)).toContain(ENLACE);
    expect(textos(r)).toContain('Te lo enviamos a +51 9•• ••• •21.');
    const enlace = tocable(r, EMPIEZA_CON_EL_ENLACE);
    const estilo = Object.assign({}, ...[enlace.props.style].flat(3).filter(Boolean));
    expect(estilo.minHeight).toBeGreaterThanOrEqual(48);

    await act(async () => enlace.props.onPress());
    expect(mockPedirRegistro).toHaveBeenCalledWith('ana@renaser.test', '+51 987654321');
    expect(textos(r)).toContain('Te enviamos el código por WhatsApp a +51 9•• ••• •21.');

    // El WhatsApp viaja con la solicitud, para que al aceptarla quede en la ficha.
    const otp = r.root.findAll(n => typeof n.props.onChangeText === 'function' && n.props.maxLength === 6)[0]
      ?? r.root.findAll(n => typeof n.props.onChangeText === 'function' && n.props.keyboardType === 'number-pad')[0];
    act(() => otp.props.onChangeText('123456'));
    await act(async () => tocable(r, 'Verificar el código').props.onPress());
    expect(mockConfirmar.mock.calls[0][0]).toMatchObject({ email: 'ana@renaser.test', whatsapp: '+51 987654321' });
  });

  // spec 043 FR-015
  it('si el servidor no lo puede enviar, se dice su motivo y el enlace sigue para reintentar', async () => {
    mockDisponible.mockResolvedValue(true);
    mockPedirRegistro.mockRejectedValue(new ApiError(429, 'Espera un minuto antes de pedir otro código por WhatsApp.'));
    const r = await montar();
    await solicitarAcceso(r, true);
    await pasar(60);
    await act(async () => tocable(r, EMPIEZA_CON_EL_ENLACE).props.onPress());
    expect(textos(r)).toContain('Espera un minuto antes de pedir otro código por WhatsApp.');
    expect(tocable(r, EMPIEZA_CON_EL_ENLACE)).toBeDefined();
  });

  // spec 043 FR-008, FR-009, FR-012
  it('al recuperar la contraseña el enlace no muestra ningún número y dice lo mismo tenga o no WhatsApp la cuenta', async () => {
    mockDisponible.mockResolvedValue(true);
    mockPedirRecuperacion.mockResolvedValue(undefined);
    const r = await montar();
    await act(async () => tocable(r, 'Recuperar la contraseña').props.onPress());
    act(() => r.root.findAll(n => n.props.accessibilityLabel === 'Correo electrónico' && typeof n.props.onChangeText === 'function')[0]
      .props.onChangeText('ana@renaser.test'));
    await act(async () => tocable(r, 'Enviar el código de recuperación').props.onPress());
    await pasar(60);

    const enlace = tocable(r, EMPIEZA_CON_EL_ENLACE);
    expect(enlace.props.accessibilityLabel).toBe(ENLACE);
    expect(textos(r)).not.toMatch(/•/);
    await act(async () => enlace.props.onPress());
    expect(mockPedirRecuperacion).toHaveBeenCalledWith('ana@renaser.test');
    expect(textos(r)).toContain('Si tu cuenta tiene un WhatsApp guardado, te enviamos el código ahí.');
  });
});
