import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { LecturaDeGrupos } from '../../semaforo/hooks/useLecturaPorSemana';
import type { GrupoDelResumen, ResumenPorGrupos } from '../../semaforo/types/semaforo.types';

/**
 * «Mis mentores» del líder (spec 018; desde el 2026-10-31 es un panel de Yo, no de Hoy). Se prueba lo que ve y toca el líder, con
 * los datos del servidor doblados: qué filas salen, qué dicen, a dónde llevan y qué NO dicen (sin textos de ayuda). El control
 * «Mi programa · Mi grupo · Mis mentores» y la lista «Mi grupo» de Hoy se quitaron: Hoy es solo el programa propio.
 */

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined } }));

/* La bandeja de tickets: la cifra de «Consultas de mentores» sale de su primera página. */
const mockBandeja = jest.fn<() => { cargando: boolean; fallo: string | null; hayMas: boolean; resumen: { sinResponder: number } }>();
jest.mock('../../tickets/hooks/useBandejaDeTickets', () => ({ useBandejaDeTickets: () => mockBandeja() }));

import { ListaDeMisMentores } from '../components/ListaDeMisMentores';

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
  mockBandeja.mockReset();
  mockBandeja.mockReturnValue({ cargando: false, fallo: null, hayMas: false, resumen: { sinResponder: 2 } });
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

function mentores(l: LecturaDeGrupos, extra: Partial<React.ComponentProps<typeof ListaDeMisMentores>> = {}) {
  return React.createElement(ListaDeMisMentores, {
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
