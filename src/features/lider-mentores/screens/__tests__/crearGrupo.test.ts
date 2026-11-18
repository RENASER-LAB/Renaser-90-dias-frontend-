import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import { hayTocable, montar, porTestID, tocables, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';
import type { PadronApi } from '../../api/liderMentoresSchemas';
import type { GrupoDelLider } from '../../types/gruposDelLider.types';

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
const mockAtras = jest.fn();
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: (f: () => boolean) => mockAtras.mockImplementation(f) }));
const mockAlerta = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

let mockGrupos: () => Promise<GrupoDelLider[]>;
const mockCrear = jest.fn<(d: { nombre: string; cohorteId: string; formacion: string | null }) => Promise<{ id: string }>>();
const mockAsignar = jest.fn<(g: unknown, m: unknown) => Promise<string>>();
const mockSumar = jest.fn<(id: string, ids: string[]) => Promise<{ sumados: number; fallo: unknown | null }>>();
jest.mock('../../api/gruposDelLiderApi', () => ({
  obtenerGruposDelLider: () => mockGrupos(),
  crearGrupoDelLider: (d: never) => mockCrear(d),
  asignarMentorDelLider: (g: unknown, m: unknown) => mockAsignar(g, m),
  sumarAprendicesAlGrupo: (id: string, ids: string[]) => mockSumar(id, ids),
}));
let mockPadron: () => Promise<PadronApi>;
jest.mock('../../api/liderMentoresApi', () => ({ obtenerPadron: () => mockPadron() }));
let mockAprendices: () => Promise<Array<{ userId: string; fullName: string | null; avatarUrl: string | null; cellId: string | null }>>;
jest.mock('../../../admin/api/adminApi', () => ({ aprendicesDisponibles: () => mockAprendices() }));

import { CrearGrupoScreen } from '../CrearGrupoScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const grupoExistente = (nombre: string): GrupoDelLider => ({ id: `g-${nombre}`, nombre, cohorteId: 'c-1', formacion: 'ESCUELA', mentorId: 'm-9', mentorNombre: 'X', aprendices: 5, cupo: 10, esRecepcion: false, enCurso: true, cohorteActiva: true });
const mentor = (id: string, nombre: string, acompanados: number, maximo: number, grupos: string[] = ['g-x']) => ({
  userId: id,
  fullName: nombre,
  avatarUrl: null,
  groups: { source: 'OK', items: grupos.map(g => ({ id: g, name: g, trainees: acompanados, semaforo: null })) },
  traineeCount: acompanados,
  semaforo: { source: 'OK', summary: null },
  attention: { source: 'OK', open: 0, oldestOpenDays: null, answered: 0, medianResponseHours: null },
  evaluation: { source: 'OK', month: '2026-11', percentage: null, delivered: null, expected: null, traineesEvaluated: null, state: null },
  cupo: { acompanados, maximo },
  porColor: null,
});

const alVolver = jest.fn();
const alCrearElGrupo = jest.fn<(g: { id: string; nombre: string }) => void>();
const pantalla = () => React.createElement(CrearGrupoScreen, { onVolver: alVolver, onCreado: alCrearElGrupo } as never);

const campo = (r: Awaited<ReturnType<typeof montar>>) => r.root.findAll(n => n.props.accessibilityLabel === 'Nombre del grupo' && typeof n.props.onChangeText === 'function')[0];
const escribir = async (r: Awaited<ReturnType<typeof montar>>, texto: string) => act(async () => campo(r).props.onChangeText(texto));
const exacto = (r: Awaited<ReturnType<typeof montar>>, etiqueta: string) => {
  const nodo = tocables(r).find(n => n.props.accessibilityLabel === etiqueta);
  if (!nodo) throw new Error(`No hay «${etiqueta}». Hay: ${tocables(r).map(n => n.props.accessibilityLabel).join(' | ')}`);
  return nodo;
};
const tocarExacto = async (r: Awaited<ReturnType<typeof montar>>, etiqueta: string) => act(async () => exacto(r, etiqueta).props.onPress());

/** Llega al paso 2 con un nombre válido. */
async function alPaso2(nombre = 'Grupo Nuevo') {
  const r = await montar(pantalla());
  await escribir(r, nombre);
  await tocarExacto(r, 'Siguiente');
  return r;
}

beforeEach(() => {
  mockGrupos = () => Promise.resolve([grupoExistente('Cupo 1314'), grupoExistente('Fénix')]);
  mockPadron = () => Promise.resolve({ month: '2026-11', timezone: 'x', cutoffAt: '2026-11-18T14:00:00Z', semaforoFrom: null, semaforoTo: null, mentors: [mentor('m-1', 'Ricardo Palomino', 5, 10), mentor('m-2', 'Mentor Dos', 0, 0, []), mentor('m-3', 'E2E Mentor', 10, 10)] } as unknown as PadronApi);
  mockAprendices = () =>
    Promise.resolve([
      { userId: 'a-1', fullName: 'Ajustado Tiempo E2E', avatarUrl: null, cellId: null },
      { userId: 'a-2', fullName: 'Activación Uno E2E', avatarUrl: null, cellId: null },
      { userId: 'a-3', fullName: 'Ya tiene grupo', avatarUrl: null, cellId: 'g-otro' },
      { userId: 'a-4', fullName: 'Ajeno Dos E2E', avatarUrl: null, cellId: null },
    ]);
  mockCrear.mockReset().mockResolvedValue({ id: 'g-nuevo' });
  mockAsignar.mockReset().mockResolvedValue('asignado');
  mockSumar.mockReset().mockResolvedValue({ sumados: 2, fallo: null });
  mockAlerta.mockReset();
  alVolver.mockReset();
  alCrearElGrupo.mockReset();
});

describe('«Crear grupo»: los tres pasos', () => {
  it('empieza por el nombre, con «Paso 1 de 3» y una sola decisión', async () => { // spec 056 FR-008
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Paso 1 de 3');
    expect(texto).toContain('Nombre del grupo');
    expect(texto).not.toContain('¿Quién lo acompaña?');
  });

  it('el nombre vacío o repetido lo dice el campo antes de avanzar', async () => { // spec 056 FR-008
    const r = await montar(pantalla());
    await tocarExacto(r, 'Siguiente');
    expect(todoElTexto(r)).toContain('Pon un nombre para el grupo.');
    expect(todoElTexto(r)).toContain('Paso 1 de 3');
    await escribir(r, '  cupo 1314 ');
    await tocarExacto(r, 'Siguiente');
    expect(todoElTexto(r)).toContain('Ya hay un grupo con ese nombre.');
    expect(todoElTexto(r)).toContain('Paso 1 de 3');
  });

  it('el segundo paso es el mentor: cada uno con su cupo y los de cupo lleno apagados, sin poder elegirse', async () => { // spec 056 FR-008
    const r = await alPaso2();
    expect(todoElTexto(r)).toContain('Paso 2 de 3');
    expect(todoElTexto(r)).toContain('¿Quién lo acompaña?');
    expect(porTestID(r, 'anillo-de-cupo').length).toBeGreaterThanOrEqual(2);
    const lleno = tocables(r).find(n => (n.props.accessibilityLabel as string).startsWith('E2E Mentor'));
    expect(lleno?.props.disabled).toBe(true);
    expect(lleno?.props.accessibilityLabel).toContain('Cupo lleno');
    const conCupo = tocables(r).find(n => (n.props.accessibilityLabel as string).startsWith('Ricardo Palomino'));
    expect(conCupo?.props.disabled).toBeFalsy();
  });

  it('un mentor sin grupo (0/0) no está lleno: se puede elegir', async () => { // spec 056 FR-008
    const r = await alPaso2();
    const sinGrupo = tocables(r).find(n => (n.props.accessibilityLabel as string).startsWith('Mentor Dos'));
    expect(sinGrupo?.props.disabled).toBeFalsy();
  });

  it('sin elegir mentor no se avanza', async () => { // spec 056 FR-008
    const r = await alPaso2();
    expect(exacto(r, 'Siguiente').props.disabled).toBe(true);
  });

  it('el tercer paso lista solo a los aprendices sin grupo, con buscador y la cantidad', async () => { // spec 056 FR-008
    const r = await alPaso2();
    await tocar(r, 'Ricardo Palomino');
    await tocarExacto(r, 'Siguiente');
    const texto = todoElTexto(r);
    expect(texto).toContain('Paso 3 de 3');
    expect(texto).toContain('3 sin grupo');
    expect(texto).toContain('Ajustado Tiempo E2E');
    expect(texto).not.toContain('Ya tiene grupo');
    expect(hayTocable(r, 'Buscar un aprendiz por nombre')).toBe(false); // es un campo, no un botón
    const buscador = r.root.findAll(n => n.props.accessibilityLabel === 'Buscar un aprendiz por nombre' && typeof n.props.onChangeText === 'function')[0];
    await act(async () => buscador.props.onChangeText('activacion'));
    expect(todoElTexto(r)).toContain('Activación Uno E2E');
    expect(todoElTexto(r)).not.toContain('Ajeno Dos E2E');
  });
});

describe('«Crear grupo»: el resumen y la creación', () => {
  async function alResumen() {
    const r = await alPaso2('Grupo Nuevo');
    await tocar(r, 'Ricardo Palomino');
    await tocarExacto(r, 'Siguiente');
    await tocar(r, 'Ajustado Tiempo E2E');
    await tocar(r, 'Activación Uno E2E');
    await tocarExacto(r, 'Revisar');
    return r;
  }

  it('antes de crear muestra el nombre, el mentor y los aprendices elegidos para confirmar, sin crear nada todavía', async () => { // spec 056 FR-008
    const r = await alResumen();
    const texto = todoElTexto(r);
    expect(texto).toContain('Resumen');
    expect(texto).toContain('Grupo Nuevo');
    expect(texto).toContain('Ricardo Palomino');
    expect(texto).toContain('2: Ajustado Tiempo E2E, Activación Uno E2E');
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('al aceptar crea el grupo en la generación activa, le pone el mentor y le suma los aprendices, en ese orden', async () => { // spec 056 FR-008
    const r = await alResumen();
    await tocarExacto(r, 'Crear grupo');
    expect(mockCrear).toHaveBeenCalledWith({ nombre: 'Grupo Nuevo', cohorteId: 'c-1', formacion: 'ESCUELA' });
    expect(mockAsignar).toHaveBeenCalledWith({ id: 'g-nuevo', nombre: 'Grupo Nuevo', mentorId: null }, { userId: 'm-1', fullName: 'Ricardo Palomino', grupos: ['g-x'] });
    expect(mockSumar).toHaveBeenCalledWith('g-nuevo', ['a-1', 'a-2']);
    expect(mockCrear.mock.invocationCallOrder[0]).toBeLessThan(mockAsignar.mock.invocationCallOrder[0]);
    expect(mockAsignar.mock.invocationCallOrder[0]).toBeLessThan(mockSumar.mock.invocationCallOrder[0]);
    expect(alCrearElGrupo).toHaveBeenCalledWith({ id: 'g-nuevo', nombre: 'Grupo Nuevo' });
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('sin aprendices elegidos crea el grupo con su mentor y no pide sumar a nadie', async () => { // spec 056 FR-008
    const r = await alPaso2('Solo mentor');
    await tocar(r, 'Mentor Dos');
    await tocarExacto(r, 'Siguiente');
    await tocarExacto(r, 'Revisar');
    expect(todoElTexto(r)).toContain('Ninguno por ahora');
    await tocarExacto(r, 'Crear grupo');
    expect(mockCrear).toHaveBeenCalledTimes(1);
    expect(mockSumar).not.toHaveBeenCalled();
  });

  it('un toque, un pedido: dos toques en «Crear grupo» crean un solo grupo', async () => { // spec 056 FR-008
    let soltar!: () => void;
    mockCrear.mockImplementation(() => new Promise(res => { soltar = () => res({ id: 'g-nuevo' }); }));
    const r = await alResumen();
    await act(async () => {
      exacto(r, 'Crear grupo').props.onPress();
      exacto(r, 'Crear grupo').props.onPress();
    });
    expect(mockCrear).toHaveBeenCalledTimes(1);
    await act(async () => soltar());
  });

  it('si el servidor rechaza crear el grupo dice su motivo y no avanza ni crea nada más', async () => { // spec 056 FR-042
    mockCrear.mockRejectedValueOnce(new ApiError(403, 'Esa generación no es de tus formaciones.', { codigo: 'FUERA_DE_SU_ALCANCE' }));
    const r = await alResumen();
    await tocarExacto(r, 'Crear grupo');
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo crear el grupo', 'Esa generación no es de tus formaciones.');
    expect(mockAsignar).not.toHaveBeenCalled();
    expect(alCrearElGrupo).not.toHaveBeenCalled();
  });

  it('si el grupo se creó pero algún aprendiz no entró, lo dice y deja terminar en el grupo', async () => { // spec 056 FR-009
    mockSumar.mockResolvedValueOnce({ sumados: 1, fallo: new ApiError(409, 'El grupo ya está lleno.', { codigo: 'CUPO_LLENO' }) });
    const r = await alResumen();
    await tocarExacto(r, 'Crear grupo');
    expect(mockAlerta).toHaveBeenCalledTimes(1);
    expect(String(mockAlerta.mock.calls[0][1])).toContain('Entraron 1 de 2 aprendices: El grupo ya está lleno.');
    expect(alCrearElGrupo).toHaveBeenCalledWith({ id: 'g-nuevo', nombre: 'Grupo Nuevo' });
  });
});

describe('«Crear grupo»: el gesto de volver', () => {
  it('sube un paso por vez y desde el primero sale del asistente', async () => { // spec 056 FR-046
    const r = await alPaso2();
    expect(todoElTexto(r)).toContain('Paso 2 de 3');
    await act(async () => mockAtras());
    expect(todoElTexto(r)).toContain('Paso 1 de 3');
    expect(alVolver).not.toHaveBeenCalled();
    await act(async () => mockAtras());
    expect(alVolver).toHaveBeenCalledTimes(1);
  });

  it('lo elegido sigue ahí al volver un paso', async () => { // spec 056 FR-046
    const r = await alPaso2('Mi grupo');
    await tocar(r, 'Ricardo Palomino');
    await tocarExacto(r, 'Siguiente');
    await act(async () => mockAtras());
    expect(todoElTexto(r)).toContain('Paso 2 de 3');
    expect(tocables(r).find(n => (n.props.accessibilityLabel as string).startsWith('Ricardo Palomino'))?.props.accessibilityState).toMatchObject({ checked: true });
  });
});

describe('«Crear grupo»: sin generación activa', () => {
  it('lo dice y no deja avanzar', async () => { // spec 056 FR-008
    mockGrupos = () => Promise.resolve([{ ...grupoExistente('Viejo'), cohorteActiva: false }]);
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('No hay una generación activa para crear un grupo.');
    expect(exacto(r, 'Siguiente').props.disabled).toBe(true);
  });
});
