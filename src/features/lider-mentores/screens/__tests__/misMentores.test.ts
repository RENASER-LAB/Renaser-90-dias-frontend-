import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { hayTocable, montar, porTestID, tocable, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';
import type { PadronApi, PorResolverApi } from '../../api/liderMentoresSchemas';

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

let mockPadron: () => Promise<PadronApi>;
let mockPorResolver: () => Promise<PorResolverApi>;
jest.mock('../../api/liderMentoresApi', () => ({ obtenerPadron: () => mockPadron(), obtenerPorResolver: () => mockPorResolver() }));

import { MisMentoresScreen } from '../MisMentoresScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mentor = (id: string, nombre: string, extra: Record<string, unknown> = {}) => ({
  userId: id,
  fullName: nombre,
  avatarUrl: null,
  groups: { source: 'OK', items: [{ id: `g-${id}`, name: 'Grupo', trainees: 9, semaforo: null }] },
  traineeCount: 9,
  semaforo: { source: 'OK', summary: null },
  attention: { source: 'OK', open: 0, oldestOpenDays: null, answered: 0, medianResponseHours: null },
  evaluation: { source: 'OK', month: '2026-11', percentage: null, delivered: null, expected: null, traineesEvaluated: null, state: null },
  cupo: { acompanados: 9, maximo: 10 },
  porColor: { rojo: 5, ambar: 0, verde: 0, sinDatos: 4 },
  ...extra,
});
const padron = (...mentors: unknown[]): PadronApi => ({ month: '2026-11', timezone: 'America/Lima', cutoffAt: '2026-11-18T14:00:00Z', semaforoFrom: null, semaforoTo: null, mentors }) as unknown as PadronApi;

const alVolver = jest.fn();
const alAbrirMentor = jest.fn<(id: string, nombre: string) => void>();
const alAbrirGrupos = jest.fn<(filtro?: string) => void>();
const alAbrirConsultas = jest.fn();
const alAbrirReporte = jest.fn();
const alAbrirTodos = jest.fn();
const pantalla = (extra: object = {}) =>
  React.createElement(MisMentoresScreen, {
    onVolver: alVolver,
    onAbrirMentor: alAbrirMentor,
    onAbrirGrupos: alAbrirGrupos,
    onAbrirConsultas: alAbrirConsultas,
    onAbrirReporte: alAbrirReporte,
    onAbrirTodos: alAbrirTodos,
    ...extra,
  } as never);

const TRES_PENDIENTES: PorResolverApi = {
  gruposSinMentor: 3,
  consultas: { cantidad: 3, diasDeLaMasVieja: 5 },
  peorMentor: { id: 'm-1', nombre: 'E2E Mentor', evaluacion: 0 },
};

beforeEach(() => {
  mockPadron = () => Promise.resolve(padron(mentor('m-1', 'E2E Mentor')));
  mockPorResolver = () => Promise.resolve(TRES_PENDIENTES);
});

describe('«Mis mentores»: la cabecera', () => {
  it('no lleva la insignia del rol: ni «LÍDER» ni «Líder de mentores» en ningún texto', async () => { // spec 056 FR-001
    const r = await montar(pantalla());
    expect(todoElTexto(r)).not.toMatch(/l[ií]der/i);
    expect(todoElTexto(r)).toContain('Mis mentores');
  });
});

describe('«Mis mentores»: Por resolver', () => {
  it('dice cada cosa en una fila corta con su símbolo y su botón: grupos sin mentor, consultas con los días de la más vieja y el mentor que peor va', async () => { // spec 056 FR-002
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Por resolver');
    expect(texto).toContain('3 grupos sin mentor');
    expect(texto).toContain('3 consultas · 5 días');
    expect(texto).toContain('E2E Mentor · 0 %');
    expect(hayTocable(r, 'Asignar')).toBe(true);
    expect(hayTocable(r, 'Recordar')).toBe(true);
    expect(hayTocable(r, 'Ver:')).toBe(true);
    /* El estado va con forma, no solo con color: × en cuadrado para lo urgente y ! en triángulo para las consultas. */
    expect(porTestID(r, 'forma-cuadrado').length).toBeGreaterThanOrEqual(2);
    expect(porTestID(r, 'forma-triangulo').length).toBeGreaterThanOrEqual(1);
  });

  it('«Asignar» abre Grupos filtrado en «Sin mentor»; «Recordar» abre Consultas; «Ver» abre la ficha del mentor', async () => { // spec 056 FR-002
    const r = await montar(pantalla());
    await tocar(r, 'Asignar');
    expect(alAbrirGrupos).toHaveBeenCalledWith('sinMentor');
    await tocar(r, 'Recordar');
    expect(alAbrirConsultas).toHaveBeenCalledTimes(1);
    await tocar(r, 'Ver:');
    expect(alAbrirMentor).toHaveBeenCalledWith('m-1', 'E2E Mentor');
  });

  it('una fila sin nada que resolver no se muestra (ni «0 grupos»), y con una sola cosa sale solo esa', async () => { // spec 056 FR-002
    mockPorResolver = () => Promise.resolve({ gruposSinMentor: 0, consultas: { cantidad: 1, diasDeLaMasVieja: 0 }, peorMentor: null });
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('1 consulta · hoy');
    expect(texto).not.toContain('grupos sin mentor');
    expect(hayTocable(r, 'Asignar')).toBe(false);
  });

  it('sin nada que resolver la sección no aparece y la lista de mentores sube', async () => { // spec 056 FR-002
    mockPorResolver = () => Promise.resolve({ gruposSinMentor: 0, consultas: { cantidad: 0, diasDeLaMasVieja: null }, peorMentor: null });
    const r = await montar(pantalla());
    expect(todoElTexto(r)).not.toContain('Por resolver');
    expect(todoElTexto(r)).toContain('E2E Mentor');
  });

  it('si la lectura de «Por resolver» falla, el padrón se ve igual y la sección no aparece', async () => { // spec 056 FR-002
    mockPorResolver = () => Promise.reject(new Error('404'));
    const r = await montar(pantalla());
    expect(todoElTexto(r)).not.toContain('Por resolver');
    expect(todoElTexto(r)).toContain('E2E Mentor');
  });

  it('una parte que el servidor mandó en null no se vuelve un cero: no hay fila', async () => { // spec 056 FR-002
    mockPorResolver = () => Promise.resolve({ gruposSinMentor: null, consultas: null, peorMentor: null });
    const r = await montar(pantalla());
    expect(todoElTexto(r)).not.toContain('Por resolver');
  });
});

describe('«Mis mentores»: la lista', () => {
  it('cada mentor lleva el anillo con «9/10», sus contadores con forma y la barra de colores', async () => { // spec 056 FR-003
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('9/10');
    expect(porTestID(r, 'anillo-de-cupo')[0].props.accessibilityRole).toBe('progressbar');
    for (const forma of ['forma-cuadrado', 'forma-triangulo', 'forma-circulo', 'forma-circulo-vacio']) expect(porTestID(r, forma).length).toBeGreaterThan(0);
    expect(porTestID(r, 'barra-de-colores')).toHaveLength(1);
    expect(porTestID(r, 'barra-rojo')[0].props.style).toMatchObject({ flex: 5 });
  });

  it('va ordenada por urgencia: quien tiene más aprendices en rojo, primero', async () => { // spec 056 FR-003
    mockPadron = () =>
      Promise.resolve(
        padron(
          mentor('m-a', 'Ana', { porColor: { rojo: 0, ambar: 2, verde: 3, sinDatos: 0 }, cupo: { acompanados: 5, maximo: 10 } }),
          mentor('m-b', 'Beto', { porColor: { rojo: 7, ambar: 0, verde: 0, sinDatos: 0 } }),
          mentor('m-c', 'Carla', { porColor: { rojo: 3, ambar: 0, verde: 0, sinDatos: 0 } }),
        ),
      );
    mockPorResolver = () => Promise.resolve({ gruposSinMentor: 0, consultas: null, peorMentor: null });
    const r = await montar(pantalla());
    const nombres = todoElTexto(r).match(/Beto|Carla|Ana/g);
    expect(nombres).toEqual(['Beto', 'Carla', 'Ana']);
  });

  it('un mentor sin grupo dice «Sin grupo» y no dibuja contadores', async () => { // spec 056 FR-004
    mockPadron = () => Promise.resolve(padron(mentor('m-2', 'Mentor Dos', { groups: { source: 'OK', items: [] }, cupo: { acompanados: 0, maximo: 0 }, porColor: { rojo: 0, ambar: 0, verde: 0, sinDatos: 0 } })));
    mockPorResolver = () => Promise.resolve({});
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Sin grupo');
    expect(porTestID(r, 'forma-cuadrado')).toHaveLength(0);
    expect(porTestID(r, 'barra-de-colores')).toHaveLength(0);
  });

  it('un mentor suspendido se ve apagado, sin anillo y sin abrir nada', async () => { // spec 056 FR-004
    mockPadron = () => Promise.resolve(padron(mentor('m-3', 'Mentor Suspendido', { accountActive: false })));
    mockPorResolver = () => Promise.resolve({});
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Cuenta suspendida');
    expect(porTestID(r, 'anillo-de-cupo')).toHaveLength(0);
    expect(tocable(r, 'Mentor Suspendido').props.disabled).toBe(true);
  });

  it('si el servidor no mandó el cupo ni los colores, no hay anillo ni barra ni ceros inventados', async () => { // spec 056 FR-003
    mockPadron = () => Promise.resolve(padron(mentor('m-4', 'Sin cifras', { cupo: null, porColor: null })));
    mockPorResolver = () => Promise.resolve({});
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Sin cifras');
    expect(porTestID(r, 'anillo-de-cupo')).toHaveLength(0);
    expect(porTestID(r, 'barra-de-colores')).toHaveLength(0);
    expect(todoElTexto(r)).not.toMatch(/0\/0|0\/10/);
  });

  it('el título de la lista dice cuántos cupos libres quedan entre todos', async () => { // spec 056 FR-003
    mockPorResolver = () => Promise.resolve({});
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('1 cupo libre');
  });

  it('tocar un mentor abre su ficha', async () => { // spec 056 FR-003
    const r = await montar(pantalla());
    await tocar(r, 'E2E Mentor. Cupo 9 de 10');
    expect(alAbrirMentor).toHaveBeenCalledWith('m-1', 'E2E Mentor');
  });

  it('sin mentores a cargo lo dice en una línea, sin huecos', async () => { // spec 056 FR-005
    mockPadron = () => Promise.resolve(padron());
    mockPorResolver = () => Promise.resolve({});
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Todavía no hay mentores activos.');
  });
});

describe('«Mis mentores»: los accesos del pie', () => {
  it('lleva Grupos, Consultas con su cantidad, Reporte del mes y Todos los aprendices, y cada uno abre lo suyo', async () => { // spec 056 FR-005
    const r = await montar(pantalla());
    for (const titulo of ['Grupos', 'Consultas · 3', 'Reporte del mes', 'Todos los aprendices']) expect(hayTocable(r, titulo)).toBe(true);
    await tocar(r, 'Todos los aprendices');
    await tocar(r, 'Reporte del mes');
    await tocar(r, 'Consultas · 3');
    expect(alAbrirTodos).toHaveBeenCalledTimes(1);
    expect(alAbrirReporte).toHaveBeenCalledTimes(1);
    expect(alAbrirConsultas).toHaveBeenCalledTimes(1);
    await tocar(r, 'Grupos');
    expect(alAbrirGrupos).toHaveBeenCalledWith();
  });

  it('sin la lista de todos los aprendices (el servidor no la ofrece) no dibuja esa fila', async () => { // spec 056 FR-005
    const r = await montar(pantalla({ onAbrirTodos: undefined }));
    expect(hayTocable(r, 'Todos los aprendices')).toBe(false);
  });
});

describe('«Mis mentores»: las entradas que Soporte TI apaga', () => {
  it('sin la entrada de grupos no ofrece «Grupos» ni «Asignar»; sin consultas, ni «Consultas» ni «Recordar»; sin mentores, ni el reporte ni la lista ni «Ver»', async () => { // spec 056 FR-005
    const r = await montar(pantalla({ entradas: { grupos: false, consultas: false, mentores: false } }));
    for (const quitado of ['Grupos', 'Consultas', 'Reporte del mes', 'Asignar', 'Recordar', 'Ver:']) expect(hayTocable(r, quitado)).toBe(false);
    expect(todoElTexto(r)).not.toContain('Por resolver');
    expect(todoElTexto(r)).not.toContain('E2E Mentor');
    expect(hayTocable(r, 'Todos los aprendices')).toBe(true);
  });

  it('con solo una entrada, esa sigue y las demás no', async () => { // spec 056 FR-005
    const r = await montar(pantalla({ entradas: { grupos: true, consultas: false, mentores: false } }));
    expect(hayTocable(r, 'Asignar')).toBe(true);
    expect(hayTocable(r, 'Recordar')).toBe(false);
    expect(hayTocable(r, 'Grupos')).toBe(true);
  });
});

describe('«Mis mentores»: cuando no carga', () => {
  it('dice por qué y deja reintentar, sin una lista vacía', async () => { // spec 056 FR-005
    mockPadron = () => Promise.reject(new Error('boom'));
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toMatch(/No pudimos cargar|No se pudo/);
    expect(todoElTexto(r)).not.toContain('Todavía no hay mentores activos.');
  });
});
