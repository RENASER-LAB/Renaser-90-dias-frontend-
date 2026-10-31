import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Los rituales piden solo texto (2026-10-31): la hoja con «¿Cómo te sientes después de realizar el ritual?», obligatoria, sin cámara.
 * Al enviar: evidencia TEXTO y cierre con la misma respuesta, por `confirmarEvidencia` y `completarRegistro`.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

type PropsDeLaHoja = { visible: boolean; titulo: string; pie?: React.ReactNode; alCerrar: () => void; children: React.ReactNode };
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return {
    HojaDesdeAbajo: (props: PropsDeLaHoja) => (props.visible ? R.createElement(View, { accessibilityLabel: `hoja ${props.titulo}` }, props.children, props.pie) : null),
  };
});

const mockConfirmar = jest.fn<(id: string, e: { tipo: string; contenidoTexto?: string | null }) => Promise<unknown>>();
const mockCompletar = jest.fn<(id: string, respuesta?: string | null) => Promise<{ puntosOtorgados: number }>>();
jest.mock('../../../habits/api/evidenciaHabitoApi', () => ({
  confirmarEvidencia: (id: string, e: { tipo: string; contenidoTexto?: string | null }) => mockConfirmar(id, e),
  completarRegistro: (id: string, r?: string | null) => mockCompletar(id, r),
}));
jest.mock('../../../habits/api/habitsApi', () => ({ obtenerTracksDeHoy: async () => [] }));

import { DiaDeHabitosCambiadoError } from '../../../habits/api/registroVigente';
import { PREGUNTA_DEL_RITUAL } from '../../../habits/utils/registroConFoto';
import { RegistroDeRitualConTexto } from '../RegistroDeRitualConTexto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alCerrar = jest.fn();
const alCompletado = jest.fn();
const alCambiarElDia = jest.fn();
let raiz: ReactTestRenderer | null = null;
let visible = true;
const elemento = (registroId: string | null = 'r1') =>
  React.createElement(RegistroDeRitualConTexto, { visible, registroId, titulo: 'Ritual tierra - agua - fuego (mañana)', alCerrar, alCompletado, alCambiarElDia });
async function montar(registroId: string | null = 'r1') {
  await act(async () => {
    raiz = TestRenderer.create(elemento(registroId));
  });
}
const campo = (): ReactTestInstance => raiz!.root.findAll(x => x.props.accessibilityLabel === PREGUNTA_DEL_RITUAL && typeof x.props.onChangeText === 'function')[0];
const enviar = (): ReactTestInstance =>
  raiz!.root.findAll(x => x.props.accessibilityRole === 'button' && typeof x.props.onPress === 'function' && (x.type as unknown) !== 'View')[0];
const escribir = (texto: string) => act(async () => { campo().props.onChangeText(texto); });
const textos = () =>
  raiz!.root
    .findAll(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));

beforeEach(() => {
  visible = true;
  mockConfirmar.mockResolvedValue({});
  mockCompletar.mockResolvedValue({ puntosOtorgados: 8 });
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  for (const m of [alCerrar, alCompletado, alCambiarElDia, mockConfirmar, mockCompletar]) m.mockReset();
});

describe('la hoja del ritual', () => {
  it('lleva la pregunta del dueño, un campo sin cámara y «Enviar» apagado mientras no hay respuesta', async () => {
    await montar();
    expect(textos()).toContain('¿Cómo te sientes después de realizar el ritual?');
    expect(textos().join(' ')).not.toMatch(/foto|cámara/i);
    expect(enviar().props.disabled).toBe(true);
    await escribir('   ');
    expect(enviar().props.disabled).toBe(true);
    await escribir('Me siento en calma');
    expect(enviar().props.disabled).toBe(false);
  });

  it('el campo llega al límite que acepta el servidor (4000) y el título del ritual está en la hoja', async () => {
    await montar();
    expect(campo().props.maxLength).toBe(4000);
    expect(raiz!.root.findAll(x => x.props.accessibilityLabel === 'hoja Ritual tierra - agua - fuego (mañana)').length).toBeGreaterThan(0);
  });

  it('enviar guarda la respuesta como evidencia de TEXTO y cierra con esa respuesta, en ese orden', async () => {
    await montar();
    await escribir('  Me siento en calma  ');
    await act(async () => { enviar().props.onPress(); });
    expect(mockConfirmar).toHaveBeenCalledWith('r1', { tipo: 'TEXTO', contenidoTexto: 'Me siento en calma' });
    expect(mockCompletar).toHaveBeenCalledWith('r1', 'Me siento en calma');
    expect(mockConfirmar.mock.invocationCallOrder[0]).toBeLessThan(mockCompletar.mock.invocationCallOrder[0]);
    expect(alCompletado).toHaveBeenCalledWith('r1', { puntosOtorgados: 8, yaEstabaCompletado: false });
  });

  it('un doble toque manda un solo pedido', async () => {
    let soltar: (v: { puntosOtorgados: number }) => void = () => undefined;
    mockCompletar.mockReturnValue(new Promise(r => { soltar = r; }));
    await montar();
    await escribir('Bien');
    await act(async () => { enviar().props.onPress(); enviar().props.onPress(); });
    await act(async () => soltar({ puntosOtorgados: 5 }));
    expect(mockConfirmar).toHaveBeenCalledTimes(1);
    expect(mockCompletar).toHaveBeenCalledTimes(1);
    expect(alCompletado).toHaveBeenCalledTimes(1);
  });

  it('si el cierre falla, dice el error, conserva lo escrito y al reintentar no vuelve a guardar la evidencia', async () => {
    mockCompletar.mockRejectedValueOnce(new Error('Sin conexión'));
    await montar('r2');
    await escribir('Bien');
    await act(async () => { enviar().props.onPress(); });
    expect(alCompletado).not.toHaveBeenCalled();
    expect(textos().join(' ')).toMatch(/No pudimos registrar tu ritual/);
    expect(campo().props.value).toBe('Bien');
    await act(async () => { enviar().props.onPress(); });
    expect(mockConfirmar).toHaveBeenCalledTimes(1);
    expect(mockCompletar).toHaveBeenCalledTimes(2);
    expect(alCompletado).toHaveBeenCalledTimes(1);
  });

  it('si pasó la medianoche no se manda nada: se avisa y se recarga', async () => {
    mockConfirmar.mockRejectedValueOnce(new DiaDeHabitosCambiadoError());
    await montar('r3');
    await escribir('Bien');
    await act(async () => { enviar().props.onPress(); });
    expect(mockCompletar).not.toHaveBeenCalled();
    expect(alCompletado).not.toHaveBeenCalled();
    expect(alCambiarElDia).toHaveBeenCalledTimes(1);
    expect(textos().join(' ')).toMatch(/Tu día cambió/);
  });

  it('cerrar sin enviar no pierde lo escrito: al volver a abrir ese registro sigue ahí', async () => {
    await montar('r4');
    await escribir('A medias');
    act(() => raiz!.update(React.createElement(RegistroDeRitualConTexto, { visible: false, registroId: 'r4', titulo: 'x', alCerrar, alCompletado, alCambiarElDia })));
    act(() => raiz!.update(elemento('r4')));
    expect(campo().props.value).toBe('A medias');
    // Otro registro no hereda el borrador.
    act(() => raiz!.update(elemento('r5')));
    expect(campo().props.value).toBe('');
  });
});
