/**
 * «Tus prácticas» (el engranaje de Training, spec 014) es SOLO para planificar: ninguna fila registra. Se prueba mirando
 * lo que importa el archivo (nada de registro) y montándolo con sus datos: cada dimensión abre su detalle, «Planificar» y
 * cada hábito abren la hoja de Planificar —este último, directo en su editor—, y no hay ✓, cámara ni «Subir».
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import type { HabitItem } from '../../../../screens/TrainingScreen';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../theme/responsive', () => ({ useResponsive: () => ({ horizontalPadding: 18 }) }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined } }));
/** La hoja de Planificar es otra pieza (specs 008 a 011): acá solo importa cuándo se abre y en qué hábito. */
const mockHoja: { props: { visible: boolean; abrirEnHabitoId?: string | null; dimension: string } | null } = { props: null };
jest.mock('../PlanificarDimensionModal', () => ({
  PlanificarDimensionModal: (props: { visible: boolean; abrirEnHabitoId?: string | null; dimension: string }) => {
    mockHoja.props = props;
    return null;
  },
}));

const mockProgramarRepaso = jest.fn(async (_usuario: string) => true);
/** Por defecto no contesta (la lectura del aviso es asíncrona y movería el estado fuera de `act`); la prueba del aviso sí la resuelve. */
const mockTieneRepaso = jest.fn(() => new Promise<boolean>(() => undefined));
jest.mock('../../../habits/notificaciones/recordatoriosDeHabito', () => ({
  HAY_RECORDATORIOS_LOCALES: true,
  tieneRepasoSemanal: () => mockTieneRepaso(),
  programarRepasoSemanal: (usuario: string) => mockProgramarRepaso(usuario),
  cancelarRepasoSemanal: async () => undefined,
}));

import { PracticasDeTraining } from '../PracticasDeTraining';
import { PRACTICAS_ABIERTAS, type EstadoDePracticas } from '../../utils/navegacionDePracticas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const habito = (id: string, extra: Partial<HabitItem> = {}): HabitItem => ({
  id,
  habitoId: `h-${id}`,
  dimension: 'CUERPO',
  title: `Hábito ${id}`,
  time: '06:00',
  tag: 'Innegociable',
  streak: null,
  done: false,
  hasEvidence: false,
  tieneTrackHoy: true,
  evidenceRequirement: 'REQUIRED',
  ...extra,
});

let raiz: ReactTestRenderer | null = null;
const onEstado = jest.fn<(e: EstadoDePracticas) => void>();
const onGuardado = jest.fn();

function montar(estado: EstadoDePracticas, extra: { cargando?: boolean } = {}) {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(PracticasDeTraining, {
        estado,
        onEstado,
        habits: [habito('a', { done: true }), habito('b')],
        planHabits: [habito('a'), habito('b'), habito('mente', { dimension: 'MENTE' })],
        cargando: extra.cargando ?? false,
        error: null,
        onReintentar: () => undefined,
        deshabilitada: false,
        sinLista: false,
        userId: 'u1',
        renombre: { titulos: {}, renombrar: async () => undefined, quitarRenombre: async () => undefined } as never,
        onGuardado,
        confirmacion: null,
        onConfirmacionTerminada: () => undefined,
        scrollProps: {},
        estiloDelContenido: {},
      }),
    );
  });
}
const botones = (r: ReactTestRenderer) =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel);
const conEtiqueta = (parte: string): ReactTestInstance => botones(raiz!).filter(n => String(n.props.accessibilityLabel).includes(parte))[0];
const textosDeNodos = (nodos: ReactTestInstance[]): string =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .join(' | ');
const textos = (r: ReactTestRenderer) => textosDeNodos(r.root.findAll(() => true));

beforeEach(() => {
  onEstado.mockReset();
  onGuardado.mockReset();
  mockProgramarRepaso.mockClear();
  mockHoja.props = null;
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('«Tus prácticas»: solo planificar', () => {
  it('no importa nada de registrar: ni la cámara, ni la evidencia, ni la Pastilla, ni la Clase, ni el cierre, ni el check', () => {
    const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'PracticasDeTraining.tsx'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const registro of [
      'useRegistroConFoto', 'RegistroConFotoModal', 'EvidenciaHabitoModal', 'PastillaRenacerModal', 'ClaseDiariaModal',
      'completarRegistro', 'confirmarEvidencia', 'sellarRocaDiaria', 'CheckDelHabito', 'FilaDelDia', 'HojaDelHabito',
      'onRegistrar', 'onMarcar', 'toggleHabitState', 'openEvidenceModal', 'habitoCumplido', 'checkbox',
    ]) {
      expect({ registro, aparece: fuente.includes(registro) }).toEqual({ registro, aparece: false });
    }
  });

  it('«Arma tu semana los domingos» vive acá, con el mismo interruptor de siempre', async () => {
    mockTieneRepaso.mockResolvedValueOnce(false);
    montar(PRACTICAS_ABIERTAS);
    await act(async () => undefined);
    expect(textos(raiz!)).toContain('Arma tu semana los domingos');
    const interruptor = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Arma tu semana los domingos' && typeof n.props.onPress === 'function')[0];
    await act(async () => { interruptor.props.onPress(); });
    expect(mockProgramarRepaso).toHaveBeenCalledWith('u1');
  });

  it('la raíz: las cinco dimensiones con su avance, y ningún botón de registrar', () => {
    montar(PRACTICAS_ABIERTAS);
    const t = textos(raiz!);
    expect(t).toContain('Tus prácticas');
    for (const nombre of ['Cuerpo', 'Mente', 'Emociones', 'Espíritu', 'Vida y negocio']) expect(t).toContain(nombre);
    expect(t).toContain('1 de 2 hoy'); // Cuerpo: uno cumplido de dos
    expect(raiz!.root.findAll(n => n.props.accessibilityRole === 'checkbox')).toHaveLength(0);
    for (const palabra of ['Subir', 'Tomar foto', 'Escuchar', 'Marcar', 'Registrar']) expect(t).not.toContain(palabra);
  });

  it('tocar una dimensión abre su detalle', () => {
    montar(PRACTICAS_ABIERTAS);
    act(() => conEtiqueta('Cuerpo:').props.onPress());
    expect(onEstado).toHaveBeenCalledWith({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' });
  });

  it('el detalle: «Planificar Cuerpo», los hábitos de la dimensión y ningún botón de registrar', () => {
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' });
    const t = textos(raiz!);
    expect(t).toContain('Planificar Cuerpo');
    expect(t).toContain('Tus hábitos (2)');
    expect(t).toContain('Hábito a');
    expect(t).toContain('Hábito b');
    expect(t).not.toContain('Hábito mente');
    expect(t).toContain('Aquí solo se planifica. Para registrar, vuelve a Training.');
    expect(raiz!.root.findAll(n => n.props.accessibilityRole === 'checkbox')).toHaveLength(0);
    for (const palabra of ['Subir', 'Tomar foto', 'Escuchar', 'Marcar']) expect(t).not.toContain(palabra);
  });

  it('«Planificar Cuerpo» abre la hoja de siempre, en su lista', () => {
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' });
    act(() => conEtiqueta('Planificar Cuerpo').props.onPress());
    expect(onEstado).toHaveBeenCalledWith({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO', planificando: true, habitoId: null });
  });

  it('tocar un hábito abre su editor en Planificar', () => {
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' });
    act(() => conEtiqueta('Hábito b, 06:00').props.onPress());
    expect(onEstado).toHaveBeenCalledWith({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO', planificando: true, habitoId: 'h-b' });
  });

  it('la hoja recibe la dimensión, sus hábitos y el hábito a abrir; cerrada, no está visible', () => {
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' });
    expect(mockHoja.props?.visible).toBe(false);
    act(() => raiz!.update(React.createElement(PracticasDeTraining, {
      ...(raiz!.root.props as object),
      estado: { ...PRACTICAS_ABIERTAS, dimension: 'CUERPO', planificando: true, habitoId: 'h-b' },
    } as never)));
    expect(mockHoja.props).toMatchObject({ visible: true, abrirEnHabitoId: 'h-b', dimension: 'CUERPO' });
  });

  it('la flecha vuelve un nivel: de una dimensión a la lista, de la lista a Training', () => {
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' });
    act(() => conEtiqueta('Volver').props.onPress());
    expect(onEstado).toHaveBeenLastCalledWith(PRACTICAS_ABIERTAS);
    act(() => raiz!.unmount());
    montar(PRACTICAS_ABIERTAS);
    act(() => conEtiqueta('Volver').props.onPress());
    expect(onEstado.mock.lastCall?.[0]).toMatchObject({ abierta: false });
  });

  it('Vida y negocio: sin hábitos de catálogo, no ofrece planificar y manda a Plan', () => {
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'VIDA Y NEGOCIO' });
    const t = textos(raiz!);
    expect(t).toContain('Las acciones de tus objetivos se planifican en Plan');
    expect(t).not.toContain('Planificar Vida y negocio');
  });
});
