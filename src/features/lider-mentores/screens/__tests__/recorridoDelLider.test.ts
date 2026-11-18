import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { montar, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';

/**
 * El recorrido del líder (spec 056 FR-046): Mis mentores → mentor → grupo → aprendiz, y Grupos, Crear grupo, Consultas y el reporte. Cada pantalla es un
 * doble con sus botones; lo que se prueba es la pila: a dónde lleva cada toque y que el atrás suba un nivel por vez hasta Yo.
 */
type Props = Record<string, (...a: never[]) => void>;
/* Los tipos con nombre de parámetro van aquí afuera: dentro de una fábrica de `jest.mock` el plugin de hoisting los toma por variables de fuera. */
type AbrirConNombre = (id: string, nombre: string) => void;
type AbrirGrupos = (filtro?: string) => void;
type AbrirAlgo = (algo: unknown) => void;
function mockDoble(nombre: string, botones: Array<[string, (p: Props) => void]>) {
  return (p: Props & { onVolver?: () => void }) => {
    const R = jest.requireActual<typeof import('react')>('react');
    const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return R.createElement(
      View,
      null,
      R.createElement(Text, null, `PANTALLA ${nombre}`),
      R.createElement(Pressable, { accessibilityLabel: `Volver de ${nombre}`, onPress: () => (p.onVolver ?? p.onSalir)?.() }),
      ...botones.map(([etiqueta, accion]) => R.createElement(Pressable, { key: etiqueta, accessibilityLabel: etiqueta, onPress: () => accion(p) })),
    );
  };
}
const mockPropsDe: Record<string, unknown> = {};
jest.mock('../MisMentoresScreen', () => ({
  MisMentoresScreen: (p: Props) => {
    mockPropsDe.misMentores = p;
    return mockDoble('Mis mentores', [
      ['Abrir mentor', q => (q.onAbrirMentor as unknown as AbrirConNombre)('m-1', 'E2E Mentor')],
      ['Asignar', q => (q.onAbrirGrupos as unknown as AbrirGrupos)('sinMentor')],
      ['Grupos', q => (q.onAbrirGrupos as unknown as AbrirGrupos)()],
      ['Consultas', q => q.onAbrirConsultas()],
      ['Reporte', q => q.onAbrirReporte()],
      ['Todos', q => q.onAbrirTodos?.()],
      ['Hábitos', q => q.onAbrirHabitos?.()],
    ])(p);
  },
}));
jest.mock('../FichaDelMentorScreen', () => ({
  FichaDelMentorScreen: (p: Props) => {
    mockPropsDe.fichaMentor = p;
    return mockDoble('ficha del mentor', [['Abrir grupo', q => (q.onAbrirGrupo as unknown as AbrirConNombre)('g-1', 'Cupo 1314')], ['Consultas del mentor', q => q.onAbrirConsultas()]])(p);
  },
}));
jest.mock('../GruposDelLiderScreen', () => ({
  GruposDelLiderScreen: (p: Props) => {
    mockPropsDe.grupos = p;
    return mockDoble('Grupos', [
      ['Abrir grupo de la lista', q => (q.onAbrirGrupo as unknown as AbrirAlgo)({ id: 'g-2', nombre: 'Fénix', mentorNombre: 'Ana' })],
      ['Crear grupo', q => q.onCrear()],
    ])(p);
  },
}));
jest.mock('../CrearGrupoScreen', () => ({
  CrearGrupoScreen: (p: Props) => {
    mockPropsDe.crear = p;
    return mockDoble('Crear grupo', [['Terminar', q => (q.onCreado as unknown as AbrirAlgo)({ id: 'g-9', nombre: 'Nuevo' })]])(p);
  },
}));
jest.mock('../GrupoDelLiderScreen', () => ({
  GrupoDelLiderScreen: (p: Props) => {
    mockPropsDe.grupo = p;
    return mockDoble('el grupo', [['Abrir aprendiz', q => (q.onAbrirPersona as unknown as AbrirAlgo)({ aprendizId: 'a-1', nombre: 'Ana López' })]])(p);
  },
}));
jest.mock('../FichaDelAprendizDelLider', () => ({
  FichaDelAprendizDelLider: (p: Props) => {
    mockPropsDe.aprendiz = p;
    return mockDoble('ficha del aprendiz', [])(p);
  },
}));
jest.mock('../ConsultasDelLiderScreen', () => ({ ConsultasDelLiderScreen: (p: Props) => mockDoble('Consultas', [])(p) }));
jest.mock('../ReporteScreen', () => ({ ReporteScreen: (p: Props) => mockDoble('Reporte', [])(p) }));

import { LiderMentoresScreen } from '../LiderMentoresScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alSalir = jest.fn();
const alAbrirTodos = jest.fn();
const alAbrirHabitos = jest.fn();
const alVolverAVigente = jest.fn();
const pantalla = () =>
  React.createElement(LiderMentoresScreen, { resumenPorGrupos: [], onSalir: alSalir, onAbrirTodos: alAbrirTodos, onAbrirHabitos: alAbrirHabitos, volverAVigente: alVolverAVigente } as never);
const volverDe = async (r: Awaited<ReturnType<typeof montar>>, nombre: string) => tocar(r, `Volver de ${nombre}`);

beforeEach(() => {
  alSalir.mockReset();
  alAbrirTodos.mockReset();
  alAbrirHabitos.mockReset();
  alVolverAVigente.mockReset();
});

describe('el recorrido del líder', () => {
  it('abre en «Mis mentores» y relee el resumen por grupos una sola vez, para que las cifras sean de los últimos 7 días', async () => { // spec 056 FR-002
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('PANTALLA Mis mentores');
    expect(alVolverAVigente).toHaveBeenCalledTimes(1);
    await tocar(r, 'Grupos');
    await volverDe(r, 'Grupos');
    expect(alVolverAVigente).toHaveBeenCalledTimes(1);
  });

  it('Mis mentores → mentor → grupo → aprendiz, y el atrás sube un nivel por vez hasta salir a Yo', async () => { // spec 056 FR-046
    const r = await montar(pantalla());
    await tocar(r, 'Abrir mentor');
    expect(todoElTexto(r)).toContain('PANTALLA ficha del mentor');
    await tocar(r, 'Abrir grupo');
    expect(todoElTexto(r)).toContain('PANTALLA el grupo');
    expect((mockPropsDe.grupo as { mentorNombre: string }).mentorNombre).toBe('E2E Mentor');
    await tocar(r, 'Abrir aprendiz');
    expect(todoElTexto(r)).toContain('PANTALLA ficha del aprendiz');
    expect(mockPropsDe.aprendiz).toMatchObject({ personaId: 'a-1', grupoId: 'g-1', mentorNombre: 'E2E Mentor', rotuloDeVolver: 'Cupo 1314' });

    await volverDe(r, 'ficha del aprendiz');
    expect(todoElTexto(r)).toContain('PANTALLA el grupo');
    await volverDe(r, 'el grupo');
    expect(todoElTexto(r)).toContain('PANTALLA ficha del mentor');
    await volverDe(r, 'ficha del mentor');
    expect(todoElTexto(r)).toContain('PANTALLA Mis mentores');
    expect(alSalir).not.toHaveBeenCalled();
    await volverDe(r, 'Mis mentores');
    expect(alSalir).toHaveBeenCalledTimes(1);
  });

  it('«Asignar» de Por resolver abre Grupos ya filtrado en «Sin mentor»', async () => { // spec 056 FR-002
    const r = await montar(pantalla());
    await tocar(r, 'Asignar');
    expect(todoElTexto(r)).toContain('PANTALLA Grupos');
    expect((mockPropsDe.grupos as { filtroInicial?: string }).filtroInicial).toBe('sinMentor');
  });

  it('desde un grupo de la lista se llega a su ficha de aprendiz con la flecha «Grupos»…', async () => { // spec 056 FR-007
    const r = await montar(pantalla());
    await tocar(r, 'Grupos');
    await tocar(r, 'Abrir grupo de la lista');
    expect(mockPropsDe.grupo).toMatchObject({ grupoId: 'g-2', nombre: 'Fénix', mentorNombre: 'Ana' });
    await tocar(r, 'Abrir aprendiz');
    expect((mockPropsDe.aprendiz as { rotuloDeVolver: string }).rotuloDeVolver).toBe('Fénix');
  });

  it('al crear un grupo el asistente se cambia por «Grupos» en «Activos» y el atrás ya no lo reabre', async () => { // spec 056 FR-008
    const r = await montar(pantalla());
    await tocar(r, 'Grupos');
    await tocar(r, 'Crear grupo');
    expect(todoElTexto(r)).toContain('PANTALLA Crear grupo');
    await tocar(r, 'Terminar');
    expect(todoElTexto(r)).toContain('PANTALLA Grupos');
    expect((mockPropsDe.grupos as { filtroInicial?: string }).filtroInicial).toBe('activos');
    await volverDe(r, 'Grupos');
    expect(todoElTexto(r)).toContain('PANTALLA Mis mentores');
  });

  it('el atrás del asistente sube un nivel: de «Crear grupo» vuelve a «Grupos»', async () => { // spec 056 FR-046
    const r = await montar(pantalla());
    await tocar(r, 'Grupos');
    await tocar(r, 'Crear grupo');
    await volverDe(r, 'Crear grupo');
    expect(todoElTexto(r)).toContain('PANTALLA Grupos');
  });

  it('Consultas y el reporte se abren desde Mis mentores y vuelven a él; las consultas del mentor vuelven a su ficha', async () => { // spec 056 FR-005
    const r = await montar(pantalla());
    await tocar(r, 'Consultas');
    expect(todoElTexto(r)).toContain('PANTALLA Consultas');
    await volverDe(r, 'Consultas');
    await tocar(r, 'Reporte');
    expect(todoElTexto(r)).toContain('PANTALLA Reporte');
    await volverDe(r, 'Reporte');
    await tocar(r, 'Abrir mentor');
    await tocar(r, 'Consultas del mentor');
    await volverDe(r, 'Consultas');
    expect(todoElTexto(r)).toContain('PANTALLA ficha del mentor');
  });

  it('«Todos los aprendices» y «Hábitos de todos» siguen siendo de Yo: se piden hacia arriba', async () => { // spec 056 FR-005
    const r = await montar(pantalla());
    await tocar(r, 'Todos');
    await tocar(r, 'Hábitos');
    expect(alAbrirTodos).toHaveBeenCalledTimes(1);
    expect(alAbrirHabitos).toHaveBeenCalledTimes(1);
  });

  it('el grupo se abre con lo que el resumen por grupos dice de él (su color y su promedio) y sin mentor conocido: la hoja lo lee del padrón', async () => { // spec 056 FR-011
    const resumen = { grupoId: 'g-1', colorDelPromedio: 'ROJO', promedio: 0 };
    const r = await montar(React.createElement(LiderMentoresScreen, { resumenPorGrupos: [resumen], onSalir: alSalir } as never));
    await tocar(r, 'Abrir mentor');
    await tocar(r, 'Abrir grupo');
    expect((mockPropsDe.grupo as { resumen: unknown; mentorId: unknown }).resumen).toBe(resumen);
    expect((mockPropsDe.grupo as { mentorId: unknown }).mentorId).toBeNull();
  });
});
