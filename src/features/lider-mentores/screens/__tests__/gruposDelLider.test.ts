import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import { hayTocable, montar, porTestID, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';
import type { GrupoDelResumen } from '../../../semaforo/types/semaforo.types';
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
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, logro: () => undefined, error: () => undefined } }));

let mockGrupos: () => Promise<GrupoDelLider[]>;
jest.mock('../../api/gruposDelLiderApi', () => ({ obtenerGruposDelLider: () => mockGrupos() }));
const mockHoja = jest.fn<(grupo: unknown) => void>();
let mockAlAsignar: () => void = () => undefined;
jest.mock('../../components/HojaElegirMentor', () => ({
  HojaElegirMentor: (p: { grupo: unknown; onAsignado: () => void }) => {
    mockHoja(p.grupo);
    mockAlAsignar = p.onAsignado;
    return null;
  },
}));

import { GruposDelLiderScreen } from '../GruposDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const grupo = (id: string, nombre: string, extra: Partial<GrupoDelLider> = {}): GrupoDelLider => ({
  id,
  nombre,
  cohorteId: 'c-1',
  formacion: 'ESCUELA',
  mentorId: 'm-1',
  mentorNombre: 'E2E Mentor',
  aprendices: 9,
  cupo: 10,
  esRecepcion: false,
  enCurso: true,
  cohorteActiva: true,
  ...extra,
});
const resumen = (grupoId: string): GrupoDelResumen =>
  ({ grupoId, grupoNombre: 'x', mentorNombre: null, sinMentor: false, resumen: { rojo: 5, amarillo: 0, verde: 0, sinDatos: 4, total: 9 }, promedio: 0, colorDelPromedio: 'ROJO', etiquetaDelPromedio: null, puedeAbrirse: true }) as unknown as GrupoDelResumen;

const alVolver = jest.fn();
const alAbrirGrupo = jest.fn<(g: GrupoDelLider) => void>();
const alCrear = jest.fn();
const pantalla = (extra: object = {}) =>
  React.createElement(GruposDelLiderScreen, { resumenes: [resumen('g-1')], onVolver: alVolver, onAbrirGrupo: alAbrirGrupo, onCrear: alCrear, ...extra } as never);

const TRES_SIN_MENTOR = [
  grupo('s-1', 'Otro sin mentor', { mentorId: null, mentorNombre: null, aprendices: 0 }),
  grupo('s-2', 'Suyo sin mentor', { mentorId: null, mentorNombre: null, aprendices: 0 }),
  grupo('s-3', 'Tercero sin mentor', { mentorId: null, mentorNombre: null, aprendices: 0 }),
  grupo('g-1', 'Cupo 1314'),
  grupo('g-2', 'Grupo Fénix', { aprendices: 1 }),
  grupo('g-3', 'Grupo lleno', { aprendices: 10 }),
  grupo('b-1', 'Bienvenida', { esRecepcion: true, cupo: null, mentorId: null, mentorNombre: null }),
  grupo('c-1', 'Cerrado', { enCurso: false, mentorId: null, mentorNombre: null }),
];

beforeEach(() => {
  mockGrupos = () => Promise.resolve(TRES_SIN_MENTOR);
  mockHoja.mockReset();
});

describe('Grupos: la lista y sus filtros', () => {
  it('abre en «Sin mentor» si hay alguno, con la cantidad de cada filtro', async () => { // spec 056 FR-006
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Sin mentor · 3');
    expect(texto).toContain('Activos · 3');
    expect(texto).toContain('Llenos · 1');
    expect(texto).toContain('Otro sin mentor');
    expect(texto).not.toContain('Cupo 1314');
  });

  it('«Sin mentor» no cuenta la bienvenida ni los grupos cerrados: cuenta igual que «Por resolver»', async () => { // spec 056 FR-006
    const r = await montar(pantalla());
    expect(todoElTexto(r)).not.toContain('Bienvenida');
    expect(todoElTexto(r)).not.toContain('Cerrado');
  });

  it('si no hay grupos sin mentor abre en «Activos»', async () => { // spec 056 FR-006
    mockGrupos = () => Promise.resolve([grupo('g-1', 'Cupo 1314'), grupo('g-2', 'Grupo Fénix')]);
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Cupo 1314');
    expect(todoElTexto(r)).toContain('Grupo Fénix');
  });

  it('puede abrir ya filtrado (desde «Por resolver» llega en «Sin mentor»)', async () => { // spec 056 FR-002
    mockGrupos = () => Promise.resolve([grupo('g-1', 'Cupo 1314'), grupo('s-1', 'Sin dueño', { mentorId: null, mentorNombre: null })]);
    const r = await montar(pantalla({ filtroInicial: 'activos' }));
    expect(todoElTexto(r)).toContain('Cupo 1314');
    expect(todoElTexto(r)).not.toContain('Sin dueño');
  });

  it('«Llenos» muestra solo los que alcanzaron su tope y cada uno dice «n/máx»', async () => { // spec 056 FR-006
    const r = await montar(pantalla({ filtroInicial: 'llenos' }));
    const texto = todoElTexto(r);
    expect(texto).toContain('Grupo lleno');
    expect(texto).toContain('10/10');
    expect(texto).not.toContain('Cupo 1314');
  });

  it('un filtro sin grupos lo dice en una línea', async () => { // spec 056 FR-006
    mockGrupos = () => Promise.resolve([grupo('g-1', 'Cupo 1314')]);
    const r = await montar(pantalla({ filtroInicial: 'sinMentor' }));
    expect(todoElTexto(r)).toContain('Ningún grupo sin mentor.');
  });
});

describe('Grupos: cada fila', () => {
  it('con mentor lleva el anillo de su cupo, su nombre y sus aprendices por color; tocarla abre el grupo', async () => { // spec 056 FR-007
    const r = await montar(pantalla({ filtroInicial: 'activos' }));
    expect(todoElTexto(r)).toContain('9/10');
    expect(porTestID(r, 'anillo-de-cupo').length).toBeGreaterThan(0);
    expect(porTestID(r, 'forma-cuadrado').length).toBeGreaterThan(0);
    await tocar(r, 'Abrir el grupo Cupo 1314');
    expect(alAbrirGrupo).toHaveBeenCalledWith(expect.objectContaining({ id: 'g-1' }));
  });

  it('sin mentor lleva el botón «Asignar», que abre la hoja de elegir mentor con ese grupo, y no abre el grupo', async () => { // spec 056 FR-007
    const r = await montar(pantalla());
    expect(hayTocable(r, 'Abrir el grupo Otro sin mentor')).toBe(false);
    await tocar(r, 'Asignar mentor a Otro sin mentor');
    expect(mockHoja).toHaveBeenLastCalledWith({ id: 's-1', nombre: 'Otro sin mentor', mentorId: null });
  });

  it('al asignar, el grupo sale de «Sin mentor» y pasa a «Activos» con su mentor', async () => { // spec 056 FR-009
    let leidas = 0;
    mockGrupos = () => {
      leidas += 1;
      return Promise.resolve(leidas === 1 ? [grupo('s-1', 'Otro sin mentor', { mentorId: null, mentorNombre: null }), grupo('g-1', 'Cupo 1314')] : [grupo('s-1', 'Otro sin mentor', { mentorNombre: 'Ana' }), grupo('g-1', 'Cupo 1314')]);
    };
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Otro sin mentor');
    await tocar(r, 'Asignar mentor a Otro sin mentor');
    await act(async () => mockAlAsignar());
    expect(leidas).toBe(2);
    expect(todoElTexto(r)).toContain('Activos · 2');
    expect(todoElTexto(r)).toContain('Otro sin mentor');
  });

  it('«Crear grupo» abre el asistente', async () => { // spec 056 FR-008
    const r = await montar(pantalla());
    await tocar(r, 'Crear grupo');
    expect(alCrear).toHaveBeenCalledTimes(1);
  });
});

describe('Grupos: cuando no carga', () => {
  it('con un rechazo del servidor (otra formación) dice el motivo que mandó', async () => { // spec 056 FR-042
    mockGrupos = () => Promise.reject(new ApiError(403, 'Ese grupo no es de tus formaciones.', { codigo: 'FUERA_DE_SU_ALCANCE' }));
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Ese grupo no es de tus formaciones.');
    expect(hayTocable(r, 'Asignar')).toBe(false);
  });

  it('mientras carga lo dice y no deja un hueco', async () => { // spec 056 FR-006
    mockGrupos = () => new Promise(() => undefined);
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Cargando los grupos');
  });
});
