import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockLogin = jest.fn<(correo: string, clave: string) => Promise<boolean>>();
const mockEnviarCodigo = jest.fn<(correo: string) => Promise<void>>();
const mockConfirmarCodigo = jest.fn<(correo: string, codigo: string) => Promise<string>>();
const mockCrear = jest.fn<(datos: Record<string, unknown>, token: string) => Promise<string>>();
let mockCanal = false;
const mockReenviar = jest.fn<(correo: string) => Promise<void>>();
const mockError = jest.fn();
const mockSeleccion = jest.fn();
let mockAtras: (() => boolean | void) | null = null;

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
jest.mock('../../hooks/useSystemBackHandler', () => ({
  useSystemBackHandler: (alVolver: () => boolean | void, activo = true) => {
    mockAtras = activo ? alVolver : null;
  },
}));
jest.mock('../../utils/tacto', () => ({
  tacto: { seleccion: () => mockSeleccion(), error: () => mockError(), logro: () => undefined },
}));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: (correo: string, clave: string) => mockLogin(correo, clave),
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
    loginWithApple: jest.fn(),
  }),
}));
jest.mock('../../features/auth/hooks/useRegistroConOtp', () => ({
  ...jest.requireActual<typeof import('../../features/auth/hooks/useRegistroConOtp')>(
    '../../features/auth/hooks/useRegistroConOtp',
  ),
  useRegistroConOtp: () => ({
    accountRequestId: null,
    estadoSolicitud: null,
    enviarCodigo: (correo: string) => mockEnviarCodigo(correo),
    reenviarCodigo: (correo: string) => mockReenviar(correo),
    confirmarCodigo: (correo: string, codigo: string) => mockConfirmarCodigo(correo, codigo),
    crearSolicitud: (datos: Record<string, unknown>, token: string) => mockCrear(datos, token),
    confirmarYRegistrar: jest.fn(),
    confirmarRegistroSocial: jest.fn(),
    consultarEstado: jest.fn(),
  }),
}));
jest.mock('../../features/auth/hooks/useRecuperacionContrasena', () => ({
  useRecuperacionContrasena: () => ({
    enviarCodigo: jest.fn(),
    verificarCodigo: jest.fn(),
    cambiarContrasena: jest.fn(),
    reiniciar: () => undefined,
  }),
}));
const mockAbrirPolitica = jest.fn();
jest.mock('../../features/legal/enlacesLegales', () => ({ abrirPoliticaDePrivacidad: () => mockAbrirPolitica() }));
jest.mock('../../features/auth/hooks/useDisponibilidadCorreo', () => ({ useDisponibilidadCorreo: () => 'idle' }));
// Spec 043: sin el canal de WhatsApp (como contra un backend anterior), el ingreso es el de siempre.
jest.mock('../../features/auth/api/codigoPorWhatsAppApi', () => ({
  codigoPorWhatsAppDisponible: () => Promise.resolve(mockCanal),
  pedirCodigoDelRegistroPorWhatsApp: jest.fn(),
  pedirCodigoDeRecuperacionPorWhatsApp: jest.fn(),
}));

import { ApiError } from '../../services/http/apiClient';
import LoginScreen from '../LoginScreen';

/**
 * Spec 052: «Solicitar acceso» por pasos. Un grupo de campos por pantalla, el contacto verificado con el código ANTES de crear la
 * cuenta (nombre, correo, WhatsApp, código, contraseña y términos), validación por paso, atrás sin perder lo escrito, el botón fuera
 * del scroll y el contrato del alta sin cambios.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function montar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(LoginScreen));
  });
  return r;
}

const tocable = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
const campo = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onChangeText === 'function')[0];
const titulo = (r: ReactTestRenderer) =>
  r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'header')[0]?.props.children;
const textos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
const escribir = (r: ReactTestRenderer, etiqueta: string, valor: string) =>
  act(() => campo(r, etiqueta).props.onChangeText(valor));
const continuar = (r: ReactTestRenderer, etiqueta = 'Continuar') => act(async () => tocable(r, etiqueta).props.onPress());
const alertas = (r: ReactTestRenderer) =>
  r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'alert');
const casilla = (r: ReactTestRenderer) =>
  r.root.findAll(n => typeof n.props.onChangeText === 'function' && n.props.maxLength === 6)[0];

async function abrirRegistro(r: ReactTestRenderer) {
  await act(async () => tocable(r, '¿No tienes cuenta? Solicitar acceso').props.onPress());
}

/** Nombre, correo y (con el canal) WhatsApp; el último «Continuar» pide el código y deja en la pantalla del código. */
async function hastaElCodigo(r: ReactTestRenderer, conWhatsapp = false) {
  await abrirRegistro(r);
  escribir(r, 'Nombres', 'Ana');
  escribir(r, 'Apellidos', 'Quispe');
  await continuar(r);
  escribir(r, 'Correo electrónico', 'ana@renaser.test');
  await continuar(r);
  if (conWhatsapp) {
    escribir(r, 'Número de WhatsApp', '987654321');
    await continuar(r);
  }
}

/** Escribe el código bueno y deja en el paso de la contraseña. */
async function verificar(r: ReactTestRenderer, codigo = '123456') {
  act(() => casilla(r).props.onChangeText(codigo));
  await act(async () => tocable(r, 'Verificar el código').props.onPress());
}

beforeEach(() => {
  mockLogin.mockReset();
  mockEnviarCodigo.mockReset().mockResolvedValue(undefined);
  mockConfirmarCodigo.mockReset().mockResolvedValue('token-1');
  mockCrear.mockReset().mockResolvedValue('solicitud-1');
  mockError.mockReset();
  mockSeleccion.mockReset();
  mockCanal = false;
  mockReenviar.mockReset().mockResolvedValue(undefined);
  mockAtras = null;
});

describe('«Solicitar acceso» por pasos', () => {
  // spec 052 FR-001
  it('sin el canal de WhatsApp son cuatro pasos; el avance dice en cuál va', async () => {
    const r = await montar();
    await abrirRegistro(r);
    expect(titulo(r)).toBe('¿Cómo te llamas?');
    expect(textos(r)).toContain('1 de 4');
    expect(r.root.findAll(n => typeof n.type === 'string' && n.props.testID === 'segmento-lleno')).toHaveLength(1);
    expect(r.root.findAll(n => typeof n.type === 'string' && n.props.testID === 'segmento-vacio')).toHaveLength(3);
  });

  // spec 052 FR-001
  it('con el canal: nombre, correo, WhatsApp, «Verifica tu correo o WhatsApp» y la contraseña, en ese orden', async () => {
    mockCanal = true;
    const r = await montar();
    await abrirRegistro(r);
    expect(textos(r)).toContain('1 de 5');
    escribir(r, 'Nombres', 'Ana');
    escribir(r, 'Apellidos', 'Quispe');
    await continuar(r);
    expect(titulo(r)).toBe('Tu correo');
    escribir(r, 'Correo electrónico', 'ana@renaser.test');
    await continuar(r);
    expect(titulo(r)).toBe('Tu WhatsApp');
    expect(textos(r)).toContain('3 de 5');
    escribir(r, 'Número de WhatsApp', '987654321');
    await continuar(r);
    // El contacto se verifica ANTES de pedir la contraseña.
    expect(mockEnviarCodigo).toHaveBeenCalledWith('ana@renaser.test');
    expect(titulo(r)).toBe('Verifica tu correo o WhatsApp');
    expect(textos(r)).toContain('4 de 5');
    expect(campo(r, 'Contraseña')).toBeUndefined();
    await verificar(r);
    expect(titulo(r)).toBe('Tu contraseña');
    expect(textos(r)).toContain('5 de 5');
    expect(tocable(r, 'Crear mi cuenta')).toBeDefined();
    expect(tocable(r, 'Continuar')).toBeUndefined();
    // Una sola línea de ayuda, ver/ocultar, el medidor de 3 segmentos y el check de términos; sin confirmación.
    expect(textos(r)).toContain('Mínimo 12 caracteres.');
    expect(tocable(r, 'Mostrar la contraseña')).toBeDefined();
    expect(r.root.findAll(n => typeof n.type === 'string' && n.props.testID === 'fuerza-vacia')).toHaveLength(3);
    expect(tocable(r, 'Acepto los términos')).toBeDefined();
    expect(campo(r, 'Confirmar contraseña')).toBeUndefined();
  });

  // spec 052 FR-002
  it('no avanza con el paso incompleto: dice qué falta bajo el campo, vibra y se queda', async () => {
    const r = await montar();
    await abrirRegistro(r);
    escribir(r, 'Nombres', 'Ana');
    await continuar(r);
    expect(titulo(r)).toBe('¿Cómo te llamas?');
    expect(alertas(r)).toHaveLength(1);
    expect(alertas(r)[0].props.children).toBe('Por favor ingresa tus apellidos');
    expect(mockError).toHaveBeenCalledTimes(1);
    expect(r.root.findAll(n => n.props.etiqueta === 'Apellidos')[0].props.conError).toBe(true);
    expect(r.root.findAll(n => n.props.etiqueta === 'Nombres')[0].props.conError).toBe(false);
  });

  // spec 052 FR-003
  it('atrás (flecha y gesto del sistema) vuelve al paso anterior sin perder lo escrito; desde el primero, al login', async () => {
    const r = await montar();
    await abrirRegistro(r);
    escribir(r, 'Nombres', 'Ana');
    escribir(r, 'Apellidos', 'Quispe');
    await continuar(r);
    escribir(r, 'Correo electrónico', 'ana@renaser.test');
    expect(mockAtras).not.toBeNull();

    act(() => {
      mockAtras!();
    });
    expect(titulo(r)).toBe('¿Cómo te llamas?');
    expect(campo(r, 'Nombres').props.value).toBe('Ana');
    expect(campo(r, 'Apellidos').props.value).toBe('Quispe');
    await continuar(r);
    expect(campo(r, 'Correo electrónico').props.value).toBe('ana@renaser.test');

    act(() => tocable(r, 'Volver al paso anterior').props.onPress());
    act(() => tocable(r, 'Volver al paso anterior').props.onPress());
    expect(titulo(r)).toBe('Iniciar sesión');
    await abrirRegistro(r);
    expect(campo(r, 'Nombres').props.value).toBe('Ana');
  });

  // spec 052 FR-003, FR-006
  it('con el contacto verificado, atrás salta el código; y si cambia el correo, se vuelve a verificar', async () => {
    const r = await montar();
    await hastaElCodigo(r);
    await verificar(r);
    expect(titulo(r)).toBe('Tu contraseña');
    act(() => tocable(r, 'Volver al paso anterior').props.onPress());
    expect(titulo(r)).toBe('Tu correo');
    // Sin tocar el correo, seguir no repite el código.
    mockEnviarCodigo.mockClear();
    await continuar(r);
    expect(mockEnviarCodigo).not.toHaveBeenCalled();
    expect(titulo(r)).toBe('Tu contraseña');
    // Con otro correo, el token ya no vale: hay que verificar de nuevo.
    act(() => tocable(r, 'Volver al paso anterior').props.onPress());
    escribir(r, 'Correo electrónico', 'otra@renaser.test');
    await continuar(r);
    expect(mockEnviarCodigo).toHaveBeenCalledWith('otra@renaser.test');
    expect(titulo(r)).toBe('Verifica tu correo');
  });

  // spec 052 FR-004
  it('el botón está fuera del scroll (sube con el teclado) y la zona se achica con un KeyboardAvoidingView', async () => {
    const r = await montar();
    await abrirRegistro(r);
    const scroll = r.root.findAll(n => n.props.keyboardShouldPersistTaps === 'handled')[0];
    expect(scroll.findAll(n => n.props.accessibilityLabel === 'Continuar')).toHaveLength(0);
    const evita = r.root.findAll(n => n.props.behavior === 'padding' && n.props.keyboardVerticalOffset === 0);
    expect(evita.length).toBeGreaterThan(0);
    expect(evita[0].findAll(n => n.props.accessibilityLabel === 'Continuar').length).toBeGreaterThan(0);
    expect(evita[0].findAll(n => n.props.keyboardShouldPersistTaps === 'handled').length).toBeGreaterThan(0);
  });

  // spec 052 FR-006, SC-002
  it('la solicitud se crea AL FINAL, con el token del código y los mismos campos de siempre', async () => {
    mockCanal = true;
    const r = await montar();
    await hastaElCodigo(r, true);
    expect(mockCrear).not.toHaveBeenCalled();
    await verificar(r);
    expect(mockConfirmarCodigo).toHaveBeenCalledWith('ana@renaser.test', '123456');
    expect(mockCrear).not.toHaveBeenCalled();
    escribir(r, 'Contraseña', 'una-clave-muy-larga');
    // Sin aceptar los términos no se crea.
    await continuar(r, 'Crear mi cuenta');
    expect(mockCrear).not.toHaveBeenCalled();
    expect(alertas(r)[0].props.children).toBe('Acepta los términos para continuar');
    act(() => tocable(r, 'Acepto los términos').props.onPress());
    await continuar(r, 'Crear mi cuenta');
    expect(mockCrear).toHaveBeenCalledTimes(1);
    expect(mockCrear.mock.calls[0][0]).toEqual({
      nombres: 'Ana',
      apellidos: 'Quispe',
      email: 'ana@renaser.test',
      contrasena: 'una-clave-muy-larga',
      whatsapp: '+51 987654321',
    });
    expect(mockCrear.mock.calls[0][1]).toBe('token-1');

    expect(titulo(r)).toBe('Listo, Ana');
    expect(textos(r)).toContain('Te avisaremos cuando aprueben tu acceso.');
    await act(async () => tocable(r, 'Ir al inicio').props.onPress());
    expect(titulo(r)).toBe('Iniciar sesión');
  });

  // spec 052 FR-006
  it('un 409 (correo con cuenta) al pedir el código vuelve al paso del correo con el motivo del servidor', async () => {
    mockEnviarCodigo.mockRejectedValue(new ApiError(409, 'Ese correo ya tiene una cuenta o una solicitud en curso.'));
    const r = await montar();
    await hastaElCodigo(r);
    expect(titulo(r)).toBe('Tu correo');
    expect(alertas(r)[0].props.children).toBe('Ese correo ya tiene una cuenta o una solicitud en curso.');
    expect(r.root.findAll(n => n.props.etiqueta === 'Correo electrónico')[0].props.conError).toBe(true);
  });

  // spec 052 FR-008
  it('el login no cambia: sigue con la cabecera, «Ingresar» y «¿Olvidaste tu contraseña?»', async () => {
    const r = await montar();
    expect(titulo(r)).toBe('Iniciar sesión');
    expect(tocable(r, 'Ingresar')).toBeDefined();
    expect(tocable(r, 'Recuperar la contraseña')).toBeDefined();
    expect(r.root.findAll(n => (n.type as unknown) === 'ExpoImage')).toHaveLength(1);
  });
});

describe('el código de verificación del registro (no se puede saltar)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // spec 052 FR-006
  it('tras el correo pide el código: no hay forma de llegar a la contraseña ni a «Listo» sin confirmarlo', async () => {
    const r = await montar();
    await hastaElCodigo(r);
    expect(titulo(r)).toBe('Verifica tu correo');
    expect(r.root.findAll(n => n.props.etiqueta === 'Contraseña')).toHaveLength(0);
    expect(tocable(r, 'Crear mi cuenta')).toBeUndefined();
    // Con el código incompleto no confirma nada.
    act(() => casilla(r).props.onChangeText('123'));
    await act(async () => tocable(r, 'Verificar el código').props.onPress());
    expect(mockConfirmarCodigo).not.toHaveBeenCalled();
    expect(titulo(r)).toBe('Verifica tu correo');
    expect(mockCrear).not.toHaveBeenCalled();
  });

  // spec 052 FR-006
  it('un código equivocado muestra el mensaje del servidor, vacía las casillas y se queda en el código', async () => {
    mockConfirmarCodigo.mockRejectedValue(new ApiError(400, 'El código no es válido o ya venció. Pide uno nuevo.'));
    const r = await montar();
    await hastaElCodigo(r);
    await verificar(r, '000000');
    expect(titulo(r)).toBe('Verifica tu correo');
    expect(textos(r)).toContain('El código no es válido o ya venció. Pide uno nuevo.');
    expect(casilla(r).props.value).toBe('');
    expect(mockCrear).not.toHaveBeenCalled();
  });

  // spec 052 FR-006
  it('«Reenviar» está apagado durante la cuenta atrás y, al terminar, manda otro código al correo', async () => {
    const r = await montar();
    await hastaElCodigo(r);
    expect(textos(r)).toContain('Reenviar en 45 s');
    expect(tocable(r, 'Reenviar el código al correo')).toBeUndefined();
    await act(async () => {
      jest.advanceTimersByTime(46000);
    });
    expect(textos(r)).not.toContain('Reenviar en');
    await act(async () => tocable(r, 'Reenviar el código al correo').props.onPress());
    expect(mockReenviar).toHaveBeenCalledWith('ana@renaser.test');
    expect(textos(r)).toContain('Te enviamos un código nuevo.');
    expect(textos(r)).toContain('Reenviar en 45 s');
  });

  // spec 052 FR-006
  it('con el código bueno avanza a la contraseña (todavía no hay solicitud) y recién al crear llega «Listo»', async () => {
    const r = await montar();
    await hastaElCodigo(r);
    await verificar(r);
    expect(mockConfirmarCodigo).toHaveBeenCalledTimes(1);
    expect(titulo(r)).toBe('Tu contraseña');
    expect(mockCrear).not.toHaveBeenCalled();
    escribir(r, 'Contraseña', 'una-clave-muy-larga');
    act(() => tocable(r, 'Acepto los términos').props.onPress());
    await continuar(r, 'Crear mi cuenta');
    expect(titulo(r)).toBe('Listo, Ana');
  });

  // spec 052 FR-006
  it('si el token venció al crear la solicitud, vuelve al código con el motivo del servidor', async () => {
    mockCrear.mockRejectedValue(new ApiError(400, 'La verificación de tu correo venció. Pide un código nuevo.'));
    const r = await montar();
    await hastaElCodigo(r);
    await verificar(r);
    escribir(r, 'Contraseña', 'una-clave-muy-larga');
    act(() => tocable(r, 'Acepto los términos').props.onPress());
    await continuar(r, 'Crear mi cuenta');
    expect(titulo(r)).toBe('Verifica tu correo');
    expect(textos(r)).toContain('La verificación de tu correo venció. Pide un código nuevo.');
  });
});
