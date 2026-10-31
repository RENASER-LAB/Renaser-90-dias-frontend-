/**
 * «Tus prácticas» (el engranaje de Training, spec 014) es SOLO para planificar: ninguna fila registra. Se prueba mirando
 * lo que importa el archivo (nada de registro) y montándolo con sus datos: tocar una dimensión abre DIRECTO la hoja
 * «Planificar <dimensión>» (2026-10-31: ya no hay un detalle en el medio que repita la lista de hábitos), cerrarla
 * vuelve a «Tus prácticas», y no hay ✓, cámara ni «Subir».
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
type PropsDeLaHoja = {
  visible: boolean;
  dimension: string;
  nombreDimension?: string;
  habits: HabitItem[];
  renombre?: unknown;
  onCerrar: () => void;
  onGuardado: (texto?: string) => void;
};
const mockHoja: { props: PropsDeLaHoja | null } = { props: null };
jest.mock('../PlanificarDimensionModal', () => ({
  PlanificarDimensionModal: (props: PropsDeLaHoja) => {
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

  it('ya no tiene el detalle intermedio: ni su tarjeta «Planificar», ni su lista de hábitos, ni «Cambiar nombre» ni la hoja de renombre', () => {
    const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'PracticasDeTraining.tsx'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const resto of ['RenombrarHabitoModal', 'esRenombrable', 'tituloVisible', 'abrirEnHabitoId', 'planificando', 'habitoId: ', 'Tus hábitos', 'Cambiar nombre', 'Aquí solo se planifica']) {
      expect({ resto, aparece: fuente.includes(resto) }).toEqual({ resto, aparece: false });
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

  it('tocar una dimensión abre DIRECTO su hoja «Planificar» (sin un detalle en el medio)', () => {
    montar(PRACTICAS_ABIERTAS);
    expect(mockHoja.props?.visible).toBe(false);
    act(() => conEtiqueta('Cuerpo:').props.onPress());
    expect(onEstado).toHaveBeenCalledTimes(1);
    expect(onEstado).toHaveBeenCalledWith({ abierta: true, dimension: 'CUERPO' });
  });

  it('con una dimensión elegida la hoja está abierta, con SUS hábitos y el renombre, y atrás sigue «Tus prácticas» (no un detalle)', () => {
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' });
    expect(mockHoja.props).toMatchObject({ visible: true, dimension: 'CUERPO', nombreDimension: 'Cuerpo' });
    expect(mockHoja.props?.habits.map(h => h.id)).toEqual(['a', 'b']); // no entra «mente»
    expect(mockHoja.props?.renombre).toBeDefined();
    // La pantalla de fondo es la misma «Tus prácticas»: sigue la lista de dimensiones y no hay detalle.
    const t = textos(raiz!);
    expect(t).toContain('Tus prácticas');
    for (const nombre of ['Cuerpo', 'Mente', 'Emociones', 'Espíritu', 'Vida y negocio']) expect(t).toContain(nombre);
    for (const sobrante of ['Planificar Cuerpo', 'Tus hábitos (2)', 'Cambiar nombre', 'Aquí solo se planifica']) expect(t).not.toContain(sobrante);
    expect(botones(raiz!).filter(n => String(n.props.accessibilityLabel).includes('Abrir para planificarlo'))).toHaveLength(0);
  });

  it('cerrada la hoja (✕, arrastrar, atrás), vuelve a «Tus prácticas» sin tocar nada más', () => {
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'MENTE' });
    act(() => mockHoja.props!.onCerrar());
    expect(onEstado).toHaveBeenLastCalledWith({ abierta: true, dimension: null });
    expect(onGuardado).not.toHaveBeenCalled();
  });

  it('guardar en la hoja vuelve a «Tus prácticas» y avisa a Training (que recarga y confirma en línea)', () => {
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' });
    act(() => mockHoja.props!.onGuardado('«Caminar» creado'));
    expect(onEstado).toHaveBeenLastCalledWith({ abierta: true, dimension: null });
    expect(onGuardado).toHaveBeenCalledWith('«Caminar» creado');
  });

  it('sin dimensión elegida la hoja no está abierta', () => {
    montar(PRACTICAS_ABIERTAS);
    expect(mockHoja.props?.visible).toBe(false);
  });

  it('la flecha de «Tus prácticas» vuelve a Training (la hoja tiene su propio atrás)', () => {
    montar(PRACTICAS_ABIERTAS);
    act(() => conEtiqueta('Volver').props.onPress());
    expect(onEstado.mock.lastCall?.[0]).toMatchObject({ abierta: false });
  });

  it('Vida y negocio también abre su hoja; el mensaje de que se planifica en Plan lo dice la hoja', () => {
    montar(PRACTICAS_ABIERTAS);
    act(() => conEtiqueta('Vida y negocio:').props.onPress());
    expect(onEstado).toHaveBeenCalledWith({ abierta: true, dimension: 'VIDA Y NEGOCIO' });
    act(() => raiz!.unmount());
    montar({ ...PRACTICAS_ABIERTAS, dimension: 'VIDA Y NEGOCIO' });
    expect(mockHoja.props).toMatchObject({ visible: true, dimension: 'VIDA Y NEGOCIO' });
    expect(mockHoja.props?.habits).toEqual([]);
  });
});
