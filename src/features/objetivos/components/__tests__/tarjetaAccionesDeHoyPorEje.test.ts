import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Tus acciones de hoy» de Plan (spec 016, opción B), lo básico de la tarjeta: sin el arco, el subtítulo con el día real,
 * una fila por eje con «n de m», un símbolo por acción y la que sigue; tocar una fila abre la hoja de ese eje y «Registrar en
 * Training» lleva a Training, a esa acción, cuando la hoja ya se fue. Sin acciones dice cómo agendarlas. La lectura se reemplaza.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../hooks/useMinutoActual', () => ({ useMinutoActual: () => new Date(2026, 9, 29, 15, 40) }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));

type PropsDeLaHoja = {
  visible: boolean;
  titulo: string;
  subtitulo?: string;
  pie?: React.ReactNode;
  alCerrar: () => void;
  alTerminarDeCerrar?: () => void;
  children: React.ReactNode;
};
const mockHojas: PropsDeLaHoja[] = [];
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return {
    HojaDesdeAbajo: (props: PropsDeLaHoja) => {
      mockHojas.push(props);
      return props.visible ? R.createElement(View, { accessibilityLabel: 'hoja' }, props.pie, props.children) : null;
    },
  };
});

const mockLectura = { actual: undefined as unknown as { rocas: unknown[] | null; fallo: boolean; recargar: () => Promise<void> } };
jest.mock('../../hooks/useAccionesDeHoy', () => ({ useAccionesDeHoy: () => mockLectura.actual }));

import type { EjeObjetivo, RocaDiariaApi } from '../../types/objetivos.types';
import { TarjetaAccionesDeHoyPorEje } from '../TarjetaAccionesDeHoyPorEje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let n = 0;
const roca = (titulo: string, eje: EjeObjetivo, hora: string | null, extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi => ({
  id: `r${++n}`, fecha: '2026-10-29', posicion: 1, titulo, descripcion: null, color: 'VERDE', puntajeImpacto: 5, esDelegable: false, eje,
  rocaSemanalId: null, horaInicio: hora ? `${hora}:00` : null, horaFin: null, completada: false, completadaEn: null, puntosOtorgados: 0,
  bloqueada: false, acciones: [], ...extra,
});

const EJEMPLO = [
  roca('Caminar 40 minutos', 'CUERPO', '08:30', { completada: true, completadaEn: '2026-10-29T13:52:00Z' }),
  roca('Llamar a 5 prospectos', 'TRABAJO', '10:00', { completada: true, completadaEn: '2026-10-29T15:14:00Z' }),
  roca('Llamar a mi hijo', 'RELACIONES', '13:00'),
  roca('Enviar 3 propuestas', 'TRABAJO', '16:00'),
  roca('Estirar 15 minutos', 'CUERPO', '18:30'),
  roca('Confirmar 2 reuniones', 'TRABAJO', null),
];
const EJES: EjeObjetivo[] = ['TRABAJO', 'CUERPO', 'RELACIONES'];

let raiz: ReactTestRenderer | null = null;
function montar(rocas: RocaDiariaApi[] | null, extra: { fallo?: boolean; diaPrograma?: number | null } = {}) {
  mockLectura.actual = { rocas, fallo: extra.fallo ?? false, recargar: jest.fn(async () => undefined) };
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(TarjetaAccionesDeHoyPorEje, { diaPrograma: extra.diaPrograma === undefined ? 20 : extra.diaPrograma, ejesEnOrden: EJES }),
    );
  });
}
const textosDeNodos = (nodos: ReactTestInstance[]): string =>
  nodos
    .filter(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
const textos = () => textosDeNodos(raiz!.root.findAll(() => true));
const tocable = (etiquetaEmpieza: string): ReactTestInstance =>
  raiz!.root.findAll(x => typeof x.props.onPress === 'function' && String(x.props.accessibilityLabel ?? '').startsWith(etiquetaEmpieza))[0];
const hojaVisible = () => mockHojas[mockHojas.length - 1]?.visible === true;

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockHojas.length = 0;
  mockNavigate.mockReset();
});

describe('Tus acciones de hoy', () => {
  it('el título, «2 de 6» y el día real: «Jueves 29 · día 20 de 90»', () => {
    montar(EJEMPLO);
    const t = textos();
    expect(t).toContain('Tus acciones de hoy');
    expect(t).toContain('2 de 6');
    expect(t).toContain('Jueves 29 · día 20 de 90');
  });

  it('una fila por eje, en el orden dado, con su «n de m» y la que sigue o la que se pasó', () => {
    montar(EJEMPLO);
    const t = textos();
    for (const esperado of ['Negocio', '1 de 3', 'Sigue: Enviar 3 propuestas · 16:00', 'Cuerpo', '1 de 2', 'Sigue: Estirar 15 minutos · 18:30', 'Relaciones', '0 de 1', 'Se te pasó: Llamar a mi hijo']) {
      expect(t).toContain(esperado);
    }
    expect(t.indexOf('Negocio')).toBeLessThan(t.indexOf('Cuerpo'));
    expect(t.indexOf('Cuerpo')).toBeLessThan(t.indexOf('Relaciones'));
    expect(tocable('Negocio, 1 de 3 cumplidas')).toBeDefined();
  });

  it('sin saber el día del programa no lo inventa', () => {
    montar(EJEMPLO, { diaPrograma: null });
    expect(textos()).toContain('Jueves 29');
    expect(textos()).not.toContain('de 90');
  });

  it('sin acciones hoy dice cómo agendarlas y no inventa filas', () => {
    montar([]);
    const t = textos();
    expect(t).toContain('Hoy no tienes acciones agendadas.');
    expect(t).toContain('Agendar mis acciones');
    expect(t).not.toContain('Negocio');
  });

  it('mientras llega la lectura lo dice; si falla y nunca llegó, ofrece reintentar', () => {
    montar(null);
    expect(textos()).toContain('Cargando tus acciones…');
    act(() => raiz?.unmount());
    montar(null, { fallo: true });
    expect(textos()).toContain('No pudimos cargar tus acciones de hoy.');
    expect(tocable('')).toBeDefined();
  });
});

describe('la hoja de un eje', () => {
  it('tocar una fila abre sus acciones de hoy con su hora y su estado', () => {
    montar(EJEMPLO);
    expect(hojaVisible()).toBe(false);
    act(() => tocable('Negocio, 1 de 3 cumplidas').props.onPress());
    expect(hojaVisible()).toBe(true);
    const hoja = mockHojas[mockHojas.length - 1];
    expect(hoja.titulo).toBe('Negocio');
    expect(hoja.subtitulo).toBe('Tus acciones de hoy en este eje');
    const t = textos();
    // Cumplida con la hora local en que se cumplió; pendiente; y la sin hora.
    expect(t).toContain('Llamar a 5 prospectos');
    expect(t).toContain('Cumplida 10:14');
    expect(t).toContain('Enviar 3 propuestas');
    expect(t).toContain('Pendiente');
    expect(t).toContain('Confirmar 2 reuniones');
    expect(t).toContain('—');
    expect(t).not.toContain('Caminar 40 minutos');
  });

  it('la acción que se pasó y la que espera a la verde se dicen con palabras, además del símbolo', () => {
    montar([roca('Llamar', 'RELACIONES', '13:00'), roca('Verde', 'CUERPO', '16:00'), roca('Amarilla', 'CUERPO', '17:00', { posicion: 2, bloqueada: true })]);
    act(() => tocable('Relaciones').props.onPress());
    expect(textos()).toContain('Se te pasó la hora · todavía puedes cumplir tu compromiso');
    act(() => mockHojas[mockHojas.length - 1].alCerrar());
    act(() => tocable('Cuerpo').props.onPress());
    expect(textos()).toContain('Se abre al completar la primera');
  });

  it('«Registrar en Training» lleva a Training, a la acción que sigue, cuando la hoja ya se fue', () => {
    montar(EJEMPLO);
    const siguiente = EJEMPLO.find(r => r.titulo === 'Enviar 3 propuestas')!;
    act(() => tocable('Negocio, 1 de 3 cumplidas').props.onPress());
    const boton = raiz!.root.findAll(x => x.props.accessibilityLabel === 'Registrar en Training' && typeof x.props.onPress === 'function')[0];
    act(() => boton.props.onPress());
    // Todavía no: la hoja baja primero.
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(hojaVisible()).toBe(false);
    act(() => mockHojas[mockHojas.length - 1].alTerminarDeCerrar?.());
    expect(mockNavigate).toHaveBeenCalledWith('Training', { abrirAccionId: siguiente.id });
  });

  it('cerrar la hoja sin registrar no navega', () => {
    montar(EJEMPLO);
    act(() => tocable('Cuerpo, 1 de 2 cumplidas').props.onPress());
    act(() => mockHojas[mockHojas.length - 1].alCerrar());
    act(() => mockHojas[mockHojas.length - 1].alTerminarDeCerrar?.());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('con todo cumplido en el eje no hay nada que registrar: no ofrece el botón', () => {
    montar([roca('Hecha', 'CUERPO', '08:00', { completada: true })]);
    act(() => tocable('Cuerpo, 1 de 1 cumplidas').props.onPress());
    const botones = raiz!.root.findAll(x => x.props.accessibilityLabel === 'Registrar en Training');
    expect(botones).toHaveLength(0);
    expect(textos()).toContain('Todo cumplido');
  });
});
