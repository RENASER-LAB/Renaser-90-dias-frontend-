import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Yo → «Eliminar mi cuenta» (D-243): con contraseña o con código, confirmación antes de enviar,
 * errores del servidor en pantalla y, tras el 200, el aviso de cierre y el logout local.
 */

const mockLeer = jest.fn(async (): Promise<unknown> => ({ confirmaCon: 'CONTRASENA', diasDeGracia: 30 }));
const mockCodigo = jest.fn(async (): Promise<void> => undefined);
const mockEliminar = jest.fn(async (_c: unknown): Promise<unknown> => ({
  cerradaEn: '2026-10-02T15:00:00Z',
  seBorraEl: '2026-11-01T15:00:00Z',
  diasDeGracia: 30,
}));
const mockConfirmar = jest.fn(async (_t: string, _m: string): Promise<boolean> => true);
const mockAlerta = jest.fn((_t: string, _m?: string) => undefined);

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
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (t: string, m?: string) => mockAlerta(t, m) },
}));
jest.mock('../../utils/confirmarEliminacion', () => ({
  confirmarEliminacion: (t: string, m: string) => mockConfirmar(t, m),
}));
jest.mock('../../api/cuentaApi', () => ({
  leerComoSeConfirma: () => mockLeer(),
  enviarmeCodigoParaEliminar: () => mockCodigo(),
  eliminarMiCuenta: (c: unknown) => mockEliminar(c),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { EliminarMiCuentaScreen } from '../EliminarMiCuentaScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const onCerrada = jest.fn();
const onVolver = jest.fn();

async function montar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(EliminarMiCuentaScreen, { onVolver, onCerrada }));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
}

const boton = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
const campo = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onChangeText === 'function')[0];
const deshabilitado = (r: ReactTestRenderer, etiqueta: string) => boton(r, etiqueta).props.disabled === true;

// La primera prueba monta la pantalla en frío (tema, Legible, Alerta) y con la suite completa en paralelo
// pasaba los 5 s por defecto; al cortarse, su envío pendiente caía en la prueba siguiente (E-430).
jest.setTimeout(20000);

beforeEach(() => {
  mockLeer.mockReset();
  mockLeer.mockResolvedValue({ confirmaCon: 'CONTRASENA', diasDeGracia: 30 });
  mockCodigo.mockReset();
  mockEliminar.mockClear();
  mockConfirmar.mockReset();
  mockConfirmar.mockResolvedValue(true);
  mockAlerta.mockClear();
  onCerrada.mockClear();
});

describe('Eliminar mi cuenta', () => {
  it('con contraseña: explica qué pasa, pide confirmar y tras el 200 avisa y cierra la sesión local', async () => {
    const r = await montar();
    const texto = textos(r);
    expect(texto).toContain('Tu cuenta se cierra al instante');
    expect(texto).toContain('Durante 30 días puedes pedir a soporte que la recupere.');
    expect(texto).toContain('Después, tus datos se borran para siempre.');
    expect(deshabilitado(r, 'Eliminar mi cuenta')).toBe(true);

    expect(campo(r, 'Tu contraseña').props.secureTextEntry).toBe(true);
    act(() => campo(r, 'Tu contraseña').props.onChangeText('secreta'));
    expect(deshabilitado(r, 'Eliminar mi cuenta')).toBe(false);

    await act(async () => {
      boton(r, 'Eliminar mi cuenta').props.onPress();
    });
    expect(mockConfirmar).toHaveBeenCalledTimes(1);
    expect(mockEliminar).toHaveBeenCalledWith({ contrasena: 'secreta' });
    expect(mockAlerta).toHaveBeenCalledWith(
      'Tu cuenta quedó cerrada',
      'Se borrará el 1 de noviembre de 2026. Si cambias de opinión, escríbenos a renaserlab@gmail.com antes de esa fecha.',
    );
    expect(onCerrada).toHaveBeenCalledTimes(1);
  });

  it('si cancela la confirmación no se envía nada', async () => {
    mockConfirmar.mockResolvedValueOnce(false);
    const r = await montar();
    act(() => campo(r, 'Tu contraseña').props.onChangeText('secreta'));
    await act(async () => {
      boton(r, 'Eliminar mi cuenta').props.onPress();
    });
    expect(mockEliminar).not.toHaveBeenCalled();
    expect(onCerrada).not.toHaveBeenCalled();
  });

  it('con código: primero «Enviarme un código», luego el campo de 6 dígitos', async () => {
    mockLeer.mockResolvedValue({ confirmaCon: 'CODIGO', diasDeGracia: 30 });
    const r = await montar();
    expect(campo(r, 'Tu contraseña')).toBeUndefined();
    expect(campo(r, 'Código de 6 dígitos')).toBeUndefined();

    await act(async () => {
      boton(r, 'Enviarme un código').props.onPress();
    });
    expect(mockCodigo).toHaveBeenCalledTimes(1);
    act(() => campo(r, 'Código de 6 dígitos').props.onChangeText('12a345'));
    expect(campo(r, 'Código de 6 dígitos').props.value).toBe('12345');
    expect(deshabilitado(r, 'Eliminar mi cuenta')).toBe(true);
    act(() => campo(r, 'Código de 6 dígitos').props.onChangeText('123456'));

    await act(async () => {
      boton(r, 'Eliminar mi cuenta').props.onPress();
    });
    expect(mockEliminar).toHaveBeenCalledWith({ codigo: '123456' });
    expect(onCerrada).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new ApiError(400, 'La contraseña no es correcta.'), 'La contraseña no es correcta.'],
    [new ApiError(409, 'Eres la única cuenta Admin activa.'), 'Eres la única cuenta Admin activa.'],
    [new ApiError(429, 'Error 429'), 'Demasiados intentos. Prueba más tarde.'],
  ])('un error del servidor se muestra y no cierra la sesión (%s)', async (error, texto) => {
    mockEliminar.mockRejectedValueOnce(error);
    const r = await montar();
    act(() => campo(r, 'Tu contraseña').props.onChangeText('secreta'));
    await act(async () => {
      boton(r, 'Eliminar mi cuenta').props.onPress();
    });
    expect(textos(r)).toContain(texto);
    expect(onCerrada).not.toHaveBeenCalled();
  });

  it('si no se puede leer cómo se confirma, deja reintentar', async () => {
    mockLeer.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    const r = await montar();
    expect(textos(r)).toContain('No se pudo cargar');
    await act(async () => {
      boton(r, 'Reintentar').props.onPress();
    });
    expect(campo(r, 'Tu contraseña')).toBeDefined();
  });
});

describe('Yo abre la pantalla', () => {
  /* > **Corregido 2026-10-05 (rediseño de Yo, decisión 10 del dueño).** Decía «fila discreta al final
     > de Yo»: era un enlace subrayado al pie de Yo. Pasó a Ajustes, al final y en rojo, para que se
     > encuentre (Google Play lo exige). */
  it('fila roja al final de Ajustes, a pantalla completa, con el logout del AuthContext', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const path = jest.requireActual<typeof import('path')>('path');
    const yo = fs.readFileSync(path.join(__dirname, '../../../../screens/YoScreen.tsx'), 'utf8');
    expect(yo).toMatch(/titulo="Eliminar mi cuenta"\s+peligro/);
    expect(yo).toMatch(/<EliminarMiCuentaScreen onVolver=\{\(\) => setEliminandoCuenta\(false\)\} onCerrada=\{logout\} \/>/);
  });
});
