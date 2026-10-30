import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { LecturaDeGrupos } from '../../semaforo/hooks/useLecturaPorSemana';
import type { GrupoDelResumen, ResumenPorGrupos, SemaforoDelGrupo } from '../../semaforo/types/semaforo.types';
import type { AlumnoConEstado } from '../../mentor/types/mentor.types';

/**
 * Hoy por papel (spec 018): el control de arriba, «Mi grupo» y «Mis mentores». Se prueba lo que ve y toca el líder, con
 * los datos del servidor doblados: qué filas salen, qué dicen, a dónde llevan y qué NO dicen (sin textos de ayuda).
 */

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined } }));

/* La bandeja de tickets: la cifra de «Consultas de mentores» sale de su primera página. */
const mockBandeja = jest.fn<() => { cargando: boolean; fallo: string | null; hayMas: boolean; resumen: { sinResponder: number } }>();
jest.mock('../../tickets/hooks/useBandejaDeTickets', () => ({ useBandejaDeTickets: () => mockBandeja() }));

/* El semáforo del grupo del mentor que lee «Mi grupo». */
const mockSemaforoDelGrupo = jest.fn<() => { datos: SemaforoDelGrupo | null; fallo: string | null }>();
jest.mock('../../semaforo/hooks/useLecturaPorSemana', () => ({
  useSemaforoDelGrupo: () => mockSemaforoDelGrupo(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ControlDePapelDeHoy } from '../components/ControlDePapelDeHoy';
import { MiGrupoEnHoy } from '../components/MiGrupoEnHoy';
import { MisMentoresEnHoy } from '../components/MisMentoresEnHoy';
import { usePapelDeHoy } from '../hooks/usePapelDeHoy';
import type { PapelDeHoy } from '../utils/papelesDeHoy';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ------------------------------------------------------------------------------------------
// Ayudas
// ------------------------------------------------------------------------------------------

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

/** Un `Presionable` y el `Pressable` de adentro son un solo botón, no dos: solo el más externo. */
function botonesTocables(r: ReactTestRenderer) {
  const todos = r.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string');
  return todos.filter(n => !todos.includes((n as unknown as { parent: never }).parent));
}

function botones(r: ReactTestRenderer): string[] {
  return botonesTocables(r).map(n => n.props.accessibilityLabel as string);
}

async function tocar(r: ReactTestRenderer, parte: string): Promise<void> {
  const nodo = botonesTocables(r).find(n => (n.props.accessibilityLabel as string).includes(parte));
  if (!nodo) throw new Error(`No hay nada tocable que diga «${parte}». Hay: ${botones(r).join(' | ')}`);
  await act(async () => {
    nodo.props.onPress();
  });
}

async function montar(elemento: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(elemento);
  });
  return r;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockBandeja.mockReset();
  mockBandeja.mockReturnValue({ cargando: false, fallo: null, hayMas: false, resumen: { sinResponder: 2 } });
  mockSemaforoDelGrupo.mockReset();
  mockSemaforoDelGrupo.mockReturnValue({ datos: null, fallo: null });
});

// ------------------------------------------------------------------------------------------
// El control
// ------------------------------------------------------------------------------------------

describe('el control de papel', () => {
  it('ofrece solo los papeles que le tocan, con sus rótulos, y tocar uno lo elige', async () => {
    const onCambiar = jest.fn();
    const r = await montar(
      React.createElement(ControlDePapelDeHoy, { papeles: ['programa', 'mentores'], valor: 'programa', onCambiar }),
    );
    expect(botones(r)).toEqual(['Mi programa', 'Mis mentores']);
    await tocar(r, 'Mis mentores');
    expect(onCambiar).toHaveBeenCalledWith('mentores');
  });

  it('con las tres opciones salen en el orden programa, grupo, mentores', async () => {
    const r = await montar(
      React.createElement(ControlDePapelDeHoy, { papeles: ['mentores', 'grupo', 'programa'], valor: 'grupo', onCambiar: jest.fn() }),
    );
    expect(botones(r)).toEqual(['Mi programa', 'Mi grupo', 'Mis mentores']);
  });
});

// ------------------------------------------------------------------------------------------
// Recordar la última opción
// ------------------------------------------------------------------------------------------

describe('recordar la última opción por cuenta', () => {
  const TRES: PapelDeHoy[] = ['programa', 'grupo', 'mentores'];

  function Sonda({ userId, papeles, salida }: { userId: string; papeles: PapelDeHoy[]; salida: { actual?: ReturnType<typeof usePapelDeHoy> } }) {
    salida.actual = usePapelDeHoy(userId, papeles);
    return null;
  }

  async function sonda(userId: string, papeles: PapelDeHoy[] = TRES) {
    const salida: { actual?: ReturnType<typeof usePapelDeHoy> } = {};
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(React.createElement(Sonda, { userId, papeles, salida }));
    });
    return { salida, r };
  }

  it('sin nada guardado abre en «Mi programa»', async () => {
    const { salida } = await sonda('u1');
    expect(salida.actual?.papel).toBe('programa');
  });

  it('elegir cambia al instante y la próxima vez abre ahí', async () => {
    const primera = await sonda('u1');
    await act(async () => {
      primera.salida.actual?.elegir('mentores');
    });
    expect(primera.salida.actual?.papel).toBe('mentores');
    await act(async () => primera.r.unmount());

    const otraVez = await sonda('u1');
    expect(otraVez.salida.actual?.papel).toBe('mentores');
  });

  it('es por cuenta: la elección de una cuenta no se ve en la otra', async () => {
    const a = await sonda('u1');
    await act(async () => {
      a.salida.actual?.elegir('grupo');
    });
    const b = await sonda('u2');
    expect(b.salida.actual?.papel).toBe('programa');
  });

  it('si ya no tiene ese papel (dejó de acompañar un grupo) abre en «Mi programa»', async () => {
    const a = await sonda('u1');
    await act(async () => {
      a.salida.actual?.elegir('grupo');
    });
    const sinGrupo = await sonda('u1', ['programa', 'mentores']);
    expect(sinGrupo.salida.actual?.papel).toBe('programa');
  });

  it('`recordado` es lo último que eligió aunque hoy no se ofrezca: Hoy puede esperar a que «Mi grupo» vuelva', async () => {
    await AsyncStorage.setItem('renaser.hoy.papel.u1', 'grupo');
    const { salida } = await sonda('u1', ['programa', 'mentores']);
    expect(salida.actual?.papel).toBe('programa');
    expect(salida.actual?.recordado).toBe('grupo');
  });

  it('sin control no lee ni guarda nada y no devuelve papel: Hoy es el de siempre', async () => {
    const leer = AsyncStorage.getItem as unknown as jest.Mock;
    leer.mockClear();
    const { salida } = await sonda('u1', []);
    expect(salida.actual?.papel).toBeNull();
    expect(leer).not.toHaveBeenCalled();
  });

  it('mientras lee lo guardado no dibuja un papel y salta a otro: es nulo y recién después trae el suyo', async () => {
    await AsyncStorage.setItem('renaser.hoy.papel.u1', 'mentores');
    const salida: { actual?: ReturnType<typeof usePapelDeHoy> } = {};
    const vistos: Array<PapelDeHoy | null> = [];
    function Registrar() {
      salida.actual = usePapelDeHoy('u1', TRES);
      vistos.push(salida.actual.papel);
      return null;
    }
    await act(async () => {
      TestRenderer.create(React.createElement(Registrar));
    });
    expect(vistos[0]).toBeNull();
    expect(vistos).not.toContain('programa');
    expect(vistos[vistos.length - 1]).toBe('mentores');
  });
});

// ------------------------------------------------------------------------------------------
// «Mis mentores»
// ------------------------------------------------------------------------------------------

function grupo(id: string, nombre: string, mentor: string | null, promedio: number | null, puedeAbrirse: boolean): GrupoDelResumen {
  return {
    grupoId: id,
    grupoNombre: nombre,
    mentorNombre: mentor,
    sinMentor: mentor === null,
    resumen: { verde: 1, amarillo: 0, rojo: 1, sinDatos: 0, total: 2 },
    promedio,
    colorDelPromedio: promedio === null ? 'SIN_DATOS' : promedio >= 80 ? 'VERDE' : promedio >= 60 ? 'AMARILLO' : 'ROJO',
    etiquetaDelPromedio: promedio === null ? null : promedio >= 80 ? 'Al día' : promedio >= 60 ? 'Requiere atención' : 'Con problemas',
    puedeAbrirse,
  };
}

function lectura(grupos: GrupoDelResumen[], cambios: Partial<LecturaDeGrupos> = {}): LecturaDeGrupos {
  const datos: ResumenPorGrupos = { desde: '2026-10-12', hasta: '2026-10-18', cerrada: false, totales: null, grupos };
  return {
    datos,
    posicion: { modo: 'vigente' },
    rango: { desde: '2026-10-12', hasta: '2026-10-18' },
    cerrada: false,
    cargando: false,
    fallo: null,
    detalleDelFallo: null,
    puedeAnterior: true,
    puedeSiguiente: false,
    anterior: () => undefined,
    siguiente: () => undefined,
    volverAVigente: jest.fn(),
    recargar: jest.fn(),
    inicio: { posicion: { modo: 'vigente' }, hastaVigente: '2026-10-18' },
    ...cambios,
  };
}

function mentores(l: LecturaDeGrupos, extra: Partial<React.ComponentProps<typeof MisMentoresEnHoy>> = {}) {
  return React.createElement(MisMentoresEnHoy, {
    lectura: l,
    verGrupos: true,
    verConsultas: true,
    verMentores: true,
    onAbrirGrupo: jest.fn(),
    onAbrirConsultas: jest.fn(),
    onAbrirMentores: jest.fn(),
    ...extra,
  });
}

describe('«Mis mentores»', () => {
  const GRUPOS = [
    grupo('g1', 'Grupo Octubre', 'Carla Ríos', 41.5, true),
    grupo('g2', 'Grupo Noviembre', 'Diego Paredes', 78, true),
    grupo('g3', 'Grupo Enero', null, null, false),
  ];

  it('una fila por grupo con su nombre, su mentor y su porcentaje de los últimos 7 días', async () => {
    const r = await montar(mentores(lectura(GRUPOS)));
    const t = textos(r);
    expect(t).toContain('Resultado por grupo');
    expect(t).toContain('Últimos 7 días');
    for (const esperado of ['Grupo Octubre', 'Carla Ríos', '41.5', 'Grupo Noviembre', 'Diego Paredes', '78']) {
      expect(t).toContain(esperado);
    }
  });

  it('el color no va solo: el lector de pantalla oye su palabra y su número', async () => {
    const r = await montar(mentores(lectura(GRUPOS)));
    expect(botones(r).some(b => b.startsWith('Grupo Octubre. Mentor: Carla Ríos. Con problemas, 41.5'))).toBe(true);
  });

  it('un grupo sin mentor lo dice y no se abre; sin número dice «—», nunca un 0 %', async () => {
    const r = await montar(mentores(lectura(GRUPOS)));
    const t = textos(r);
    expect(t).toContain('Sin mentor asignado');
    expect(t).toContain('—');
    expect(t).not.toContain('0 %');
    expect(botones(r).some(b => b.includes('Grupo Enero'))).toBe(false);
  });

  it('tocar un grupo lo abre en los mismos 7 días que mostraba la fila', async () => {
    const onAbrirGrupo = jest.fn();
    const l = lectura(GRUPOS);
    const r = await montar(mentores(l, { onAbrirGrupo }));
    await tocar(r, 'Grupo Noviembre');
    expect(onAbrirGrupo).toHaveBeenCalledTimes(1);
    expect(onAbrirGrupo.mock.calls[0][0]).toMatchObject({ grupoId: 'g2' });
    expect(onAbrirGrupo.mock.calls[0][1]).toBe(l.inicio);
  });

  it('«Consultas de mentores» dice cuántas hay sin responder y abre la bandeja', async () => {
    const onAbrirConsultas = jest.fn();
    const r = await montar(mentores(lectura(GRUPOS), { onAbrirConsultas }));
    expect(textos(r)).toContain('Consultas de mentores');
    expect(textos(r)).toContain('2 sin responder');
    await tocar(r, 'Consultas de mentores');
    expect(onAbrirConsultas).toHaveBeenCalledTimes(1);
  });

  it('la cifra de consultas es honesta: «al menos» si hay más páginas, y sin cifra si no cargó', async () => {
    mockBandeja.mockReturnValue({ cargando: false, fallo: null, hayMas: true, resumen: { sinResponder: 3 } });
    expect(textos(await montar(mentores(lectura(GRUPOS))))).toContain('3+ sin responder');

    mockBandeja.mockReturnValue({ cargando: false, fallo: null, hayMas: true, resumen: { sinResponder: 0 } });
    expect(textos(await montar(mentores(lectura(GRUPOS))))).not.toContain('sin responder');

    mockBandeja.mockReturnValue({ cargando: false, fallo: 'sin_red', hayMas: false, resumen: { sinResponder: 0 } });
    const sinLectura = await montar(mentores(lectura(GRUPOS)));
    expect(textos(sinLectura)).toContain('Consultas de mentores');
    expect(textos(sinLectura)).not.toContain('sin responder');

    mockBandeja.mockReturnValue({ cargando: false, fallo: null, hayMas: false, resumen: { sinResponder: 0 } });
    expect(textos(await montar(mentores(lectura(GRUPOS))))).toContain('Nada sin responder');
  });

  it('el padrón de mentores y el reporte del mes siguen a un toque', async () => {
    const onAbrirMentores = jest.fn();
    const r = await montar(mentores(lectura(GRUPOS), { onAbrirMentores }));
    await tocar(r, 'Mentores y reporte del mes');
    expect(onAbrirMentores).toHaveBeenCalledTimes(1);
  });

  it('sin textos de ayuda: ningún renglón que explique lo que la fila ya dice', async () => {
    const t = textos(await montar(mentores(lectura(GRUPOS))));
    for (const ayuda of ['Toca un grupo', 'Solo cantidades', 'Cómo va cada uno', 'Los bloqueos abiertos', 'Cuántos aprendices']) {
      expect(t).not.toContain(ayuda);
    }
  });

  it('al abrirse vuelve a los últimos 7 días (relee), para que el rótulo no mienta', async () => {
    const l = lectura(GRUPOS);
    await montar(mentores(l));
    expect(l.volverAVigente).toHaveBeenCalledTimes(1);
  });

  it('cada lista es independiente: sin el resultado por grupo (interruptor o 404), las consultas y el padrón siguen', async () => {
    const r = await montar(mentores(lectura(GRUPOS), { verGrupos: false }));
    expect(textos(r)).not.toContain('Resultado por grupo');
    expect(textos(r)).toContain('Consultas de mentores');

    const l = lectura([], { datos: null, fallo: 'no_disponible' });
    const sinVista = await montar(mentores(l));
    expect(textos(sinVista)).not.toContain('Resultado por grupo');
    expect(textos(sinVista)).toContain('Mentores y reporte del mes');
  });

  it('con la lectura caída lo dice con «Reintentar»; mientras llega, que carga', async () => {
    const caida = await montar(mentores(lectura([], { datos: null, fallo: 'sin_red' })));
    expect(textos(caida)).toContain('Reintentar');
    const cargando = await montar(mentores(lectura([], { datos: null, cargando: true })));
    expect(textos(cargando)).toContain('Cargando los grupos…');
  });

  it('un grupo vacío dice «No hay grupos que mostrar»', async () => {
    expect(textos(await montar(mentores(lectura([]))))).toContain('No hay grupos que mostrar.');
  });
});

// ------------------------------------------------------------------------------------------
// «Mi grupo»
// ------------------------------------------------------------------------------------------

function alumno(id: string, nombre: string): AlumnoConEstado {
  return {
    participanteId: id,
    nombre,
    diaPrograma: 20,
    ultimaActividadEn: null,
    habitosProgramados: 7,
    habitosCumplidos: 3,
    evidenciasPendientes: 0,
    motivos: [],
    requiereSeguimiento: false,
    evaluable: true,
    cumplimiento: 0.4,
  };
}

const ANA = alumno('u1', 'Ana Torres');
const BRUNO = alumno('u2', 'Bruno Meza');

const VISTA = {
  celula: { id: 'g1', nombre: 'Grupo Octubre' },
  grupos: [{ id: 'g1' }],
  todos: [ANA, BRUNO],
} as unknown as React.ComponentProps<typeof MiGrupoEnHoy>['vista'];

function delSemaforo(): SemaforoDelGrupo {
  return {
    grupoId: 'g1',
    grupoNombre: 'Grupo Octubre',
    desde: '2026-10-12',
    hasta: '2026-10-18',
    cerrada: false,
    resumen: null,
    aprendices: [
      { aprendizId: 'u1', nombre: 'Ana Torres', avatarUrl: null, porcentaje: 38, color: 'ROJO', etiqueta: 'Con problemas', diasConDatos: 6, dias: [] },
      { aprendizId: 'u2', nombre: 'Bruno Meza', avatarUrl: null, porcentaje: null, color: 'SIN_DATOS', etiqueta: null, diasConDatos: null, dias: [] },
    ],
  };
}

function miGrupo(extra: Partial<React.ComponentProps<typeof MiGrupoEnHoy>> = {}) {
  return React.createElement(MiGrupoEnHoy, {
    vista: VISTA,
    cargando: false,
    fallo: null,
    onReintentar: jest.fn(),
    onAbrirGrupo: jest.fn(),
    onAbrirAlumno: jest.fn(),
    ...extra,
  });
}

describe('«Mi grupo»', () => {
  it('lista a los aprendices con su nombre, su color y su porcentaje, en el orden del servidor', async () => {
    mockSemaforoDelGrupo.mockReturnValue({ datos: delSemaforo(), fallo: null });
    const r = await montar(miGrupo());
    const t = textos(r);
    expect(t).toContain('Grupo Octubre · 2 aprendices');
    expect(t.indexOf('Ana Torres')).toBeLessThan(t.indexOf('Bruno Meza'));
    expect(t).toContain('38');
    // Sin número no hay un 0 %: dice «—».
    expect(t).toContain('—');
    expect(botones(r).some(b => b.startsWith('Ana Torres. Con problemas, 38'))).toBe(true);
  });

  it('tocar a un aprendiz abre su ficha, la de siempre, con SU alumno', async () => {
    mockSemaforoDelGrupo.mockReturnValue({ datos: delSemaforo(), fallo: null });
    const onAbrirAlumno = jest.fn();
    const r = await montar(miGrupo({ onAbrirAlumno }));
    await tocar(r, 'Bruno Meza');
    expect(onAbrirAlumno).toHaveBeenCalledWith(BRUNO);
  });

  it('el rótulo de arriba abre el grupo entero', async () => {
    const onAbrirGrupo = jest.fn();
    const r = await montar(miGrupo({ onAbrirGrupo }));
    await tocar(r, 'Grupo Octubre · 2 aprendices');
    expect(onAbrirGrupo).toHaveBeenCalledTimes(1);
  });

  it('si el semáforo no está (404, 403, sin red) la lista sale igual, con los nombres y sin color', async () => {
    mockSemaforoDelGrupo.mockReturnValue({ datos: null, fallo: 'no_disponible' });
    const onAbrirAlumno = jest.fn();
    const r = await montar(miGrupo({ onAbrirAlumno }));
    expect(textos(r)).toContain('Ana Torres');
    expect(textos(r)).toContain('Bruno Meza');
    await tocar(r, 'Ana Torres');
    expect(onAbrirAlumno).toHaveBeenCalledWith(ANA);
  });

  it('sin aprendices dice que todavía no hay, y sin grupo cargando o caído lo dice', async () => {
    const vacia = { ...VISTA, todos: [] } as unknown as React.ComponentProps<typeof MiGrupoEnHoy>['vista'];
    expect(textos(await montar(miGrupo({ vista: vacia })))).toContain('Todavía no tienes aprendices asignados.');
    expect(textos(await montar(miGrupo({ vista: null, cargando: true })))).toContain('Cargando tu grupo…');
    const caido = await montar(miGrupo({ vista: null, fallo: 'sin_red' }));
    expect(textos(caido)).toContain('Reintentar');
  });
});
