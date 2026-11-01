/**
 * La entrada al programa propio como fila compacta en Hoy y en Plan (2026-11-01, pedido del dueño: «ese de los 90 días con menos texto, el
 * tamaño que antes de coherencia y racha»). Se prueba lo que se ve y lo que hace cada toque, con el hook real
 * (`useFilaDelProgramaPropio`) y los pedidos simulados.
 *
 * Contra el código anterior falla: Hoy dibujaba la tarjeta grande «Tu programa · Hacer mi programa de 90 días · Puedes recorrerlo tú
 * también… · Elegir mi Día 1 / Ahora no», que quedaba debajo del fénix.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Modal, StyleSheet, Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

const mockConsultarActivacion = jest.fn<() => Promise<unknown>>();
const mockActivarPrograma = jest.fn<(input: { startDate: string }) => Promise<unknown>>();
const mockCapacidades = jest.fn<() => Promise<unknown>>();
let mockRol = 'ADMIN';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined, toque: () => undefined },
}));
jest.mock('../../../services/http/apiClient', () => ({
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'usuario-1', role: mockRol } }),
}));
jest.mock('../../onboarding/api/onboardingApi', () => ({
  consultarActivacionPrograma: () => mockConsultarActivacion(),
  activarPrograma: (input: { startDate: string }) => mockActivarPrograma(input),
}));
jest.mock('../../mentor/api/mentorApi', () => ({
  capacidadesDePrograma: () => mockCapacidades(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilaDelProgramaPropio } from '../components/FilaDelProgramaPropio';
import { useFilaDelProgramaPropio } from '../hooks/useFilaDelProgramaPropio';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FECHAS = ['2026-11-03', '2026-11-04', '2026-11-05'];
let raiz: ReactTestRenderer | null = null;
let programaVisto: ReturnType<typeof useFilaDelProgramaPropio> | null = null;

/** Lo que hacen Hoy y Plan: el hook, y la fila solo si hay algo que dibujar. */
function Pantalla(props: { inscrito: boolean; diaPrograma: number; duracionDias?: number; formacion?: string }) {
  const programa = useFilaDelProgramaPropio(props);
  programaVisto = programa;
  return programa.visible ? React.createElement(FilaDelProgramaPropio, { programa }) : null;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockRol = 'ADMIN';
  programaVisto = null;
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.clearAllMocks();
});

async function montar(
  props: { inscrito: boolean; diaPrograma: number; duracionDias?: number; formacion?: string },
  capacidades: { canStartProgram: boolean; canAdminister?: boolean } | null,
) {
  mockCapacidades.mockResolvedValue(
    capacidades && { programRequired: false, canAccompany: false, canAdminister: false, ...capacidades },
  );
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Pantalla, props));
  });
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await new Promise(resolver => setTimeout(resolver, 0));
    });
  }
  return raiz!;
}

const decir = (n: ReactTestInstance) => [n.props.children].flat().join('');
const textos = (r: ReactTestRenderer): string[] => r.root.findAll(n => n.type === Text).map(decir);
const iconos = (r: ReactTestRenderer) => r.root.findAll(x => typeof x.props.name === 'string' && typeof x.props.size === 'number').map(x => x.props.name as string);
const modal = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Modal)[0];
/** El botón (`Presionable`) con esa etiqueta: no el componente que lo recibe por props, que también la lleva. */
const porEtiqueta = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props?.accessibilityLabel === etiqueta && n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')[0];

async function pulsar(nodo: ReactTestInstance) {
  await act(async () => {
    await nodo.props.onPress();
  });
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await new Promise(resolver => setTimeout(resolver, 0));
    });
  }
}

describe('personal sin programa (sin fila, el servidor dice que puede empezar)', () => {
  it('«Haz tu programa de 90 días · Elige tu Día 1 ›», sin el párrafo de antes ni botón dorado', async () => {
    const r = await montar({ inscrito: false, diaPrograma: 0 }, { canStartProgram: true, canAdminister: true });
    expect(textos(r)).toEqual(['Haz tu programa de 90 días', 'Elige tu Día 1']);
    expect(textos(r).join(' ')).not.toContain('Puedes recorrerlo');
    expect(textos(r).join(' ')).not.toContain('Tu programa');
    expect(iconos(r)).toEqual(expect.arrayContaining(['calendarRange', 'chevron', 'close']));
    // Sin el botón dorado de la tarjeta de antes (su degradado).
    expect(r.root.findAll(x => Array.isArray(x.props.colors)).length).toBe(0);
  });

  it('toda la fila es tocable, mide 72 como mínimo (el alto de Coherencia / Racha) y dice lo mismo al lector de pantalla', async () => {
    const r = await montar({ inscrito: false, diaPrograma: 0 }, { canStartProgram: true, canAdminister: true });
    const fila = porEtiqueta(r, 'Haz tu programa de 90 días. Elige tu Día 1.');
    expect(fila).toBeTruthy();
    expect(fila.props.accessibilityRole).toBe('button');
    expect(StyleSheet.flatten(fila.props.style).minHeight).toBe(72);
  });

  it('el plazo sigue la duración de su programa: 3 meses (Diplomado) o 1 año', async () => {
    let r = await montar({ inscrito: false, diaPrograma: 0, duracionDias: 90, formacion: 'DIPLOMADO' }, { canStartProgram: true });
    expect(textos(r)[0]).toBe('Haz tu programa de 3 meses');
    act(() => raiz?.unmount());
    r = await montar({ inscrito: false, diaPrograma: 0, duracionDias: 365, formacion: 'DIPLOMADO' }, { canStartProgram: true });
    expect(textos(r)[0]).toBe('Haz tu programa de 1 año');
  });

  it('tocar la fila abre el MISMO selector del Día 1 y elegir manda la fecha al mismo POST', async () => {
    mockConsultarActivacion.mockResolvedValue({ activated: false, validStartDates: FECHAS, startDate: null });
    mockActivarPrograma.mockResolvedValue({});
    const r = await montar({ inscrito: false, diaPrograma: 0 }, { canStartProgram: true, canAdminister: true });
    expect(modal(r).props.visible).toBe(false);

    await pulsar(porEtiqueta(r, 'Haz tu programa de 90 días. Elige tu Día 1.'));
    expect(modal(r).props.visible).toBe(true);
    expect(textos(r)).toContain('Elige tu Día 1');

    // Elegir crea la fila: las lecturas siguientes ya no lo dejan empezar.
    mockCapacidades.mockResolvedValue({ programRequired: false, canStartProgram: false, canAccompany: false, canAdminister: true });
    mockConsultarActivacion.mockResolvedValue({ activated: true, validStartDates: [], startDate: '2026-11-04' });
    const dia = r.root.findAll(n => typeof n.props?.onPress === 'function' && n.findAll(m => m.type === Text && decir(m) === 'Miércoles 4 de noviembre').length > 0);
    await pulsar(dia[dia.length - 1]);
    const confirmar = r.root.findAll(n => typeof n.props?.onPress === 'function' && n.findAll(m => m.type === Text && decir(m) === 'CONFIRMAR MI DÍA 1').length > 0);
    await pulsar(confirmar[confirmar.length - 1]);
    expect(mockActivarPrograma).toHaveBeenCalledWith({ startDate: '2026-11-04' });
  });

  it('la ✕ de «Ahora no» mide 48, está fuera de la fila tocable y la esconde sin borrar nada', async () => {
    const r = await montar({ inscrito: false, diaPrograma: 0 }, { canStartProgram: true, canAdminister: true });
    const equis = porEtiqueta(r, 'Ahora no. No se borra nada.');
    expect(equis).toBeTruthy();
    expect(StyleSheet.flatten(equis.props.contenedorStyle)).toMatchObject({ width: 48, height: 48 });
    // No es hija de la fila tocable: sus toques no se mezclan.
    const fila = porEtiqueta(r, 'Haz tu programa de 90 días. Elige tu Día 1.');
    expect(fila.findAll(n => n === equis).length).toBe(0);

    await pulsar(equis);
    expect(textos(r)).toEqual([]);
    expect(mockActivarPrograma).not.toHaveBeenCalled();
    expect(modal(r)?.props.visible ?? false).toBe(false);
  });
});

describe('la cuenta con fila pero sin Día 1', () => {
  it('«Todavía no elegiste tu Día 1 · Elige cuándo empiezas ›», sin ✕, y abre el selector', async () => {
    mockConsultarActivacion.mockResolvedValue({ activated: false, validStartDates: FECHAS, startDate: null });
    const r = await montar({ inscrito: true, diaPrograma: 0 }, { canStartProgram: false, canAdminister: true });
    expect(textos(r)).toEqual(['Todavía no elegiste tu Día 1', 'Elige cuándo empiezas']);
    expect(iconos(r)).not.toContain('close');
    await pulsar(porEtiqueta(r, 'Todavía no elegiste tu Día 1. Elige cuándo empiezas.'));
    expect(modal(r).props.visible).toBe(true);
  });
});

describe('quien no tiene nada que elegir', () => {
  it('el aprendiz en su día 5 no ve la fila ni hace pedidos del Día 1', async () => {
    mockRol = 'TRAINEE';
    const r = await montar({ inscrito: true, diaPrograma: 5 }, { canStartProgram: false });
    expect(textos(r)).toEqual([]);
    expect(programaVisto!.visible).toBe(false);
    expect(mockConsultarActivacion).not.toHaveBeenCalled();
  });
});

describe('si no se pudo comprobar', () => {
  it('sale el aviso de siempre, «No pudimos comprobar tu Día 1», con «Reintentar Día 1»', async () => {
    const r = await montar({ inscrito: false, diaPrograma: 0 }, null);
    expect(textos(r)).toContain('No pudimos comprobar tu Día 1');
    expect(textos(r)).toContain('Reintentar Día 1');
  });
});
