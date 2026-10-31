import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { PreferenciasDeAcciones } from '../../notificaciones/preferenciasPorDia';
import type { RocaDiariaApi } from '../../types/objetivos.types';

/**
 * «Recordatorios de tus acciones ›» en Plan (2026-10-31): una fila con el estado en una línea que abre una hoja grande con el mismo
 * control de siempre. Lo que se cuida: la fila dice el estado guardado y lo relee al cerrar la hoja; el control vive SOLO en la hoja
 * (cerrada, no se dibuja), sin tocar su lógica; y las alarmas de cada acción se ponen al día aunque la hoja esté cerrada.
 */

const mockPreferencias = jest.fn<(userId: string) => Promise<PreferenciasDeAcciones>>();
const mockSincronizar = jest.fn<(userId: string, rocas: RocaDiariaApi[]) => Promise<void>>();
jest.mock('../../notificaciones/recordatoriosDeAcciones', () => ({
  preferenciasDeAcciones: (userId: string) => mockPreferencias(userId),
  sincronizarAlarmasDeAcciones: (userId: string, rocas: RocaDiariaApi[]) => mockSincronizar(userId, rocas),
}));
const mockLocales = { hay: true };
jest.mock('../../../habits/notificaciones/recordatoriosDeHabito', () => ({
  get HAY_RECORDATORIOS_LOCALES() {
    return mockLocales.hay;
  },
}));
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

type PropsDeHoja = { visible: boolean; titulo: string; tamano?: string; alCerrar: () => void; children?: React.ReactNode };
let mockHoja: PropsDeHoja | null = null;
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return {
    HojaDesdeAbajo: (p: PropsDeHoja) => {
      mockHoja = p;
      return p.visible ? R.createElement(View, { accessibilityLabel: `hoja ${p.titulo}` }, p.children) : null;
    },
  };
});
const mockControl: { userId: string; rocas?: unknown; sincronizarConLaLista?: boolean }[] = [];
jest.mock('../RecordatorioDeAcciones', () => ({
  RecordatorioDeAcciones: (p: { userId: string; rocas?: unknown; sincronizarConLaLista?: boolean }) => {
    mockControl.push(p);
    return null;
  },
}));

import { RecordatoriosDeLasAcciones } from '../RecordatoriosDeLasAcciones';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BASE: PreferenciasDeAcciones = { diarioActivo: true, horaDiaria: '08:00', antelaciones: [10] };
const accion = (id: string): RocaDiariaApi =>
  ({
    id, fecha: '2026-10-31', posicion: 1, titulo: id, descripcion: null, color: 'VERDE', puntajeImpacto: 5, esDelegable: false, eje: 'CUERPO',
    rocaSemanalId: 's1', horaInicio: '09:00:00', horaFin: null, completada: false, completadaEn: null, puntosOtorgados: 0, bloqueada: false, acciones: [],
  }) as RocaDiariaApi;

let raiz: ReactTestRenderer | null = null;
async function montar(rocas?: RocaDiariaApi[]) {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(RecordatoriosDeLasAcciones, { userId: 'u1', rocas }));
  });
}
const textos = () =>
  raiz!.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
const fila = (): ReactTestInstance =>
  raiz!.root.findAll(n => n.props.accessibilityRole === 'button' && String(n.props.accessibilityLabel ?? '').startsWith('Recordatorios de tus acciones'))[0];

beforeEach(() => {
  mockPreferencias.mockReset().mockResolvedValue(BASE);
  mockSincronizar.mockReset().mockResolvedValue(undefined);
  mockControl.length = 0;
  mockHoja = null;
  mockLocales.hay = true;
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('la fila', () => {
  it('dice el título y, en una línea, el estado guardado', async () => {
    await montar();
    expect(textos()).toContain('Recordatorios de tus acciones');
    expect(textos()).toContain('Todos los días a las 08:00 · aviso 10 min antes');
    expect(fila().props.accessibilityLabel).toBe('Recordatorios de tus acciones. Todos los días a las 08:00 · aviso 10 min antes');
  });

  it('mientras no se lee lo guardado, o si no se pudo, dice la frase general', async () => {
    mockPreferencias.mockReturnValue(new Promise(() => undefined));
    await montar();
    expect(textos()).toContain('Recordatorio diario y aviso de cada acción');
    act(() => raiz?.unmount());
    mockPreferencias.mockReset().mockRejectedValue(new Error('sin disco'));
    await montar();
    expect(textos()).toContain('Recordatorio diario y aviso de cada acción');
  });

  it('mide 48 o más y es un botón de una sola línea de estado', async () => {
    await montar();
    const estilo = Object.assign({}, ...[fila().props.style].flat(3).filter(Boolean));
    expect(estilo.minHeight).toBeGreaterThanOrEqual(48);
  });

  it('sin alarmas locales (web, Expo Go) no se dibuja nada', async () => {
    mockLocales.hay = false;
    await montar();
    expect(fila()).toBeUndefined();
    expect(textos()).toBe('');
  });
});

describe('la hoja', () => {
  it('cerrada no dibuja el control; tocar la fila abre una hoja grande con el MISMO control, sin sincronizar por su cuenta', async () => {
    const rocas = [accion('a1')];
    await montar(rocas);
    expect(mockControl).toHaveLength(0);
    expect(mockHoja?.visible).toBe(false);

    await act(async () => fila().props.onPress());
    expect(mockHoja?.visible).toBe(true);
    expect(mockHoja?.titulo).toBe('Recordatorios de tus acciones');
    expect(mockHoja?.tamano).toBe('grande');
    const control = mockControl[mockControl.length - 1];
    expect(control.userId).toBe('u1');
    expect(control.rocas).toBe(rocas);
    // La puesta al día de las alarmas la hace la pantalla, no el control de la hoja (no se haría dos veces).
    expect(control.sincronizarConLaLista).toBe(false);
  });

  it('al cerrarla, la fila relee lo guardado y muestra lo nuevo', async () => {
    await montar();
    await act(async () => fila().props.onPress());
    mockPreferencias.mockResolvedValue({ diarioActivo: true, horaDiaria: '07:30', antelaciones: [30, 10] });
    await act(async () => mockHoja!.alCerrar());
    expect(mockHoja?.visible).toBe(false);
    expect(textos()).toContain('Todos los días a las 07:30 · avisos 30 y 10 min antes');
  });
});

describe('las alarmas de las acciones, con la hoja cerrada', () => {
  it('se ponen al día con la lista que Plan pasa y se vuelven a poner cuando la lista cambia', async () => {
    const primera = [accion('a1')];
    await montar(primera);
    expect(mockSincronizar).toHaveBeenCalledTimes(1);
    expect(mockSincronizar).toHaveBeenCalledWith('u1', primera);

    // Otra acción agendada: la lista cambió.
    const segunda = [accion('a1'), accion('a2')];
    await act(async () => {
      raiz!.update(React.createElement(RecordatoriosDeLasAcciones, { userId: 'u1', rocas: segunda }));
    });
    expect(mockSincronizar).toHaveBeenCalledTimes(2);
    expect(mockSincronizar).toHaveBeenLastCalledWith('u1', segunda);

    // La misma lista (otro arreglo, mismas acciones): no repite el trabajo.
    await act(async () => {
      raiz!.update(React.createElement(RecordatoriosDeLasAcciones, { userId: 'u1', rocas: [accion('a1'), accion('a2')].map((a, i) => ({ ...segunda[i], id: a.id })) }));
    });
    expect(mockSincronizar).toHaveBeenCalledTimes(2);
  });

  it('sin la lista (todavía cargando o falló la lectura) no toca ninguna alarma', async () => {
    await montar(undefined);
    expect(mockSincronizar).not.toHaveBeenCalled();
  });
});
