import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { FlatList, TextInput } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { PaginaDeAprendices } from '../../types/aprendicesDelLider.types';
import type { SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * «Todos los aprendices» del líder (2026-10-31, pedido del dueño: «el líder de mentores puede ver la ficha de todos los
 * aprendices sin necesidad de estar en grupo»): el buscador pide al servidor, la lista se lee de a 30, tocar a una persona
 * abre su ficha por `/leadership/people/{p}/…`, «Avisar a su mentor» se esconde sin mentor o sin grupo, y el atrás sube un
 * nivel (persona → lista → Hoy). Desde un grupo, la ficha sigue pidiendo las rutas de siempre.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../academy/components/LeccionVideoPlayer', () => ({ LeccionVideoPlayer: () => null }));
jest.mock('../../components/ReproductorDeAudio', () => ({ ReproductorDeAudio: () => null }));
jest.mock('../../../../components/ConfirmacionEnLinea', () => ({ ConfirmacionEnLinea: () => null }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: () => undefined, seleccion: () => undefined } }));
jest.mock('../../../admin/utils/dialogo', () => ({ avisar: jest.fn() }));
jest.mock('../../api/liderMentoresApi', () => ({ registrarObservacion: jest.fn() }));
jest.mock('../../utils/irAlChat', () => ({ escribirleA: jest.fn(), enviarPorChat: jest.fn() }));

/** Los retrocesos del sistema registrados por las pantallas montadas y habilitadas; el último atiende el gesto. */
const retrocesos: Array<{ actual: () => boolean | void }> = [];
jest.mock('../../../../hooks/useSystemBackHandler', () => {
  const { useEffect, useRef } = jest.requireActual<typeof import('react')>('react');
  return {
    useSystemBackHandler: (fn: () => boolean | void, habilitado: boolean = true) => {
      const ref = useRef(fn);
      ref.current = fn;
      useEffect(() => {
        if (!habilitado) return;
        const entrada = { actual: () => ref.current() };
        retrocesos.push(entrada);
        return () => {
          retrocesos.splice(retrocesos.indexOf(entrada), 1);
        };
      }, [habilitado]);
    },
  };
});

/* Las cuatro lecturas de la ficha: lo que importa es con qué grupo (o sin él) se piden. */
const mockSemana = jest.fn<(grupoId: string | null, personaId: string, semanaHasta?: string | null) => Promise<SemanaDePersona>>();
const mockRadar = jest.fn<(grupoId: string | null, personaId: string, cursor?: string | null) => Promise<unknown>>();
jest.mock('../../api/cumplimientoDelLiderApi', () => ({
  obtenerSemanaDePersona: (g: string | null, p: string, s?: string | null) => mockSemana(g, p, s),
  obtenerRadarDePersona: (g: string | null, p: string, c?: string | null) => mockRadar(g, p, c),
  obtenerTablaDelLider: jest.fn(),
}));
const mockHuecos = jest.fn<(grupoId: string | null, personaId: string, semana?: string | null) => Promise<unknown>>();
jest.mock('../../../huecos/api/huecosApi', () => ({
  obtenerHuecosDePersona: (g: string | null, p: string, s?: string | null) => mockHuecos(g, p, s),
}));
const mockCierres = jest.fn<(grupoId: string | null, personaId: string, semana?: string | null) => Promise<unknown>>();
jest.mock('../../../cierre/api/cierreApi', () => ({
  obtenerCierresDePersona: (g: string | null, p: string, s?: string | null) => mockCierres(g, p, s),
}));

/* Las tres secciones de la ficha entregan su `cargar`: se llama a mano para ver a qué ruta saldría. */
const cargas: { radar?: (c?: string | null) => Promise<unknown>; huecos?: (l?: string | null) => Promise<unknown>; cierres?: (l?: string | null) => Promise<unknown> } = {};
jest.mock('../../../mentor/components/CodigoRenaserDelAlumno', () => ({
  CodigoRenaserDelAlumno: (props: { cargar: (c?: string | null) => Promise<unknown> }) => ((cargas.radar = props.cargar), null),
}));
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => ({
  TiempoLibreDeLaSemana: (props: { cargar: (l?: string | null) => Promise<unknown> }) => ((cargas.huecos = props.cargar), null),
}));
jest.mock('../../../cierre/components/CierresDelDia', () => ({
  CierresDelDia: (props: { cargar: (l?: string | null) => Promise<unknown> }) => ((cargas.cierres = props.cargar), null),
}));

const mockLista = jest.fn<(opciones?: { q?: string; pagina?: number; tamano?: number }) => Promise<PaginaDeAprendices>>();
jest.mock('../../api/aprendicesDelLiderApi', () => ({
  TAMANO_DE_LA_PAGINA: 30,
  obtenerAprendicesDelLider: (o?: { q?: string; pagina?: number; tamano?: number }) => mockLista(o),
}));

import { AprendicesDelLiderScreen } from '../AprendicesDelLiderScreen';
import { PersonaDelLiderScreen } from '../PersonaDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ------------------------------------------------------------------------------------------
// Datos
// ------------------------------------------------------------------------------------------

const ANA = { personaId: 'u1', nombre: 'Ana Pérez', fotoPath: null, grupoId: 'g1', grupoNombre: 'Grupo Fénix', mentorNombre: 'Luisa', diaPrograma: 12 };
const BETO = { personaId: 'u2', nombre: 'Beto Ríos', fotoPath: null, grupoId: null, grupoNombre: null, mentorNombre: null, diaPrograma: 3 };

function pagina(items: PaginaDeAprendices['items'], extra: Partial<PaginaDeAprendices> = {}): PaginaDeAprendices {
  return { items, pagina: 0, tamano: 30, total: items.length, hayMas: false, ...extra };
}

function semana(cambios: Partial<SemanaDePersona> = {}): SemanaDePersona {
  return {
    grupoId: null,
    personaId: 'u2',
    nombre: 'Beto Ríos',
    avatarUrl: null,
    rol: 'TRAINEE',
    desde: '2026-10-24',
    hasta: '2026-10-30',
    zona: 'America/Lima',
    semanaEnCurso: true,
    cerrada: false,
    primeraSemana: '2026-10-17',
    mentor: null,
    resumen: null,
    color: 'AMARILLO',
    etiqueta: null,
    noSeMide: false,
    porcentaje: 60,
    dias: [],
    ...cambios,
  };
}

// ------------------------------------------------------------------------------------------
// Ayudas
// ------------------------------------------------------------------------------------------

async function montarLista(onSalir = jest.fn()): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(AprendicesDelLiderScreen, { onSalir }));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

/** El único componente de ese tipo en el árbol. */
function unico(r: ReactTestRenderer, tipo: React.ElementType) {
  const encontrados = r.root.findAll(n => (n.type as unknown) === tipo);
  if (encontrados.length !== 1) throw new Error(`Se esperaba uno solo y hay ${encontrados.length}`);
  return encontrados[0];
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

async function escribirEnElBuscador(r: ReactTestRenderer, texto: string): Promise<void> {
  await act(async () => {
    unico(r, TextInput).props.onChangeText(texto);
  });
}

async function pasarMs(ms: number): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function atras(): Promise<void> {
  await act(async () => {
    retrocesos[retrocesos.length - 1].actual();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockLista.mockReset().mockResolvedValue(pagina([ANA, BETO]));
  mockSemana.mockReset().mockResolvedValue(semana());
  mockRadar.mockReset().mockResolvedValue({});
  mockHuecos.mockReset().mockResolvedValue({});
  mockCierres.mockReset().mockResolvedValue({});
  retrocesos.length = 0;
  cargas.radar = cargas.huecos = cargas.cierres = undefined;
});

// ------------------------------------------------------------------------------------------

describe('la lista de todos los aprendices', () => {
  it('lee la primera página al abrir y dibuja a cada uno con su grupo (o «Sin grupo») y su día', async () => {
    const r = await montarLista();
    expect(mockLista).toHaveBeenCalledTimes(1);
    expect(mockLista).toHaveBeenLastCalledWith({ q: '', pagina: 0 });
    const t = textos(r);
    expect(t).toContain('Ana Pérez');
    expect(t).toContain('Grupo Fénix · Día 12');
    expect(t).toContain('Beto Ríos');
    expect(t).toContain('Sin grupo · Día 3');
    expect(botones(r)).toEqual(
      expect.arrayContaining(['Ana Pérez. Grupo Fénix · Día 12. Ver su ficha.', 'Beto Ríos. Sin grupo · Día 3. Ver su ficha.']),
    );
  });

  it('el buscador pide al servidor 300 ms después de la última tecla, con el texto tal cual (sin tildes lo resuelve el servidor)', async () => {
    const r = await montarLista();
    mockLista.mockClear();
    await escribirEnElBuscador(r, 'jo');
    await pasarMs(200);
    await escribirEnElBuscador(r, 'José');
    await pasarMs(250);
    expect(mockLista).not.toHaveBeenCalled();
    mockLista.mockResolvedValue(pagina([]));
    await pasarMs(60);
    expect(mockLista).toHaveBeenCalledTimes(1);
    expect(mockLista).toHaveBeenLastCalledWith({ q: 'José', pagina: 0 });
    expect(textos(r)).toContain('Sin resultados para «José».');
  });

  it('borrar la búsqueda vuelve a la lista completa', async () => {
    const r = await montarLista();
    await escribirEnElBuscador(r, 'zzz');
    mockLista.mockResolvedValue(pagina([]));
    await pasarMs(310);
    await tocar(r, 'Borrar la búsqueda');
    mockLista.mockResolvedValue(pagina([ANA]));
    await pasarMs(310);
    expect(mockLista).toHaveBeenLastCalledWith({ q: '', pagina: 0 });
    expect(textos(r)).toContain('Ana Pérez');
  });

  it('una lista vacía sin búsqueda lo dice, y no es «sin resultados»', async () => {
    mockLista.mockResolvedValue(pagina([]));
    const r = await montarLista();
    expect(textos(r)).toContain('Todavía no hay aprendices.');
    expect(textos(r)).not.toContain('Sin resultados');
  });

  it('pide la página siguiente al acercarse al final, suma sin repetir a nadie y no pide más cuando ya no hay', async () => {
    mockLista.mockResolvedValueOnce(pagina([ANA], { total: 3, hayMas: true }));
    const r = await montarLista();
    mockLista.mockResolvedValueOnce(pagina([ANA, BETO], { pagina: 1, total: 3, hayMas: false }));
    await act(async () => {
      unico(r, FlatList).props.onEndReached();
    });
    expect(mockLista).toHaveBeenLastCalledWith({ q: '', pagina: 1 });
    expect(unico(r, FlatList).props.data.map((f: { personaId: string }) => f.personaId)).toEqual(['u1', 'u2']);
    mockLista.mockClear();
    await act(async () => {
      unico(r, FlatList).props.onEndReached();
    });
    expect(mockLista).not.toHaveBeenCalled();
  });

  it('si la página siguiente falla, las filas que ya estaban se quedan y se puede reintentar', async () => {
    mockLista.mockResolvedValueOnce(pagina([ANA], { total: 40, hayMas: true }));
    const r = await montarLista();
    mockLista.mockRejectedValueOnce(new Error('sin red'));
    await act(async () => {
      unico(r, FlatList).props.onEndReached();
    });
    expect(textos(r)).toContain('Ana Pérez');
    expect(botones(r).some(b => b.includes('No pudimos cargar más aprendices'))).toBe(true);
    mockLista.mockResolvedValueOnce(pagina([ANA, BETO], { pagina: 1, total: 40, hayMas: false }));
    await tocar(r, 'No pudimos cargar más aprendices');
    expect(unico(r, FlatList).props.data).toHaveLength(2);
  });

  it('un fallo de la primera página se dice con «Reintentar» y vuelve a pedir', async () => {
    mockLista.mockRejectedValueOnce(new Error('boom'));
    const r = await montarLista();
    expect(textos(r)).toContain('No pudimos cargar la lista de aprendices');
    expect(textos(r)).not.toContain('Ana Pérez');
    mockLista.mockResolvedValueOnce(pagina([ANA]));
    const reintentar = r.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(h => (h.type as unknown) === 'Text').some(h => React.Children.toArray(h.props.children).join('') === 'Reintentar'));
    expect(reintentar.length).toBeGreaterThan(0);
    await act(async () => {
      reintentar[0].props.onPress();
    });
    expect(textos(r)).toContain('Ana Pérez');
  });
});

describe('la ficha de una persona abierta desde la lista', () => {
  it('una persona SIN grupo carga su semana de /leadership/people/{p}/week (grupo en null) y dice «Sin grupo»', async () => {
    const r = await montarLista();
    await tocar(r, 'Beto Ríos');
    expect(mockSemana).toHaveBeenCalledWith(null, 'u2', null);
    expect(textos(r)).toContain('Sin grupo');
    expect(botones(r)).toContain('Escribirle a Beto Ríos');
  });

  it('una persona CON grupo también usa la ruta nueva para sus cuatro lecturas', async () => {
    mockSemana.mockResolvedValue(semana({ personaId: 'u1', nombre: 'Ana Pérez', mentor: { id: 'm1', nombre: 'Luisa' } }));
    const r = await montarLista();
    await tocar(r, 'Ana Pérez');
    expect(mockSemana).toHaveBeenCalledWith(null, 'u1', null);
    await cargas.radar?.('c1');
    await cargas.huecos?.('2026-10-26');
    await cargas.cierres?.('2026-10-26');
    expect(mockRadar).toHaveBeenLastCalledWith(null, 'u1', 'c1');
    expect(mockHuecos).toHaveBeenLastCalledWith(null, 'u1', '2026-10-26');
    expect(mockCierres).toHaveBeenLastCalledWith(null, 'u1', '2026-10-26');
    /* Con grupo, el rótulo es el de su grupo. */
    expect(textos(r)).toContain('Grupo Fénix · Mentor: Luisa');
  });

  it('«Avisar a su mentor» se esconde sin grupo aunque el servidor mande un mentor, y «Escribirle» está siempre', async () => {
    mockSemana.mockResolvedValue(semana({ mentor: { id: 'm1', nombre: 'Luisa' }, puedeAvisarAlMentor: true }));
    const r = await montarLista();
    await tocar(r, 'Beto Ríos');
    expect(botones(r).some(b => b.startsWith('Avisar a su mentor'))).toBe(false);
    expect(botones(r)).toContain('Escribirle a Beto Ríos');
  });

  it('«Avisar a su mentor» se esconde cuando la persona tiene grupo pero el grupo no tiene mentor', async () => {
    mockSemana.mockResolvedValue(semana({ personaId: 'u1', mentor: null, puedeAvisarAlMentor: true }));
    const r = await montarLista();
    await tocar(r, 'Ana Pérez');
    expect(botones(r).some(b => b.startsWith('Avisar a su mentor'))).toBe(false);
  });

  it('«Avisar a su mentor» aparece con grupo y mentor cuando el servidor lo permite, y también cuando no dice nada (la regla de hoy)', async () => {
    for (const puede of [true, null, undefined]) {
      mockSemana.mockResolvedValue(semana({ personaId: 'u1', mentor: { id: 'm1', nombre: 'Luisa' }, puedeAvisarAlMentor: puede }));
      const r = await montarLista();
      await tocar(r, 'Ana Pérez');
      expect(botones(r).some(b => b.startsWith('Avisar a su mentor'))).toBe(true);
      await act(async () => r.unmount());
      retrocesos.length = 0;
    }
  });

  it('si el servidor dice que no se puede avisar (`puedeAvisarAlMentor: false`), no se ofrece aunque haya mentor', async () => {
    mockSemana.mockResolvedValue(semana({ personaId: 'u1', mentor: { id: 'm1', nombre: 'Luisa' }, puedeAvisarAlMentor: false }));
    const r = await montarLista();
    await tocar(r, 'Ana Pérez');
    expect(botones(r).some(b => b.startsWith('Avisar a su mentor'))).toBe(false);
  });

  it('un 404 de la ficha dice que la persona ya no está disponible', async () => {
    const { ApiError } = jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient');
    mockSemana.mockRejectedValue(new ApiError(404, 'no'));
    const r = await montarLista();
    await tocar(r, 'Beto Ríos');
    expect(textos(r)).toContain('Esta persona ya no está disponible para ver.');
  });
});

describe('el atrás: persona → lista → Hoy', () => {
  it('desde la ficha vuelve a la lista con la búsqueda y lo leído, sin releer; desde la lista, a Hoy', async () => {
    const onSalir = jest.fn();
    const r = await montarLista(onSalir);
    await escribirEnElBuscador(r, 'be');
    mockLista.mockResolvedValue(pagina([BETO]));
    await pasarMs(310);
    mockLista.mockClear();

    await tocar(r, 'Beto Ríos');
    /* Con la ficha abierta, el retroceso es el de la ficha y no el de la lista. */
    expect(retrocesos).toHaveLength(1);
    await atras();
    /* Volvió a la lista: la búsqueda sigue escrita y no hubo ninguna lectura nueva. */
    expect(unico(r, TextInput).props.value).toBe('be');
    expect(mockLista).not.toHaveBeenCalled();
    expect(onSalir).not.toHaveBeenCalled();
    expect(r.root.findAll(n => (n.type as unknown) === PersonaDelLiderScreen)).toHaveLength(0);

    await atras();
    expect(onSalir).toHaveBeenCalledTimes(1);
  });

  it('la flecha «Volver» de la ficha también vuelve a la lista, y la de la lista a Hoy', async () => {
    const onSalir = jest.fn();
    const r = await montarLista(onSalir);
    await tocar(r, 'Beto Ríos');
    const volver = botonesTocables(r).filter(n => n.props.accessibilityLabel === 'Volver');
    /* La de la lista (oculta) y la de la ficha: la última es la de la ficha. */
    await act(async () => {
      volver[volver.length - 1].props.onPress();
    });
    expect(r.root.findAll(n => (n.type as unknown) === PersonaDelLiderScreen)).toHaveLength(0);
    expect(onSalir).not.toHaveBeenCalled();
    await tocar(r, 'Volver');
    expect(onSalir).toHaveBeenCalledTimes(1);
  });
});

describe('desde un grupo (o Administración) la ficha sigue pidiendo las rutas de siempre', () => {
  async function montarDesdeElGrupo(): Promise<ReactTestRenderer> {
    mockSemana.mockResolvedValue(semana({ grupoId: 'g1', personaId: 'u1', mentor: { id: 'm1', nombre: 'Luisa' } }));
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(
        React.createElement(PersonaDelLiderScreen, {
          grupoId: 'g1',
          grupoNombre: 'Fénix',
          personaId: 'u1',
          nombre: 'Ana Pérez',
          avatarUrl: null,
          onVolver: () => undefined,
        }),
      );
    });
    return r;
  }

  it('la semana, el Radar, el tiempo libre y los cierres salen con el grupo', async () => {
    await montarDesdeElGrupo();
    expect(mockSemana).toHaveBeenCalledWith('g1', 'u1', null);
    await cargas.radar?.('c1');
    await cargas.huecos?.('2026-10-26');
    await cargas.cierres?.('2026-10-26');
    expect(mockRadar).toHaveBeenLastCalledWith('g1', 'u1', 'c1');
    expect(mockHuecos).toHaveBeenLastCalledWith('g1', 'u1', '2026-10-26');
    expect(mockCierres).toHaveBeenLastCalledWith('g1', 'u1', '2026-10-26');
  });

  it('«Avisar a su mentor» sigue como siempre', async () => {
    const r = await montarDesdeElGrupo();
    expect(botones(r).some(b => b.startsWith('Avisar a su mentor'))).toBe(true);
  });
});
