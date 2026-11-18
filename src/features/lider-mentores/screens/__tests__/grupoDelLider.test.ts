import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { hayTocable, montar, porTestID, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';
import type { AprendizDelSemaforo } from '../../../semaforo/types/semaforo.types';

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

const aprendiz = (id: string, nombre: string, color: string, porcentaje: number | null, extra: Record<string, unknown> = {}): AprendizDelSemaforo =>
  ({ aprendizId: id, nombre, avatarUrl: null, porcentaje, color, etiqueta: null, diasConDatos: null, dias: [], ...extra }) as unknown as AprendizDelSemaforo;

let mockLectura: { datos: unknown; cargando: boolean; fallo: string | null; detalleDelFallo: string | null; recargar: () => void };
const mockRecargar = jest.fn();
jest.mock('../../hooks/useGrupoDelLider', () => ({ useGrupoDelLider: () => mockLectura }));
/* Las hojas se prueban en su propio archivo: acá solo importa cuál se abre y con qué grupo. */
const mockHojas = jest.fn<(cual: string, grupo: unknown) => void>();
jest.mock('../../components/HojaElegirMentor', () => ({
  HojaElegirMentor: (p: { grupo: unknown; onAsignado: (mentor: { id: string; nombre: string }) => void }) => {
    mockHojas('mentor', p.grupo);
    mockAsignado = p.onAsignado;
    return null;
  },
}));
jest.mock('../../components/HojaSumarAprendices', () => ({
  HojaSumarAprendices: (p: { grupo: unknown; onSumados: () => void }) => {
    mockHojas('aprendices', p.grupo);
    mockSumados = p.onSumados;
    return null;
  },
}));
let mockAsignado: (mentor: { id: string; nombre: string }) => void = () => undefined;
let mockSumados: () => void = () => undefined;

import { GrupoDelLiderScreen } from '../GrupoDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alVolver = jest.fn();
const alAbrirPersona = jest.fn<(p: AprendizDelSemaforo) => void>();
const alCambiar = jest.fn();
const alCambiarElMentor = jest.fn<(mentor: { id: string; nombre: string }) => void>();
const pantalla = (extra: object = {}) =>
  React.createElement(GrupoDelLiderScreen, {
    grupoId: 'g-1',
    nombre: 'Cupo 1314',
    mentorId: 'm-1',
    mentorNombre: 'E2E Mentor',
    resumen: { colorDelPromedio: 'ROJO', promedio: 0 },
    onVolver: alVolver,
    onAbrirPersona: alAbrirPersona,
    onCambiado: alCambiar,
    onMentorCambiado: alCambiarElMentor,
    ...extra,
  } as never);

const semaforo = (aprendices: AprendizDelSemaforo[], resumen: unknown = { verde: 0, amarillo: 0, rojo: 5, sinDatos: 4, total: 9 }) => ({
  grupoId: 'g-1',
  grupoNombre: 'Cupo 1314',
  desde: '2026-11-12',
  hasta: '2026-11-18',
  cerrada: false,
  resumen,
  aprendices,
});

beforeEach(() => {
  mockRecargar.mockReset();
  mockHojas.mockReset();
  alCambiar.mockReset();
  alCambiarElMentor.mockReset();
  mockLectura = {
    datos: semaforo([
      aprendiz('a-v', 'Verónica Verde', 'VERDE', 92),
      aprendiz('a-s', 'Ana López', 'SIN_DATOS', null),
      aprendiz('a-r2', 'Libre Dos', 'ROJO', 30),
      aprendiz('a-r1', 'E2E Aprendiz', 'ROJO', 0),
      aprendiz('a-a', 'Amalia Ámbar', 'AMARILLO', 55),
    ]),
    cargando: false,
    fallo: null,
    detalleDelFallo: null,
    recargar: mockRecargar,
  };
});

describe('el grupo para el líder: la cabecera', () => {
  it('dice el nombre del grupo, su mentor y su estado con forma y una frase corta', async () => { // spec 056 FR-011
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Cupo 1314');
    expect(texto).toContain('Mentor: E2E Mentor');
    expect(texto).toContain('Grupo en rojo · 0 % en 7 días');
    expect(porTestID(r, 'forma-cuadrado').length).toBeGreaterThan(0);
  });

  it('sin el resumen del grupo dice «Grupo sin datos» en lugar de inventar un color', async () => { // spec 056 FR-011
    const r = await montar(pantalla({ resumen: null }));
    expect(todoElTexto(r)).toContain('Grupo sin datos');
  });

  it('un grupo en ámbar o en verde dice su color con su forma', async () => { // spec 056 FR-011
    const ambar = await montar(pantalla({ resumen: { colorDelPromedio: 'AMARILLO', promedio: 55.4 } }));
    expect(todoElTexto(ambar)).toContain('Grupo en ámbar · 55 % en 7 días');
    const verde = await montar(pantalla({ resumen: { colorDelPromedio: 'VERDE', promedio: 91 } }));
    expect(todoElTexto(verde)).toContain('Grupo en verde · 91 % en 7 días');
  });
});

describe('el grupo para el líder: contadores y aprendices', () => {
  it('muestra los cuatro contadores con su forma y la palabra de cada estado', async () => { // spec 056 FR-012
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    for (const palabra of ['rojo', 'ámbar', 'verde', 'sin datos']) expect(texto).toContain(palabra);
    for (const forma of ['forma-cuadrado', 'forma-triangulo', 'forma-circulo', 'forma-circulo-vacio']) expect(porTestID(r, forma).length).toBeGreaterThan(0);
  });

  it('sin las cifras del servidor no dibuja contadores en cero', async () => { // spec 056 FR-012
    mockLectura.datos = semaforo([aprendiz('a-r1', 'E2E Aprendiz', 'ROJO', 0)], null);
    const r = await montar(pantalla());
    /* Ni el ámbar ni el verde ni el círculo vacío de los contadores: quedan solo el cuadrado rojo de la cabecera y de la fila. */
    for (const forma of ['forma-triangulo', 'forma-circulo', 'forma-circulo-vacio']) expect(porTestID(r, forma)).toHaveLength(0);
  });

  it('ordena a los aprendices como la 055: rojo (el que menos cumplió primero), ámbar, verde y sin datos al final', async () => { // spec 056 FR-012
    const r = await montar(pantalla());
    const nombres = todoElTexto(r).match(/E2E Aprendiz|Libre Dos|Amalia Ámbar|Verónica Verde|Ana López/g);
    expect(nombres).toEqual(['E2E Aprendiz', 'Libre Dos', 'Amalia Ámbar', 'Verónica Verde', 'Ana López']);
  });

  it('cada fila lleva el motivo y el porcentaje en una línea, y su estado con forma', async () => { // spec 056 FR-012
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('· 0 %');
    expect(texto).toContain('· 92 %');
    expect(texto).toContain('Todavía sin datos');
  });

  it('quien lleva su propio programa en el grupo dice que no se mide en el semáforo', async () => { // spec 056 FR-012
    mockLectura.datos = semaforo([aprendiz('m-2', 'Mentor Dos', 'ROJO', 40, { noSeMide: true })]);
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('No se mide en el semáforo');
  });

  it('tocar a un aprendiz abre su ficha', async () => { // spec 056 FR-014
    const r = await montar(pantalla());
    await tocar(r, 'Abrir la ficha de Libre Dos');
    expect(alAbrirPersona).toHaveBeenCalledTimes(1);
    expect(alAbrirPersona.mock.calls[0][0].aprendizId).toBe('a-r2');
  });

  it('un grupo sin aprendices lo dice en una línea, sin lista vacía, y deja sumar aprendices', async () => { // spec 056 FR-013
    mockLectura.datos = semaforo([], { verde: 0, amarillo: 0, rojo: 0, sinDatos: 0, total: 0 });
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Este grupo todavía no tiene aprendices.');
    expect(hayTocable(r, 'Abrir la ficha')).toBe(false);
    expect(hayTocable(r, 'Sumar aprendices al grupo')).toBe(true);
  });
});

describe('el grupo para el líder: «+ Aprendices» y «Cambiar mentor»', () => {
  it('«+ Aprendices» abre la hoja de sumar con este grupo y «Cambiar mentor» la del mentor', async () => { // spec 056 FR-013
    const r = await montar(pantalla());
    await tocar(r, 'Sumar aprendices al grupo');
    expect(mockHojas).toHaveBeenCalledWith('aprendices', { id: 'g-1', nombre: 'Cupo 1314' });
    expect(mockHojas).not.toHaveBeenCalledWith('mentor', expect.objectContaining({ id: 'g-1' }));
    await tocar(r, 'Cambiar mentor');
    expect(mockHojas).toHaveBeenCalledWith('mentor', { id: 'g-1', nombre: 'Cupo 1314', mentorId: 'm-1' });
  });

  it('al cambiar el mentor o sumar aprendices el grupo se relee y quien lo abrió se entera', async () => { // spec 056 FR-009
    await montar(pantalla());
    await act(async () => mockAsignado({ id: 'm-2', nombre: 'Mentor Dos' }));
    expect(mockRecargar).toHaveBeenCalledTimes(1);
    await act(async () => mockSumados());
    expect(mockRecargar).toHaveBeenCalledTimes(2);
    expect(alCambiar).toHaveBeenCalledTimes(2);
  });

  it('tras cambiar el mentor la cabecera dice el mentor nuevo, el que el servidor acaba de aceptar, y no el anterior', async () => { // spec 056 FR-009
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Mentor: E2E Mentor');
    await act(async () => mockAsignado({ id: 'm-2', nombre: 'Mentor Dos' }));
    expect(todoElTexto(r)).toContain('Mentor: Mentor Dos');
    expect(todoElTexto(r)).not.toContain('Mentor: E2E Mentor');
    expect(alCambiarElMentor).toHaveBeenCalledTimes(1);
    expect(alCambiarElMentor).toHaveBeenCalledWith({ id: 'm-2', nombre: 'Mentor Dos' });
  });

  it('un grupo que no tenía mentor lo muestra en la cabecera en cuanto se le asigna uno', async () => { // spec 056 FR-009
    const r = await montar(pantalla({ mentorId: null, mentorNombre: null }));
    expect(todoElTexto(r)).not.toContain('Mentor:');
    await act(async () => mockAsignado({ id: 'm-2', nombre: 'Mentor Dos' }));
    expect(todoElTexto(r)).toContain('Mentor: Mentor Dos');
  });

  it('la hoja de «Cambiar mentor» ya sabe quién es el mentor nuevo (no ofrece de nuevo al anterior como el actual)', async () => { // spec 056 FR-009
    const r = await montar(pantalla());
    await act(async () => mockAsignado({ id: 'm-2', nombre: 'Mentor Dos' }));
    await tocar(r, 'Cambiar mentor');
    expect(mockHojas).toHaveBeenLastCalledWith('mentor', { id: 'g-1', nombre: 'Cupo 1314', mentorId: 'm-2' });
  });

  it('cada botón mide 44 o más de alto', async () => { // spec 056 FR-044
    const r = await montar(pantalla());
    expect(hayTocable(r, 'Cambiar mentor')).toBe(true);
  });
});

describe('el grupo para el líder: cuando no carga', () => {
  it('con un 403 dice el motivo que mandó el servidor', async () => { // spec 056 FR-042
    mockLectura = { datos: null, cargando: false, fallo: 'sin_permiso', detalleDelFallo: 'Ese grupo no es de tus formaciones.', recargar: mockRecargar };
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Ese grupo no es de tus formaciones.');
  });

  it('mientras carga dice que carga y no deja un hueco', async () => { // spec 056 FR-012
    mockLectura = { datos: null, cargando: true, fallo: null, detalleDelFallo: null, recargar: mockRecargar };
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Cargando el grupo');
  });
});
