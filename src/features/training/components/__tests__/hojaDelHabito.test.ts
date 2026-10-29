/**
 * La hoja de un hábito (spec 014, «un toque, una hoja»): nombre, hora y puntos; la guía PLEGADA si existe (y si no, la
 * sección no aparece); y fijo abajo el botón del registro de su tipo. Lo cumplido muestra lo que se registró, sin botón.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import type { HabitItem } from '../../../../screens/TrainingScreen';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { HojaDelHabito } from '../HojaDelHabito';
import type { ItemDelDia } from '../../utils/itemsDelDia';
import type { ModoDeLaFila } from '../../utils/filaDelDia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const guia = { secciones: [{ titulo: 'Qué hacer', texto: 'Bebe un vaso de agua tibia.' }, { titulo: 'Cómo hacerlo', texto: '1. Calienta el agua.' }] };
const habit = (extra: Partial<HabitItem> = {}): HabitItem => ({
  id: 'r1', habitoId: 'h1', dimension: 'CUERPO', title: 'Agua tibia', time: '06:00', tag: 'Innegociable', streak: 4,
  done: false, hasEvidence: false, tieneTrackHoy: true, estado: 'PENDIENTE', evidenceRequirement: 'REQUIRED', ...extra,
});
const item = (extra: Partial<ItemDelDia> = {}, h: Partial<HabitItem> = {}): ItemDelDia => ({
  clave: 'r1', tipo: 'habito', titulo: 'Agua tibia', hora: '06:00', hecho: false, icono: null, dimension: 'Cuerpo',
  puntos: 10, guia: null, habit: habit(h), ...extra,
});

let raiz: ReactTestRenderer | null = null;
const onAccion = jest.fn();
const onCerrar = jest.fn();

function montar(it_: ItemDelDia, modo: ModoDeLaFila = 'hoy') {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(HojaDelHabito, { visible: true, item: it_, modo, ahoraMs: Date.parse('2026-10-29T12:00:00Z'), onCerrar, onAccion }),
    );
  });
}
const textosDeNodos = (nodos: ReactTestInstance[]): string =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .join(' | ');
const textos = () => textosDeNodos(raiz!.root.findAll(() => true));
const textosDe = (n: ReactTestInstance) => textosDeNodos(n.findAll(() => true));
const boton = (etiqueta: string): ReactTestInstance =>
  raiz!.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityState && n.props.accessibilityState.disabled !== undefined && textosDe(n) === etiqueta)[0];

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  onAccion.mockReset();
  onCerrar.mockReset();
});

describe('La hoja del hábito', () => {
  it('nombre, hora, puntos y la racha del servidor', () => {
    montar(item());
    expect(textos()).toContain('Agua tibia');
    expect(textos()).toContain('Cuerpo · 06:00 · 10 pts · racha de 4 días');
  });

  it('con guía: queda plegada, y se despliega al tocarla', () => {
    montar(item({ guia }));
    expect(textos()).toContain('Guía de esta práctica');
    expect(textos()).not.toContain('Bebe un vaso de agua tibia.');
    const cabecera = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Guía de esta práctica' && typeof n.props.onPress === 'function')[0];
    expect(cabecera.props.accessibilityState).toEqual({ expanded: false });
    act(() => cabecera.props.onPress());
    expect(textos()).toContain('Qué hacer');
    expect(textos()).toContain('Bebe un vaso de agua tibia.');
    expect(textos()).toContain('Cómo hacerlo');
    expect(textos()).toContain('Leer la guía no marca el hábito.');
  });

  it('sin guía cargada, la sección no aparece', () => {
    montar(item({ guia: null }));
    expect(textos()).not.toContain('Guía de esta práctica');
  });

  it('el botón fijo abajo es el registro de su tipo, y leer la guía no lo dispara', () => {
    montar(item({ guia }));
    expect(textos()).toContain('Tomar foto');
    act(() => raiz!.root.findAll(n => n.props.accessibilityLabel === 'Guía de esta práctica' && typeof n.props.onPress === 'function')[0].props.onPress());
    expect(onAccion).not.toHaveBeenCalled();
    act(() => boton('Tomar foto').props.onPress());
    expect(onAccion).toHaveBeenCalledTimes(1);
    expect(onAccion.mock.calls[0][1]).toMatchObject({ tipo: 'registrar', etiqueta: 'Tomar foto' });
  });

  it('Despertar y Dormir: «Marcar como hecho», que registra la hora', () => {
    montar(item({}, { systemKey: 'WAKE_UP', evidenceRequirement: 'OPTIONAL' }));
    expect(textos()).toContain('Marcar como hecho');
    expect(textos()).toContain('Registra la hora en que lo hiciste.');
  });

  it('atrasado: lo dice con el texto de menos puntos de siempre', () => {
    montar(item({}, { pointsAtStake: 6, maxPoints: 10, deadline: '2026-10-29T20:00:00Z' }), 'atrasado');
    expect(textos()).toContain('Se te pasó la hora: ');
    expect(textos()).toContain('todavía puedes cumplir tu compromiso hoy');
    expect(textos()).not.toMatch(/menos puntos|sin puntos/);
    expect(textos()).toContain('Tomar foto');
  });

  it('lo cumplido: lo que registró el servidor y lo que escribió, sin botón de registro', () => {
    montar(
      item({ hecho: true, cumplido: { hora: '06:12', puntos: 8, escrito: 'Me sentí bien' }, puntos: 8 }, { done: true }),
      'hecho',
    );
    expect(textos()).toContain('Cumplido a las 06:12 · +8 pts');
    expect(textos()).toContain('«Me sentí bien»');
    expect(textos()).not.toContain('Tomar foto');
  });
});
