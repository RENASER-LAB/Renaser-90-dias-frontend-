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
const mockTelefono = { paso: 1, guardados: [] as number[] };
const mockLecturas: Array<{ resolver: (v: unknown) => void; rechazar: (e: unknown) => void }> = [];
const mockLecturaManual = { activa: false };

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
  const Nada = () => null;
  return { __esModule: true, default: Caja, Path: Nada, Circle: Nada, Rect: Nada, Ellipse: Nada, Polygon: Nada, G: Caja, Line: Nada };
});
jest.mock('../../../hooks/useSystemBackHandler', () => {
  let ultimo: (() => boolean) | null = null;
  return {
    useSystemBackHandler: (fn: () => boolean, activo: boolean) => {
      if (activo) ultimo = fn;
    },
    ultimo: () => ultimo,
  };
});
jest.mock('../../fenix/components/FenixDeSerQuieto', () => ({ FenixDeSerQuieto: () => null }));
jest.mock('../../soporte-ti/verComo/sesionVerComo', () => ({ verComoActual: () => null }));
jest.mock('../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useBarraInferior: () => mockBarra }));
jest.mock('../../plataforma/estado/useFuncionalidad', () => ({
  useFuncionalidad: () => ({ prendida: mockFuncionalidad.muro, disponible: mockFuncionalidad.muro, aviso: null }),
}));
jest.mock('../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => (mockAlerta as unknown as (...x: unknown[]) => void)(...a) } }));
jest.mock('../../community/api/wallApi', () => ({ contarMisPublicaciones: () => Promise.resolve(mockPublicados.n) }));
jest.mock('../estado/pasoEnElTelefono', () => ({
  leerPasoDelTelefono: () => Promise.resolve(mockTelefono.paso),
  guardarPasoEnElTelefono: (_: string, paso: number) => {
    mockTelefono.guardados.push(paso);
    return Promise.resolve();
  },
}));
jest.mock('../api/recorridoApi', () => ({
  obtenerRecorrido: () =>
    mockLecturaManual.activa
      ? new Promise((resolver, rechazar) => mockLecturas.push({ resolver, rechazar }))
      : Promise.resolve({ ...mockServidor }),
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

import { hayCapaObligatoriaAbierta, marcarCapaObligatoria, olvidarCapasObligatorias } from '../../../navigation/capasObligatorias';
import { AVISO_DEL_BLOQUEO } from '../data/pasosDelRecorrido';
import { cerrarMomentoGrande, momentoGrandeActual, reiniciarMomentoGrandeParaPruebas } from '../../fenix/estado/momentoGrande';
import { avisarPostPublicado } from '../../sparkie/events/avisoPrimerPost';
import { PAUSA_TRAS_EL_COMPOSITOR_MS, RecorridoDeBienvenida } from '../components/RecorridoDeBienvenida';
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
  mockTelefono.paso = 1;
  mockTelefono.guardados = [];
  mockLecturas.length = 0;
  mockLecturaManual.activa = false;
  mockSesion.user = { id: 'u-1', name: 'Ana Pérez' };
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

  it('spec 045 FR-008: no arranca con otra capa obligatoria abierta (Código Renaser), y sale al cerrarse', async () => {
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

  it('spec 045 FR-004, D9: una cuenta nueva no puede saltar el recorrido: no hay «Saltar» ni «Ahora no», y el atrás no lo cierra', async () => {
    await dibujar();
    expect(textos()).not.toContain('Saltar');
    expect(textos()).not.toContain('Ahora no');
    tocar('Empezar');
    expect(textos()).not.toContain('Saltar');
    expect(mockAlerta).not.toHaveBeenCalled();
    expect(mockTerminar).not.toHaveBeenCalled();
  });

  it('spec 045 FR-004: repetido desde Yo sí se puede cerrar con «Saltar»', async () => {
    mockServidor.mostrar = false;
    await dibujar();
    act(() => pedirVerElRecorrido());
    tocar('Saltar');
    const [titulo, , botones] = mockAlerta.mock.calls[0];
    expect(titulo).toBe('¿Saltar el recorrido?');
    await act(async () => botones[1].onPress!());
    expect(mockTerminar).not.toHaveBeenCalled();
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

  it('spec 045 FR-006, FR-014, D9: si cierra el compositor sin publicar, vuelve el paso del Muro (bloqueado, con candados y sin «Ahora no»)', async () => {
    jest.useFakeTimers();
    try {
      mockServidor.paso = 5;
      await dibujar();
      act(() => marcarComposerDelMuroAbierto(true));
      tocar('Escribir mi publicación');
      expect(visible()).toBe(false);
      act(() => {
        mockRuta.nombre = 'Comunidad';
        mockOyentesDeRuta.forEach(o => o());
        marcarComposerDelMuroAbierto(false);
      });
      act(() => jest.advanceTimersByTime(PAUSA_TRAS_EL_COMPOSITOR_MS + 10));
      expect(visible()).toBe(true);
      expect(textos()).toContain('Tu primera publicación');
      expect(textos()).toContain(AVISO_DEL_BLOQUEO);
      expect(textos()).not.toContain('Ahora no');
      expect(textos()).not.toContain('Cerrar');
      expect(mockTerminar).not.toHaveBeenCalled();
      // Sigue siendo una capa obligatoria: los avisos del teléfono esperan.
      expect(hayCapaObligatoriaAbierta()).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('spec 045 FR-014, D9: en el paso del Muro el atrás del sistema no lo cierra ni lo salta', async () => {
    mockServidor.paso = 5;
    await dibujar();
    const atras = jest.requireMock<{ ultimo: () => (() => boolean) | null }>('../../../hooks/useSystemBackHandler').ultimo();
    expect(atras).not.toBeNull();
    act(() => {
      expect(atras!()).toBe(true);
    });
    expect(visible()).toBe(true);
    expect(textos()).toContain('Tu primera publicación');
    expect(mockAlerta).not.toHaveBeenCalled();
    expect(mockTerminar).not.toHaveBeenCalled();
  });

  it('spec 045 FR-014, D9: el bloqueo vale en cualquier pestaña: si un aviso abrió Plan al entrar, igual sale', async () => {
    mockServidor.paso = 5;
    mockRuta.nombre = 'Plan';
    await dibujar();
    expect(visible()).toBe(true);
    expect(textos()).toContain('Tu primera publicación');
  });

  it('spec 045 FR-014, D9: al cambiar de pestaña sigue abierto en el mismo paso', async () => {
    mockServidor.paso = 3;
    await dibujar();
    act(() => {
      mockRuta.nombre = 'Yo';
      mockOyentesDeRuta.forEach(o => o());
    });
    expect(visible()).toBe(true);
    expect(textos()).toContain('3 de 5');
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

describe('no se reinicia (D9)', () => {
  it('spec 045 FR-015, D11: cerrar y reabrir la app retoma el paso alcanzado aunque el servidor no lo haya guardado (sin red)', async () => {
    mockGuardarPaso.mockImplementation(() => Promise.reject(new Error('sin red')));
    await dibujar();
    tocar('Empezar');
    tocar('Siguiente');
    expect(textos()).toContain('3 de 5');
    expect(mockTelefono.guardados).toEqual([2, 3]);
    act(() => raiz!.unmount());
    // La app se reabre: el servidor quedó en 1, el teléfono en 3.
    reiniciarRecorridoParaPruebas();
    mockTelefono.paso = 3;
    await dibujar();
    expect(textos()).toContain('3 de 5');
    mockGuardarPaso.mockImplementation(() => Promise.resolve(mockServidor));
  });

  it('spec 045 FR-015, D11: si la sesión parpadea (se relee el ingreso), no vuelve al principio', async () => {
    await dibujar();
    tocar('Empezar');
    tocar('Siguiente');
    await act(async () => {
      mockSesion.isOnboardingCompleted = false;
      raiz!.update(React.createElement(RecorridoDeBienvenida));
    });
    await act(async () => {
      mockSesion.isOnboardingCompleted = true;
      raiz!.update(React.createElement(RecorridoDeBienvenida));
    });
    expect(textos()).toContain('3 de 5');
  });

  it('spec 045 FR-015, D11: dos lecturas que llegan al revés: gana la de la cuenta vigente', async () => {
    mockLecturaManual.activa = true;
    await dibujar();
    await act(async () => {
      mockSesion.user = { id: 'u-2', name: 'Bea Ruiz' };
      raiz!.update(React.createElement(RecorridoDeBienvenida));
    });
    expect(mockLecturas).toHaveLength(2);
    // La lectura nueva (u-2) llega primero, la vieja (u-1) después: la vieja no pisa nada.
    await act(async () => mockLecturas[1].resolver({ mostrar: true, paso: 2, terminado: false }));
    await act(async () => mockLecturas[0].resolver({ mostrar: true, paso: 4, terminado: false }));
    expect(textos()).toContain('Hoy');
    expect(textos()).toContain('2 de 5');
  });

  it('spec 045 FR-015, D11: si se pierde la red al guardar un paso, el recorrido sigue en el paso nuevo', async () => {
    mockGuardarPaso.mockImplementation(() => Promise.reject(new Error('sin red')));
    await dibujar();
    tocar('Empezar');
    await act(async () => undefined);
    expect(textos()).toContain('2 de 5');
    expect(visible()).toBe(true);
    mockGuardarPaso.mockImplementation(() => Promise.resolve(mockServidor));
  });
});
