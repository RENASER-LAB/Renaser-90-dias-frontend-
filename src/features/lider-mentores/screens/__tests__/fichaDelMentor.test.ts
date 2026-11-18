import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { hayTocable, montar, porTestID, tocables, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';
import type { PropsDeFichaDePersona } from '../../../mentor/components/FichaDePersona';
import type { FichaApi } from '../../api/liderMentoresSchemas';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HojaDesdeAbajo: ({ visible, titulo, subtitulo, children }: { visible: boolean; titulo: string; subtitulo?: string; children: React.ReactNode }) =>
      visible ? R.createElement(View, { testID: 'hoja' }, R.createElement(Text, null, `HOJA: ${titulo}`), subtitulo ? R.createElement(Text, null, subtitulo) : null, children) : null,
  };
});
jest.mock('../../../../components/ConfirmacionEnLinea', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ConfirmacionEnLinea: ({ texto }: { texto: string }) => R.createElement(Text, null, texto) };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: jest.fn(), error: jest.fn(), seleccion: jest.fn() } }));
const mockAlerta = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

let props: PropsDeFichaDePersona | null = null;
jest.mock('../../../mentor/components/FichaDePersona', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    FichaDePersona: (p: PropsDeFichaDePersona) => {
      props = p;
      const pie = typeof p.pie === 'function' ? p.pie({ semanaHasta: null }) : p.pie;
      return R.createElement(View, { testID: 'ficha-de-persona' }, p.accionesDeCabecera, p.sinSemana, p.despues, pie);
    },
  };
});
const mockDescargar = jest.fn<(semanaHasta?: string | null) => Promise<void>>();
const mockUsarDescarga = jest.fn<(d: unknown) => void>();
jest.mock('../../hooks/useDescargarSemana', () => ({
  useDescargarSemana: (d: unknown) => {
    mockUsarDescarga(d);
    return { descargando: false, descargar: mockDescargar };
  },
}));
let mockFicha: () => Promise<FichaApi>;
const mockRegistrar = jest.fn<(id: string, nueva: { tipo: string; texto: string; claveOperacion: string; mensajeId: string | null }) => Promise<unknown>>();
jest.mock('../../api/liderMentoresApi', () => ({ obtenerFicha: () => mockFicha(), registrarObservacion: (...a: [string, never]) => mockRegistrar(...a) }));
/* «Programar sesión» se prueba en su propio archivo: acá solo se comprueba que el botón abre la hoja con ese mentor. */
const mockProgramar = jest.fn();
jest.mock('../../components/HojaProgramarSesion', () => ({
  HojaProgramarSesion: (p: { visible: boolean; mentor: { id: string; nombre: string } }) => {
    mockProgramar(p.visible, p.mentor);
    return null;
  },
}));

import { FichaDelMentorScreen } from '../FichaDelMentorScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const grupo = (id: string, nombre: string, trainees: number, s: { rojo: number; amarillo: number; verde: number; sinDatos: number }) => ({
  id,
  name: nombre,
  trainees,
  semaforo: { ...s, total: trainees, promedio: null, color: 'ROJO' },
});
const fichaBase = (extra: Record<string, unknown> = {}): FichaApi =>
  ({
    mentor: {
      userId: 'm-1',
      fullName: 'E2E Mentor',
      avatarUrl: null,
      groups: { source: 'OK', items: [grupo('g-1', 'Cupo 1314', 9, { rojo: 5, amarillo: 0, verde: 0, sinDatos: 4 }), grupo('g-2', 'Grupo Fénix', 1, { rojo: 0, amarillo: 0, verde: 0, sinDatos: 1 })] },
      traineeCount: 10,
      semaforo: { source: 'OK', summary: null },
      attention: { source: 'OK', open: 1, oldestOpenDays: 5, answered: 2, medianResponseHours: null },
      evaluation: { source: 'OK', month: '2026-11', percentage: 0, delivered: 0, expected: 3, traineesEvaluated: 0, state: 'CALCULADA' },
      cupo: { acompanados: 10, maximo: 10 },
      porColor: { rojo: 5, ambar: 0, verde: 0, sinDatos: 5 },
    },
    accountActive: true,
    profile: { level: 'N1', operationalStatus: null, since: null },
    month: '2026-11',
    timezone: 'America/Lima',
    cutoffAt: '2026-11-18T14:00:00Z',
    recentObservations: [],
    haceSuPrograma: true,
    ...extra,
  }) as unknown as FichaApi;

const alVolver = jest.fn();
const alAbrirGrupo = jest.fn<(id: string, nombre: string) => void>();
const alAbrirConsultas = jest.fn();
const pantalla = () => React.createElement(FichaDelMentorScreen, { mentorId: 'm-1', nombre: 'E2E Mentor', onVolver: alVolver, onAbrirGrupo: alAbrirGrupo, onAbrirConsultas: alAbrirConsultas } as never);

const exacto = (r: Awaited<ReturnType<typeof montar>>, etiqueta: string) => {
  const nodo = tocables(r).find(n => n.props.accessibilityLabel === etiqueta);
  if (!nodo) throw new Error(`No hay «${etiqueta}». Hay: ${tocables(r).map(n => n.props.accessibilityLabel).join(' | ')}`);
  return nodo;
};
const campo = (r: Awaited<ReturnType<typeof montar>>) => r.root.findAll(n => n.props.accessibilityLabel === 'Lo que le quieres decir' && typeof n.props.onChangeText === 'function')[0];

beforeEach(() => {
  props = null;
  mockFicha = () => Promise.resolve(fichaBase());
  mockRegistrar.mockReset().mockResolvedValue({ id: 'o-1' });
  mockDescargar.mockReset().mockResolvedValue();
  mockAlerta.mockReset();
  mockProgramar.mockReset();
});

describe('la ficha de un mentor', () => {
  it('es la misma ficha del aprendiz con origen líder y sin grupo, con los datos del mentor y sin el lápiz de notas', async () => { // spec 056 FR-021, FR-023
    await montar(pantalla());
    expect(props?.origen).toEqual({ quien: 'lider', grupoId: null });
    expect(props?.alumno.participanteId).toBe('m-1');
    expect(props?.alumno.nombre).toBe('E2E Mentor');
    expect(props?.sinNotas).toBe(true);
    expect(props?.subtitulo).toContain('N1');
  });

  it('si no sigue su programa, en lugar de la semana y los pilares va una línea que lo dice y «Como mentor» se ve completa', async () => { // spec 056 FR-022
    mockFicha = () => Promise.resolve(fichaBase({ haceSuPrograma: false }));
    const r = await montar(pantalla());
    expect(props?.sinSemana).toBeTruthy();
    expect(todoElTexto(r)).toContain('No sigue su propio programa.');
    expect(todoElTexto(r)).toContain('Como mentor');
    expect(todoElTexto(r)).toContain('Cupo 1314');
  });

  it('si sigue su programa no hay línea de «no sigue»: la ficha trae su semana', async () => { // spec 056 FR-021
    await montar(pantalla());
    expect(props?.sinSemana).toBeFalsy();
  });

  it('con la cuenta suspendida la ficha solo dice eso: sin ficha, sin botones', async () => { // spec 056 FR-022
    mockFicha = () => Promise.resolve(fichaBase({ accountActive: false }));
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Su cuenta está suspendida.');
    expect(props).toBeNull();
    expect(hayTocable(r, 'Alertar')).toBe(false);
    expect(hayTocable(r, 'Descargar semana')).toBe(false);
  });

  it('en la cabecera, en lugar de la nota, hay una estrella que abre «Reconocer, sugerir o alertar»', async () => { // spec 056 FR-023
    const r = await montar(pantalla());
    await tocar(r, 'Reconocer, sugerir o alertar');
    expect(todoElTexto(r)).toContain('HOJA: Reconocer, sugerir o alertar');
  });
});

describe('«Como mentor»', () => {
  it('lista sus grupos, cada uno con su barra de colores y sus contadores, y tocar uno abre ese grupo', async () => { // spec 056 FR-024
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Cupo 1314');
    expect(texto).toContain('9 aprendices');
    expect(texto).toContain('Grupo Fénix');
    expect(texto).toContain('1 aprendiz');
    expect(porTestID(r, 'barra-de-colores')).toHaveLength(2);
    await tocar(r, 'Abrir el grupo Cupo 1314');
    expect(alAbrirGrupo).toHaveBeenCalledWith('g-1', 'Cupo 1314');
  });

  it('dice su evaluación del mes, sus consultas sin responder con los días y «Lo que le dijiste»', async () => { // spec 056 FR-024
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Su evaluación');
    expect(texto).toContain('0 %');
    expect(texto).toContain('Consultas');
    expect(texto).toContain('1 · 5 días');
    expect(texto).toContain('Lo que le dijiste');
    expect(texto).toContain('Nada este mes');
  });

  it('no dice «Evaluaciones que debe»: el servidor cuenta las evidencias de los aprendices del mes, no lo que el mentor debe entregar, y esa cifra daba cientos de «pendientes»', async () => { // spec 056 FR-024
    const base = fichaBase();
    mockFicha = () => Promise.resolve(fichaBase({ mentor: { ...base.mentor, evaluation: { source: 'OK', month: '2026-11', percentage: 21.4, delivered: 245, expected: 1000, traineesEvaluated: 9, state: 'CALCULADA' } } }));
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).not.toContain('Evaluaciones que debe');
    expect(texto).not.toContain('pendientes');
    expect(texto).not.toContain('755');
    expect(texto).toContain('21 %');
    /* Sin la fila no queda un hueco: lo que sigue (consultas) se ve pegado a su evaluación. */
    expect(hayTocable(r, 'Consultas: 1 · 5 días')).toBe(true);
  });

  it('las consultas abren la bandeja de Consultas', async () => { // spec 056 FR-024
    const r = await montar(pantalla());
    await tocar(r, 'Consultas: 1 · 5 días');
    expect(alAbrirConsultas).toHaveBeenCalledTimes(1);
  });

  it('lo que el servidor no pudo leer se dice, no se vuelve un cero', async () => { // spec 056 FR-024
    const base = fichaBase();
    mockFicha = () =>
      Promise.resolve(fichaBase({ mentor: { ...base.mentor, attention: { source: 'UNAVAILABLE', open: null, oldestOpenDays: null, answered: null, medianResponseHours: null }, evaluation: { source: 'UNAVAILABLE', month: null, percentage: null, delivered: null, expected: null, traineesEvaluated: null, state: null } } }));
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('No se pudo leer');
    expect(texto).not.toContain('0 pendientes');
  });

  it('«Lo que le dijiste» muestra cada observación con su fecha y su texto', async () => { // spec 056 FR-025
    mockFicha = () =>
      Promise.resolve(fichaBase({ recentObservations: [{ id: 'o-9', mentorId: 'm-1', type: 'ALERTA', text: 'Escribe a tus 5 en rojo.', sentByChat: true, messageId: 'x', createdAt: '2026-11-17T15:00:00Z' }] }));
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Alerta');
    expect(todoElTexto(r)).toContain('Escribe a tus 5 en rojo.');
    expect(todoElTexto(r)).not.toContain('Nada este mes');
  });
});

describe('Alertar, Descargar semana y Programar sesión', () => {
  it('al pie tiene «Descargar semana» del documento del mentor, «Alertar» y «Programar sesión»', async () => { // spec 056 FR-026
    const r = await montar(pantalla());
    expect(mockUsarDescarga).toHaveBeenCalledWith({ tipo: 'MENTOR', personaId: 'm-1' });
    for (const etiqueta of ['Descargar semana', 'Alertar', 'Programar sesión']) expect(hayTocable(r, etiqueta)).toBe(true);
    await tocar(r, 'Descargar semana');
    expect(mockDescargar).toHaveBeenCalledTimes(1);
  });

  it('«Alertar» abre la hoja con la alerta elegida; al guardar manda el texto sin reenviarlo por el chat (lo hace el servidor), cierra y relee la ficha', async () => { // spec 056 FR-025
    let lecturas = 0;
    mockFicha = () => {
      lecturas += 1;
      return Promise.resolve(fichaBase());
    };
    const r = await montar(pantalla());
    await tocar(r, 'Alertar');
    await act(async () => campo(r).props.onChangeText('Escribe a tus 5 en rojo.'));
    await act(async () => exacto(r, 'Guardar').props.onPress());
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
    const [id, nueva] = mockRegistrar.mock.calls[0];
    expect(id).toBe('m-1');
    expect(nueva.tipo).toBe('ALERTA');
    expect(nueva.texto).toBe('Escribe a tus 5 en rojo.');
    expect(nueva.mensajeId).toBeNull();
    expect(nueva.claveOperacion).toMatch(/^obs-/);
    expect(todoElTexto(r)).not.toContain('HOJA: Reconocer, sugerir o alertar');
    expect(lecturas).toBe(2);
  });

  it('un toque, un pedido: dos toques en «Guardar» guardan una sola observación', async () => { // spec 056 FR-025
    let soltar!: () => void;
    mockRegistrar.mockImplementation(() => new Promise(res => { soltar = () => res({ id: 'o-1' }); }));
    const r = await montar(pantalla());
    await tocar(r, 'Alertar');
    await act(async () => campo(r).props.onChangeText('Texto'));
    await act(async () => {
      exacto(r, 'Guardar').props.onPress();
      exacto(r, 'Guardar').props.onPress();
    });
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
    await act(async () => soltar());
  });

  it('si no se pudo guardar dice el motivo y conserva lo escrito', async () => { // spec 056 FR-025
    mockRegistrar.mockRejectedValueOnce(new Error('sin red'));
    const r = await montar(pantalla());
    await tocar(r, 'Alertar');
    await act(async () => campo(r).props.onChangeText('Texto largo'));
    await act(async () => exacto(r, 'Guardar').props.onPress());
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo guardar', expect.any(String));
    expect(todoElTexto(r)).toContain('HOJA: Reconocer, sugerir o alertar');
    expect(campo(r).props.value).toBe('Texto largo');
  });

  it('«Programar sesión» abre la hoja con ese mentor elegido', async () => { // spec 056 FR-033
    const r = await montar(pantalla());
    await tocar(r, 'Programar sesión');
    expect(mockProgramar).toHaveBeenLastCalledWith(true, { id: 'm-1', nombre: 'E2E Mentor' });
  });
});

describe('cuando la ficha no carga', () => {
  it('dice por qué, con un nombre a la vista y sin huecos', async () => { // spec 056 FR-042
    mockFicha = () => Promise.reject(new Error('boom'));
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('E2E Mentor');
    expect(todoElTexto(r)).toMatch(/No pudimos cargar|No se pudo/);
  });
});
