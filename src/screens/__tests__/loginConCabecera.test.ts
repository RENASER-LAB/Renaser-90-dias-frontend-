import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El login rehecho el 2026-10-05 (pedido del dueño): cabecera con la imagen y la onda, «Iniciar
 * sesión» con dos campos, «Ingresar» abajo y «¿No tienes cuenta? Solicitar acceso» al pie, que
 * lleva a la vista del alta. Lo que se fue no tiene que volver (la luna, Google «Próximamente», el
 * separador «o accede con», las pestañas), y la lógica de siempre tiene que seguir intacta: el
 * mismo `login(correo, contraseña)`, los mismos mensajes, ahora debajo del campo y con la vibración
 * de error.
 */

const mockLogin = jest.fn<(correo: string, clave: string) => Promise<boolean>>();
const mockEnviarCodigo = jest.fn<(correo: string) => Promise<void>>();
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
    reenviarCodigo: jest.fn(),
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
jest.mock('../../features/auth/hooks/useDisponibilidadCorreo', () => ({ useDisponibilidadCorreo: () => 'idle' }));

import { ApiError } from '../../services/http/apiClient';
import LoginScreen from '../LoginScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(LoginScreen));
  });
  return r;
}

/** Todo el texto visible, incluidos los `Text` anidados («¿No tienes cuenta? **Solicitar acceso**»). */
function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
}

const tocable = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

const campo = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onChangeText === 'function')[0];

/** El campo entero (rótulo, recuadro y lo que va debajo), por su rótulo. */
const grupo = (r: ReactTestRenderer, etiqueta: string) => r.root.findAll(n => n.props.etiqueta === etiqueta)[0];

const titulo = (r: ReactTestRenderer) =>
  r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'header')[0]?.props.children;

beforeEach(() => {
  mockLogin.mockReset();
  mockEnviarCodigo.mockReset();
  mockError.mockReset();
  mockSeleccion.mockReset();
  mockAtras = null;
});

describe('el login con cabecera', () => {
  it('muestra «Iniciar sesión», los dos campos, «Ingresar» y «Solicitar acceso» al pie', () => {
    const r = montar();
    expect(titulo(r)).toBe('Iniciar sesión');
    expect(campo(r, 'Correo electrónico')).toBeDefined();
    expect(campo(r, 'Contraseña')).toBeDefined();
    expect(tocable(r, 'Ingresar')).toBeDefined();
    expect(tocable(r, 'Recuperar la contraseña')).toBeDefined();
    expect(tocable(r, '¿No tienes cuenta? Solicitar acceso')).toBeDefined();
    // La imagen de la cabecera y el degradado que la funde con el fondo (no un corte sólido).
    expect(r.root.findAll(n => (n.type as unknown) === 'ExpoImage')).toHaveLength(1);
    const degradado = r.root.findAll(n => n.props.testID === 'cabecera-degradado' && Array.isArray(n.props.colors))[0];
    expect(degradado.props.colors[0]).toBe('#FCFBF900');
    expect(degradado.props.colors[degradado.props.colors.length - 1]).toBe('#FCFBF9FF');
  });

  it('ya no tiene la luna, ni Google «Próximamente», ni «o accede con», ni las pestañas', () => {
    const r = montar();
    const etiquetas = r.root.findAll(n => typeof n.props.accessibilityLabel === 'string').map(n => n.props.accessibilityLabel);
    expect(etiquetas).not.toContain('Activar modo oscuro');
    expect(etiquetas).not.toContain('Activar modo claro');
    expect(etiquetas).not.toContain('Iniciar sesión o crear cuenta');
    expect(etiquetas.some(e => /google/i.test(e))).toBe(false);
    const todo = textos(r);
    expect(todo).not.toMatch(/Google|o accede con|Crear cuenta|90 Días para redefinir/);
  });

  it('el ojo y «¿Olvidaste…?» tienen al menos 44 de alto táctil', () => {
    const r = montar();
    const ojo = tocable(r, 'Mostrar la contraseña');
    const olvido = tocable(r, 'Recuperar la contraseña');
    const estilo = (n: { props: { style?: unknown } }) => Object.assign({}, ...[n.props.style].flat(3).filter(Boolean));
    expect(estilo(ojo).height).toBeGreaterThanOrEqual(44);
    expect(estilo(olvido).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('entra con el correo y la contraseña de siempre', async () => {
    mockLogin.mockResolvedValue(true);
    const r = montar();
    act(() => campo(r, 'Correo electrónico').props.onChangeText('ana@renaser.test'));
    act(() => campo(r, 'Contraseña').props.onChangeText('una-clave-larga'));
    await act(async () => {
      tocable(r, 'Ingresar').props.onPress();
    });
    expect(mockLogin).toHaveBeenCalledWith('ana@renaser.test', 'una-clave-larga');
    expect(mockSeleccion).toHaveBeenCalledTimes(1);
    expect(mockError).not.toHaveBeenCalled();
  });

  it('si el servidor rechaza, el mensaje va bajo la contraseña, el campo se marca y vibra con error', async () => {
    mockLogin.mockRejectedValue(new ApiError(401, 'Correo o contraseña incorrectos.'));
    const r = montar();
    act(() => campo(r, 'Correo electrónico').props.onChangeText('ana@renaser.test'));
    act(() => campo(r, 'Contraseña').props.onChangeText('mal'));
    await act(async () => {
      tocable(r, 'Ingresar').props.onPress();
    });
    const alerta = r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'alert');
    expect(alerta).toHaveLength(1);
    expect(alerta[0].props.children).toBe('Correo o contraseña incorrectos.');
    expect(mockError).toHaveBeenCalledTimes(1);
    // El mensaje está DENTRO del grupo de la contraseña, no arriba del formulario.
    const grupoContrasena = grupo(r, 'Contraseña');
    expect(grupoContrasena.findAll(n => n.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
  });

  it('sin correo no llama al servidor: avisa bajo el correo y vibra', async () => {
    const r = montar();
    await act(async () => {
      tocable(r, 'Ingresar').props.onPress();
    });
    expect(mockLogin).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Por favor ingresa tu correo electrónico');
    expect(mockError).toHaveBeenCalledTimes(1);
    const grupoCorreo = grupo(r, 'Correo electrónico');
    expect(grupoCorreo.findAll(n => n.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
  });
});

describe('«Solicitar acceso»', () => {
  it('se abre desde el pie con sus campos de siempre y vuelve con «¿Ya tienes cuenta? Iniciar sesión»', () => {
    const r = montar();
    act(() => tocable(r, '¿No tienes cuenta? Solicitar acceso').props.onPress());
    expect(titulo(r)).toBe('Solicitar acceso');
    for (const etiqueta of ['Nombres', 'Apellidos', 'Correo electrónico', 'Contraseña', 'Confirmar contraseña']) {
      expect(campo(r, etiqueta)).toBeDefined();
    }
    expect(tocable(r, 'Continuar y recibir código')).toBeDefined();
    expect(tocable(r, 'Volver a iniciar sesión')).toBeDefined();

    act(() => tocable(r, '¿Ya tienes cuenta? Iniciar sesión').props.onPress());
    expect(titulo(r)).toBe('Iniciar sesión');
    expect(campo(r, 'Nombres')).toBeUndefined();
  });

  it('el atrás del sistema vuelve al login (en el login no se intercepta)', () => {
    const r = montar();
    expect(mockAtras).toBeNull();
    act(() => tocable(r, '¿No tienes cuenta? Solicitar acceso').props.onPress());
    expect(mockAtras).not.toBeNull();
    act(() => {
      mockAtras!();
    });
    expect(titulo(r)).toBe('Iniciar sesión');
  });

  it('valida igual que antes y no pide el código con datos incompletos', async () => {
    const r = montar();
    act(() => tocable(r, '¿No tienes cuenta? Solicitar acceso').props.onPress());
    await act(async () => {
      tocable(r, 'Continuar y recibir código').props.onPress();
    });
    expect(mockEnviarCodigo).not.toHaveBeenCalled();
    expect(r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'alert')).toHaveLength(1);
  });
});

describe('la cabecera', () => {
  it('si la imagen no carga, dibuja la ilustración de respaldo en su lugar', () => {
    const r = montar();
    const imagen = r.root.findAll(n => (n.type as unknown) === 'ExpoImage')[0];
    act(() => imagen.props.onError());
    expect(r.root.findAll(n => (n.type as unknown) === 'ExpoImage')).toHaveLength(0);
    expect(textos(r)).toContain('RENASER');
  });
});
