/**
 * Spec 045: el recorrido de bienvenida montado (el servidor, la navegación y el Muro son dobles).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Modal, Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockSesion = { isAuthenticated: true, isOnboardingCompleted: true, user: { id: 'u-1', name: 'Ana Pérez' } };
const mockServidor = { mostrar: true, paso: 1, terminado: false };
const mockPublicados = { n: 0 };
const mockIrAPestana = jest.fn<(...args: unknown[]) => boolean>(() => true);
const mockGuardarPaso = jest.fn<(paso: number) => Promise<unknown>>(() => Promise.resolve(mockServidor));
const mockTerminar = jest.fn<(como: string) => Promise<unknown>>(() => Promise.resolve({ ...mockServidor, mostrar: false }));
const mockAlerta = jest.fn<(titulo: string, mensaje: string, botones: Array<{ text: string; onPress?: () => void }>) => void>();
const mockRuta = { nombre: 'Hoy' };
const mockOyentesDeRuta = new Set<() => void>();
const mockFuncionalidad = { muro: true };
const mockBarra = { mostrar: jest.fn() };

jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => mockSesion }));
jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: { children?: unknown }) => children ?? null }));
jest.mock('react-native-svg', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const Caja = ({ children }: { children?: React.ReactNode }) => R.createElement(R.Fragment, null, children);
  return { __esModule: true, default: Caja, Path: () => null, Circle: () => null };
});
jest.mock('../../fenix/components/FenixDeSerQuieto', () => ({ FenixDeSerQuieto: () => null }));
jest.mock('../../soporte-ti/verComo/sesionVerComo', () => ({ verComoActual: () => null }));
jest.mock('../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useBarraInferior: () => mockBarra }));
jest.mock('../../plataforma/estado/useFuncionalidad', () => ({
  useFuncionalidad: () => ({ prendida: mockFuncionalidad.muro, disponible: mockFuncionalidad.muro, aviso: null }),
}));
jest.mock('../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => (mockAlerta as unknown as (...x: unknown[]) => void)(...a) } }));
jest.mock('../../community/api/wallApi', () => ({ contarMisPublicaciones: () => Promise.resolve(mockPublicados.n) }));
jest.mock('../api/recorridoApi', () => ({
  obtenerRecorrido: () => Promise.resolve(mockServidor),
  guardarPasoDelRecorrido: (paso: number) => mockGuardarPaso(paso),
  terminarRecorrido: (como: string) => mockTerminar(como),
}));
jest.mock('../../../navigation/navegacionRef', () => ({
  irAPestana: (...args: unknown[]) => mockIrAPestana(...args),
  navegacionRef: {
    isReady: () => true,
    getCurrentRoute: () => ({ name: mockRuta.nombre }),
    addListener: (_: string, oyente: () => void) => {
      mockOyentesDeRuta.add(oyente);
      return () => mockOyentesDeRuta.delete(oyente);
    },
  },
}));

import { marcarCapaObligatoria, olvidarCapasObligatorias } from '../../../navigation/capasObligatorias';
import { cerrarMomentoGrande, momentoGrandeActual, reiniciarMomentoGrandeParaPruebas } from '../../fenix/estado/momentoGrande';
import { avisarPostPublicado } from '../../sparkie/events/avisoPrimerPost';
import { RecorridoDeBienvenida } from '../components/RecorridoDeBienvenida';
import { alTerminarElRecorrido, estadoDelRecorrido, marcarComposerDelMuroAbierto, pedirVerElRecorrido, reiniciarRecorridoParaPruebas } from '../estado/recorridoEnCurso';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

async function dibujar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(RecorridoDeBienvenida));
  });
}
const visible = () => raiz!.root.findAll(n => (n.type as unknown) === Modal && n.props.visible === true).length > 0;
const textos = () => raiz!.root.findAll(n => (n.type as unknown) === Text).map(n => [n.props.children].flat().join(''));
function tocar(texto: string) {
  const nodo = raiz!.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(x => (x.type as unknown) === Text).some(t => [t.props.children].flat().join('') === texto))[0];
  if (!nodo) throw new Error(`no hay «${texto}»`);
  act(() => nodo.props.onPress());
}

beforeEach(() => {
  mockSesion.isAuthenticated = true;
  mockServidor.mostrar = true;
  mockServidor.paso = 1;
  mockPublicados.n = 0;
  mockRuta.nombre = 'Hoy';
  mockFuncionalidad.muro = true;
  mockIrAPestana.mockClear();
  mockGuardarPaso.mockClear();
  mockTerminar.mockClear();
  mockAlerta.mockClear();
  reiniciarRecorridoParaPruebas();
  reiniciarMomentoGrandeParaPruebas();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  olvidarCapasObligatorias();
});

describe('cuándo sale', () => {
  it('spec 045 FR-001: a una cuenta nueva le sale en Hoy, en el paso 1, con «Te damos la bienvenida» (D6)', async () => {
    await dibujar();
    expect(visible()).toBe(true);
    expect(textos()).toContain('Te damos la bienvenida, Ana');
  });

  it('spec 045 FR-001, SC-003: si el servidor dice que no (cuenta anterior o ya terminado), no sale', async () => {
    mockServidor.mostrar = false;
    await dibujar();
    expect(visible()).toBe(false);
  });

  it('spec 045 FR-008: no arranca con otra capa obligatoria abierta, ni fuera de Hoy', async () => {
    act(() => marcarCapaObligatoria('codigoRenaser', true));
    await dibujar();
    expect(visible()).toBe(false);
    act(() => marcarCapaObligatoria('codigoRenaser', false));
    expect(visible()).toBe(true);
  });

  it('spec 045 FR-001: retoma en el paso guardado', async () => {
    mockServidor.paso = 3;
    await dibujar();
    expect(textos()).toContain('Plan');
    expect(textos()).toContain('3 de 5');
  });
});

describe('los pasos', () => {
  it('spec 045 FR-012: mientras dura, la barra de pestañas queda a la vista en cada paso', async () => {
    mockBarra.mostrar.mockClear();
    await dibujar();
    const antes = mockBarra.mostrar.mock.calls.length;
    expect(antes).toBeGreaterThan(0);
    tocar('Empezar');
    expect(mockBarra.mostrar.mock.calls.length).toBeGreaterThan(antes);
  });

  it('spec 045 FR-002, FR-003, FR-009: avanza Hoy → Plan → Entrenar → primera publicación y guarda cada paso en el servidor', async () => {
    await dibujar();
    tocar('Empezar');
    expect(textos()).toContain('Hoy');
    tocar('Siguiente');
    expect(textos()).toContain('Plan');
    tocar('Siguiente');
    expect(textos()).toContain('Entrenar');
    tocar('Siguiente');
    expect(textos()).toContain('Tu primera publicación');
    expect(mockGuardarPaso.mock.calls.map(c => c[0])).toEqual([2, 3, 4, 5]);
  });

  it('spec 045 FR-004: «Saltar» pregunta, y al confirmar termina con SALTO y no vuelve', async () => {
    await dibujar();
    tocar('Saltar');
    expect(mockAlerta).toHaveBeenCalledTimes(1);
    const [titulo, , botones] = mockAlerta.mock.calls[0];
    expect(titulo).toBe('¿Saltar el recorrido?');
    expect(botones.map(b => b.text)).toEqual(['Seguir viendo', 'Saltar']);
    await act(async () => botones[1].onPress!());
    expect(mockTerminar).toHaveBeenCalledWith('SALTO');
    expect(visible()).toBe(false);
  });

  it('spec 045 FR-011: cuando ya publicó, son 4 pasos y termina en Entrenar con LISTO', async () => {
    mockPublicados.n = 2;
    mockServidor.paso = 4;
    await dibujar();
    expect(textos()).toContain('4 de 4');
    const fin = jest.fn();
    const quitar = alTerminarElRecorrido(fin);
    tocar('Siguiente');
    await act(async () => undefined);
    expect(mockTerminar).toHaveBeenCalledWith('LISTO');
    expect(fin).toHaveBeenCalled();
    quitar();
  });

  it('spec 045 FR-001: con el Muro no disponible para la cuenta, tampoco hay paso del Muro', async () => {
    mockFuncionalidad.muro = false;
    await dibujar();
    expect(textos()).toContain('Te damos la bienvenida, Ana');
    tocar('Empezar');
    expect(textos()).toContain('2 de 4');
  });
});

describe('el primer post', () => {
  it('spec 045 FR-006: «Escribir mi publicación» abre el compositor real del Muro y no publica nada', async () => {
    mockServidor.paso = 5;
    await dibujar();
    tocar('Escribir mi publicación');
    expect(mockIrAPestana).toHaveBeenCalledWith('Comunidad', { abrirComposerMuro: true, desdeElRecorrido: true });
    expect(visible()).toBe(false);
    expect(estadoDelRecorrido().esperandoPrimerPost).toBe(true);
    expect(mockTerminar).not.toHaveBeenCalled();
  });

  it('spec 045 FR-006: si cierra el compositor sin publicar, queda la pastilla para retomarlo', async () => {
    mockServidor.paso = 5;
    await dibujar();
    tocar('Escribir mi publicación');
    act(() => {
      mockRuta.nombre = 'Comunidad';
      mockOyentesDeRuta.forEach(o => o());
      marcarComposerDelMuroAbierto(false);
    });
    expect(raiz!.root.findAll(n => n.props.testID === 'pastilla-del-primer-post').length).toBeGreaterThan(0);
    act(() => marcarComposerDelMuroAbierto(true));
    expect(raiz!.root.findAll(n => n.props.testID === 'pastilla-del-primer-post')).toHaveLength(0);
  });

  it('spec 045 FR-007: al publicar sale la felicitación del primer post, termina con PUBLICO y avisa recién al cerrarla', async () => {
    mockServidor.paso = 5;
    await dibujar();
    tocar('Escribir mi publicación');
    const fin = jest.fn();
    const quitar = alTerminarElRecorrido(fin);
    await act(async () => avisarPostPublicado());
    expect(momentoGrandeActual()?.principal).toBe('primerPost');
    expect(mockTerminar).toHaveBeenCalledWith('PUBLICO');
    expect(fin).not.toHaveBeenCalled();
    await act(async () => cerrarMomentoGrande());
    expect(fin).toHaveBeenCalledTimes(1);
    quitar();
  });

  it('spec 045 FR-007: un post que no viene del recorrido no celebra', async () => {
    mockServidor.mostrar = false;
    await dibujar();
    await act(async () => avisarPostPublicado());
    expect(momentoGrandeActual()).toBeNull();
  });
});

describe('volver a verlo', () => {
  it('spec 045 FR-004: Yo → «Ver el recorrido» lo abre en Hoy desde el principio, sin escribir en el servidor', async () => {
    mockServidor.mostrar = false;
    await dibujar();
    expect(visible()).toBe(false);
    act(() => pedirVerElRecorrido());
    expect(mockIrAPestana).toHaveBeenCalledWith('Hoy');
    expect(visible()).toBe(true);
    tocar('Empezar');
    expect(mockGuardarPaso).not.toHaveBeenCalled();
  });
});
