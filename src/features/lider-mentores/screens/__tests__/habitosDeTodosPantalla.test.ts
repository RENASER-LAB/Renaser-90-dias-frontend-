import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { SectionList, TextInput } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { FormacionDeLaSesion } from '../../../formaciones/types/formaciones.types';
import type { FiltrosDeLosHabitos, HabitoDeTodos, HabitosDeTodos, PersonaEnUnHabito, PersonasDeUnHabito } from '../../types/habitosDeTodos.types';
import type { SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * «Hábitos de todos» del líder (spec 029): los hábitos de un día con su resumen, sus filtros y ‹ ›; las personas de un hábito en secciones
 * con buscador y páginas; la ficha de una persona abierta en ESE mismo día; y el atrás, que sube un nivel por vez
 * (ficha → personas → hábitos del día → «Mis mentores») sin releer lo que ya se leyó.
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
jest.mock('../../api/aprendicesDelLiderApi', () => ({ TAMANO_DE_LA_PAGINA: 30, obtenerAprendicesDelLider: jest.fn() }));

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

/* La formación de la sesión: el filtro «Formación» solo existe para quien ve todas. */
const mockFormacion: { actual: FormacionDeLaSesion | null } = { actual: null };
jest.mock('../../../formaciones/context/FormacionContext', () => ({
  useFormacionDeLaSesion: () => ({ formacion: mockFormacion.actual, elegir: async () => undefined, recargar: async () => undefined }),
}));

/* Las dos lecturas de «Hábitos de todos». */
const mockDia = jest.fn<(filtros: FiltrosDeLosHabitos) => Promise<HabitosDeTodos>>();
const mockPersonas = jest.fn<(id: string, filtros: FiltrosDeLosHabitos, o?: { q?: string; pagina?: number; tamano?: number }) => Promise<PersonasDeUnHabito>>();
jest.mock('../../api/habitosDeTodosApi', () => ({
  TAMANO_DE_LA_PAGINA_DE_PERSONAS: 30,
  obtenerHabitosDeTodos: (f: FiltrosDeLosHabitos) => mockDia(f),
  obtenerPersonasDeUnHabito: (id: string, f: FiltrosDeLosHabitos, o?: { q?: string; pagina?: number; tamano?: number }) => mockPersonas(id, f, o),
}));

/* La ficha de la persona: lo que importa es con qué grupo (o sin él) y de qué semana se pide, y qué día queda abierto. */
const mockSemana = jest.fn<(grupoId: string | null, personaId: string, semanaHasta?: string | null) => Promise<SemanaDePersona>>();
jest.mock('../../api/cumplimientoDelLiderApi', () => ({
  obtenerSemanaDePersona: (g: string | null, p: string, s?: string | null) => mockSemana(g, p, s),
  obtenerRadarDePersona: jest.fn(),
  obtenerTablaDelLider: jest.fn(),
}));
jest.mock('../../../huecos/api/huecosApi', () => ({ obtenerHuecosDePersona: jest.fn() }));
jest.mock('../../../cierre/api/cierreApi', () => ({ obtenerCierresDePersona: jest.fn() }));
jest.mock('../../../mentor/components/CodigoRenaserDelAlumno', () => ({ CodigoRenaserDelAlumno: () => null }));
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => ({ TiempoLibreDeLaSemana: () => null }));
jest.mock('../../../cierre/components/CierresDelDia', () => ({ CierresDelDia: () => null }));
jest.mock('../../components/RespuestasDeLaPersona', () => ({ RespuestasDeLaPersona: () => null }));
const mockDiasDeLaFicha = new Map<string, boolean>();
jest.mock('../../components/DiaDeLaPersona', () => ({
  DiaDeLaPersona: (props: { dia: { fecha: string }; abierto: boolean }) => {
    mockDiasDeLaFicha.set(props.dia.fecha, props.abierto);
    return null;
  },
}));
const mockEvidenciasPedidas: Array<{ titulo: string; evidencias: Array<{ id: string }> }> = [];
jest.mock('../../components/EvidenciaDeObligacion', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return {
    EvidenciaDeObligacion: (props: { titulo: string; evidencias: Array<{ id: string }> }) => {
      mockEvidenciasPedidas.push(props);
      return createElement(Text, null, 'Ver evidencia');
    },
  };
});

import { HabitosDeTodosScreen } from '../HabitosDeTodosScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ------------------------------------------------------------------------------------------
// Datos (hoy es viernes 30 de octubre de 2026)
// ------------------------------------------------------------------------------------------

const GRUPOS = [
  { grupoId: 'g1', grupoNombre: 'Fénix' },
  { grupoId: 'g2', grupoNombre: 'Alba' },
];

const DESPERTAR: HabitoDeTodos = {
  habitoId: 'h-1', titulo: 'DESPERTAR', categoria: 'BODY', categoriaClave: 'CUERPO', nombreDeLaCategoria: null, formacion: 'ESCUELA',
  esperados: 100, cumplieron: 41, pendientes: 50, sinCumplir: 9,
};
const AGUA: HabitoDeTodos = {
  habitoId: 'h-2', titulo: 'AGUA TIBIA CON LIMÓN', categoria: 'MIND', categoriaClave: 'MENTE', nombreDeLaCategoria: null, formacion: 'ESCUELA',
  esperados: 100, cumplieron: 90, pendientes: 10, sinCumplir: 0,
};

function dia(fecha: string, esHoy: boolean, habitos: HabitoDeTodos[] = [DESPERTAR, AGUA]): HabitosDeTodos {
  return {
    fecha, esHoy, masAntigua: '2026-10-23', masReciente: '2026-10-30',
    totales: { alumnos: 120, conHabitos: 118, esperados: 200, cumplieron: 131, pendientes: 60, sinCumplir: 9 },
    habitos,
  };
}

function persona(id: string, nombre: string, parcial: Partial<PersonaEnUnHabito> = {}): PersonaEnUnHabito {
  return {
    personaId: id, nombre, fotoPath: null, grupoId: 'g1', grupoNombre: 'Fénix', estado: 'CUMPLIDO', motivo: null,
    horaPlanificada: '06:00', cumplioA: '06:42', evidenciaId: null, ...parcial,
  };
}

const CARLA = persona('u3', 'Carla Ríos', { estado: 'SIN_CUMPLIR', cumplioA: null });
const DANI = persona('u4', 'Dani Soto', { estado: 'PENDIENTE', cumplioA: null });
const ANA = persona('u1', 'Ana Pérez', { evidenciaId: 'e1' });
const BETO = persona('u2', 'Beto Ríos', { estado: 'SIN_DATOS', motivo: 'NO_LE_TOCABA', grupoId: null, grupoNombre: null, horaPlanificada: null, cumplioA: null });

function personasDe(personas: PersonaEnUnHabito[], parcial: Partial<PersonasDeUnHabito> = {}): PersonasDeUnHabito {
  return { fecha: '2026-10-30', esHoy: true, habito: DESPERTAR, pagina: 0, tamano: 30, total: personas.length, hayMas: false, personas, ...parcial };
}

function semana(): SemanaDePersona {
  const dias = ['2026-10-28', '2026-10-29', '2026-10-30'].map(fecha => ({
    fecha, diaDePrograma: 1, motivo: null, acciones: [],
    obligaciones: fecha === '2026-10-30' ? [] : [{ registroId: `r-${fecha}` }],
  }));
  return {
    grupoId: null, personaId: 'u1', nombre: 'Ana Pérez', avatarUrl: null, rol: 'TRAINEE', desde: '2026-10-24', hasta: '2026-10-30', zona: 'America/Lima',
    semanaEnCurso: true, cerrada: false, primeraSemana: '2026-10-17', mentor: null, resumen: null, color: 'AMARILLO', etiqueta: null, noSeMide: false,
    porcentaje: 60, dias,
  } as unknown as SemanaDePersona;
}

// ------------------------------------------------------------------------------------------
// Ayudas
// ------------------------------------------------------------------------------------------

async function montar(onSalir = jest.fn()): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(HabitosDeTodosScreen, { grupos: GRUPOS, onSalir }));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

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

function boton(r: ReactTestRenderer, parte: string) {
  const nodo = botonesTocables(r).find(n => (n.props.accessibilityLabel as string).includes(parte));
  if (!nodo) throw new Error(`No hay nada tocable que diga «${parte}». Hay: ${botones(r).join(' | ')}`);
  return nodo;
}

async function tocar(r: ReactTestRenderer, parte: string): Promise<void> {
  const nodo = boton(r, parte);
  await act(async () => {
    nodo.props.onPress();
  });
}

/** Un botón sin etiqueta propia (como el «Reintentar» de un fallo): se encuentra por el texto que lleva adentro. */
async function tocarTexto(r: ReactTestRenderer, texto: string): Promise<void> {
  const boton = r.root.findAll(n => typeof n.props.onPress === 'function').find(n => n.findAll(h => (h.type as unknown) === 'Text').some(h => React.Children.toArray(h.props.children).join('').includes(texto)));
  if (!boton) throw new Error(`No hay un botón que diga «${texto}»`);
  await act(async () => {
    boton.props.onPress();
  });
}

/** Los títulos de sección que se ven, en orden. */
function titulosDeSeccion(r: ReactTestRenderer): string[] {
  const texto = (n: ReactTestInstance) => React.Children.toArray(n.props.children).join('');
  const encabezados = r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'header').map(texto);
  const plegables = botonesTocables(r)
    .filter(n => (n.props.accessibilityLabel as string).startsWith('No les tocaba o en pausa.'))
    .map(() => 'No les tocaba o en pausa');
  return [...encabezados, ...plegables];
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
  mockFormacion.actual = null;
  mockDia.mockReset().mockImplementation(async filtros => (filtros.fecha ? dia(filtros.fecha, false) : dia('2026-10-30', true)));
  mockPersonas.mockReset().mockResolvedValue(personasDe([CARLA, DANI, ANA, BETO]));
  mockSemana.mockReset().mockResolvedValue(semana());
  retrocesos.length = 0;
  mockDiasDeLaFicha.clear();
  mockEvidenciasPedidas.length = 0;
});

// ------------------------------------------------------------------------------------------

describe('los hábitos del día', () => {
  it('lee hoy sin filtros y dibuja el resumen y un hábito por fila, con su nombre en tipo oración', async () => {
    const r = await montar();
    expect(mockDia).toHaveBeenCalledTimes(1);
    expect(mockDia).toHaveBeenLastCalledWith({ fecha: null, grupo: null, formacion: null, categoria: null });
    const t = textos(r);
    expect(t).toContain('Hoy');
    expect(t).toContain('viernes 30 de octubre');
    expect(t).toContain('118 de 120 alumnos con hábitos');
    expect(t).toContain('Despertar');
    expect(t).toContain('Agua tibia con limón');
    expect(t).toContain('Cumplieron 41 de 100 · 50 pendientes · 9 sin cumplir');
    expect(t).toContain('Cuerpo');
    expect(botones(r)).toContain('Despertar. Cuerpo. Cumplieron 41 de 100 · 50 pendientes · 9 sin cumplir. Ver los alumnos.');
  });

  it('el orden es el del servidor: no se reordena', async () => {
    const r = await montar();
    const t = textos(r);
    expect(t.indexOf('Despertar')).toBeLessThan(t.indexOf('Agua tibia con limón'));
  });

  it('el filtro de formación solo existe para quien ve todas las formaciones', async () => {
    const sin = await montar();
    expect(botones(sin).some(b => b === 'Todas las formaciones')).toBe(false);
    expect(textos(sin)).not.toContain('Formación');

    const base = { activa: null, disponibles: [], puedeElegir: false, veTodas: true, sinFormacion: false, duracionDias: 90, fases: [] } as unknown as FormacionDeLaSesion;
    mockFormacion.actual = base;
    const con = await montar();
    expect(botones(con)).toContain('Todas las formaciones');
    await tocar(con, 'Diplomado');
    expect(mockDia).toHaveBeenLastCalledWith({ fecha: null, grupo: null, formacion: 'DIPLOMADO', categoria: null });
  });

  it('filtra por grupo (con «Sin grupo») y por dimensión, pide al servidor y no deja a la vista lo del filtro anterior', async () => {
    const r = await montar();
    expect(botones(r)).toEqual(expect.arrayContaining(['Grupo: Todos', 'Grupo: Fénix', 'Grupo: Alba', 'Grupo: Sin grupo', 'Dimensión: Todas', 'Dimensión: Cuerpo', 'Dimensión: Mente']));

    let resolver!: (d: HabitosDeTodos) => void;
    mockDia.mockReturnValueOnce(new Promise(ok => (resolver = ok)));
    await tocar(r, 'Grupo: Sin grupo');
    expect(mockDia).toHaveBeenLastCalledWith({ fecha: null, grupo: 'none', formacion: null, categoria: null });
    expect(textos(r)).toContain('Cargando los hábitos…');
    expect(textos(r)).not.toContain('Despertar');
    await act(async () => {
      resolver(dia('2026-10-30', true, [AGUA]));
    });
    expect(textos(r)).toContain('Agua tibia con limón');
    expect(textos(r)).not.toContain('Despertar');
    // Las dimensiones ya vistas se quedan para poder volver a elegir otra.
    expect(botones(r)).toContain('Dimensión: Cuerpo');

    mockDia.mockResolvedValueOnce(dia('2026-10-30', true, [DESPERTAR]));
    await tocar(r, 'Dimensión: Cuerpo');
    expect(mockDia).toHaveBeenLastCalledWith({ fecha: null, grupo: 'none', formacion: null, categoria: 'CUERPO' });
  });

  it('‹ va al día anterior hasta 7 días atrás y › vuelve hasta hoy; el rótulo dice «Ayer»', async () => {
    const r = await montar();
    expect(boton(r, 'Día siguiente').props.disabled).toBe(true);
    expect(boton(r, 'Día anterior').props.disabled).toBe(false);

    await tocar(r, 'Día anterior');
    expect(mockDia).toHaveBeenLastCalledWith({ fecha: '2026-10-29', grupo: null, formacion: null, categoria: null });
    expect(textos(r)).toContain('Ayer');
    expect(textos(r)).toContain('jueves 29 de octubre');
    // Un día cerrado habla de lo que quedó sin cumplir, no de pendientes.
    expect(textos(r)).toContain('Cumplieron 41 de 100 · 9 sin cumplir · 50 pendientes');
    expect(boton(r, 'Día siguiente').props.disabled).toBe(false);

    for (let i = 0; i < 6; i++) await tocar(r, 'Día anterior');
    expect(mockDia).toHaveBeenLastCalledWith({ fecha: '2026-10-23', grupo: null, formacion: null, categoria: null });
    expect(textos(r)).toContain('Vie 23 oct');
    expect(boton(r, 'Día anterior').props.disabled).toBe(true);
  });

  it('al cambiar de día no queda a la vista el día anterior mientras llega el nuevo', async () => {
    const r = await montar();
    let resolver!: (d: HabitosDeTodos) => void;
    mockDia.mockReturnValueOnce(new Promise(ok => (resolver = ok)));
    await tocar(r, 'Día anterior');
    expect(textos(r)).toContain('Cargando los hábitos…');
    expect(textos(r)).not.toContain('Despertar');
    await act(async () => {
      resolver(dia('2026-10-29', false));
    });
    expect(textos(r)).toContain('Despertar');
  });

  it('sin hábitos lo dice; con filtros dice que ningún alumno coincide y deja quitarlos', async () => {
    mockDia.mockResolvedValue(dia('2026-10-30', true, []));
    const sinFiltros = await montar();
    expect(textos(sinFiltros)).toContain('Ese día nadie tenía hábitos por cumplir.');
    expect(botones(sinFiltros)).not.toContain('Quitar los filtros');

    const r = await montar();
    await tocar(r, 'Grupo: Fénix');
    expect(textos(r)).toContain('Ningún alumno coincide con estos filtros.');
    mockDia.mockResolvedValue(dia('2026-10-30', true));
    await tocar(r, 'Quitar los filtros');
    expect(mockDia).toHaveBeenLastCalledWith({ fecha: null, grupo: null, formacion: null, categoria: null });
    expect(textos(r)).toContain('Despertar');
  });

  it('un fallo dice por qué y «Reintentar» vuelve a pedir lo mismo', async () => {
    mockDia.mockRejectedValueOnce(new Error('caído'));
    const r = await montar();
    expect(textos(r)).toContain('Reintentar');
    expect(textos(r)).not.toContain('Despertar');
    await tocarTexto(r, 'Reintentar');
    expect(mockDia).toHaveBeenCalledTimes(2);
    expect(textos(r)).toContain('Despertar');
  });

  it('el atrás desde los hábitos del día sale a «Mis mentores»', async () => {
    const onSalir = jest.fn();
    await montar(onSalir);
    await atras();
    expect(onSalir).toHaveBeenCalledTimes(1);
  });
});

describe('las personas de un hábito', () => {
  async function abrirDespertar(): Promise<ReactTestRenderer> {
    const r = await montar();
    await tocar(r, 'Despertar. Cuerpo');
    return r;
  }

  it('abre la lista de ESE hábito, en ese día y con los filtros que se miraban', async () => {
    const r = await montar();
    await tocar(r, 'Grupo: Fénix');
    await tocar(r, 'Despertar. Cuerpo');
    expect(mockPersonas).toHaveBeenCalledTimes(1);
    expect(mockPersonas).toHaveBeenLastCalledWith('h-1', { fecha: '2026-10-30', grupo: 'g1', formacion: null, categoria: null }, { q: '', pagina: 0 });
    expect(textos(r)).toContain('Hoy, viernes 30 de octubre');
  });

  it('las personas van en secciones —sin cumplir, pendientes, cumplieron— y las sin nada que medir, plegadas', async () => {
    const r = await abrirDespertar();
    const t = textos(r);
    expect(titulosDeSeccion(r)).toEqual(['Sin cumplir', 'Pendientes', 'Cumplieron', 'No les tocaba o en pausa']);
    expect(t).toContain('Carla Ríos');
    expect(t).toContain('Dani Soto');
    expect(t).toContain('Ana Pérez');
    expect(t).toContain('No les tocaba o en pausa');
    expect(t).not.toContain('Beto Ríos');
    await tocar(r, 'No les tocaba o en pausa');
    expect(textos(r)).toContain('Beto Ríos');
    expect(textos(r)).toContain('No le tocaba o en pausa');
    expect(textos(r)).toContain('Sin grupo');
  });

  it('cada fila dice el grupo, lo planificado y lo cumplido, y el estado con su palabra', async () => {
    const r = await abrirDespertar();
    const t = textos(r);
    expect(t).toContain('Fénix · Planificado 06:00 · Cumplió 06:42');
    expect(t).toContain('Cumplió');
    expect(t).toContain('Pendiente');
    expect(botones(r)).toContain('Ana Pérez. Cumplió. Fénix · Planificado 06:00 · Cumplió 06:42. Ver su ficha.');
  });

  it('«Ver evidencia» solo sale en quien entregó una, con su id', async () => {
    const r = await abrirDespertar();
    expect(mockEvidenciasPedidas.map(e => e.evidencias.map(x => x.id))).toEqual([['e1']]);
    expect(mockEvidenciasPedidas[0].titulo).toContain('Ana Pérez');
    expect(textos(r).match(/Ver evidencia/g)).toHaveLength(1);
  });

  it('el buscador le pregunta al servidor 300 ms después de la última tecla', async () => {
    const r = await abrirDespertar();
    mockPersonas.mockClear();
    await act(async () => {
      unico(r, TextInput).props.onChangeText('ca');
    });
    await pasarMs(200);
    await act(async () => {
      unico(r, TextInput).props.onChangeText('car');
    });
    await pasarMs(250);
    expect(mockPersonas).not.toHaveBeenCalled();
    mockPersonas.mockResolvedValue(personasDe([CARLA]));
    await pasarMs(60);
    expect(mockPersonas).toHaveBeenCalledTimes(1);
    expect(mockPersonas).toHaveBeenLastCalledWith('h-1', expect.anything(), { q: 'car', pagina: 0 });
    expect(textos(r)).toContain('Carla Ríos');
    expect(textos(r)).not.toContain('Ana Pérez');
  });

  it('pide la página siguiente al acercarse al final, sin repetir a nadie', async () => {
    mockPersonas.mockResolvedValueOnce(personasDe([CARLA, ANA], { total: 3, hayMas: true }));
    const r = await abrirDespertar();
    mockPersonas.mockResolvedValueOnce(personasDe([ANA, DANI], { pagina: 1, total: 3, hayMas: false }));
    await act(async () => {
      unico(r, SectionList).props.onEndReached();
    });
    expect(mockPersonas).toHaveBeenLastCalledWith('h-1', expect.anything(), { q: '', pagina: 1 });
    const t = textos(r);
    expect(t.match(/Ana Pérez/g)).toHaveLength(1);
    expect(t).toContain('Dani Soto');
  });

  it('sin nadie lo dice; buscando, dice que no hay resultados', async () => {
    mockPersonas.mockResolvedValueOnce(personasDe([]));
    const r = await abrirDespertar();
    expect(textos(r)).toContain('Nadie tenía este hábito ese día.');
    mockPersonas.mockResolvedValue(personasDe([]));
    await act(async () => {
      unico(r, TextInput).props.onChangeText('zzz');
    });
    await pasarMs(310);
    expect(textos(r)).toContain('Sin resultados para «zzz».');
  });
});

describe('la ficha de la persona, en el mismo día', () => {
  it('desde hoy (viernes) abre la semana que termina hoy y deja abierto hoy; por la puerta sin grupo', async () => {
    const r = await montar();
    await tocar(r, 'Despertar. Cuerpo');
    await tocar(r, 'Ana Pérez. Cumplió');
    expect(mockSemana).toHaveBeenCalledTimes(1);
    // Aunque Ana tiene grupo, se lee por la puerta sin grupo (`desdeTodos`) y con la semana que termina el viernes de hoy.
    expect(mockSemana).toHaveBeenLastCalledWith(null, 'u1', '2026-10-30');
    expect(mockDiasDeLaFicha.get('2026-10-30')).toBe(true);
    expect(mockDiasDeLaFicha.get('2026-10-29')).toBe(false);
  });

  it('desde un día anterior abre la ventana vigente y deja abierto ESE día, no el más reciente con hábitos', async () => {
    const r = await montar();
    mockDia.mockResolvedValueOnce(dia('2026-10-28', false));
    await tocar(r, 'Día anterior');
    await tocar(r, 'Día anterior');
    mockPersonas.mockResolvedValue(personasDe([ANA], { fecha: '2026-10-28', esHoy: false }));
    await tocar(r, 'Despertar. Cuerpo');
    await tocar(r, 'Ana Pérez');
    expect(mockSemana.mock.calls[0][0]).toBeNull();
    expect(mockSemana.mock.calls[0][2] ?? null).toBeNull();
    expect(mockDiasDeLaFicha.get('2026-10-28')).toBe(true);
    expect(mockDiasDeLaFicha.get('2026-10-29')).toBe(false);
  });

  it('una persona sin grupo se abre igual, y el nombre del grupo dice «Sin grupo»', async () => {
    const r = await montar();
    await tocar(r, 'Despertar. Cuerpo');
    await tocar(r, 'No les tocaba o en pausa');
    await tocar(r, 'Beto Ríos');
    expect(mockSemana).toHaveBeenLastCalledWith(null, 'u2', '2026-10-30');
    expect(textos(r)).toContain('Sin grupo');
  });
});

describe('el atrás sube un nivel por vez', () => {
  it('ficha → personas del hábito → hábitos del día → «Mis mentores», sin releer lo ya leído', async () => {
    const onSalir = jest.fn();
    const r = await montar(onSalir);
    await tocar(r, 'Despertar. Cuerpo');
    await act(async () => {
      unico(r, TextInput).props.onChangeText('a');
    });
    await pasarMs(310);
    await tocar(r, 'Ana Pérez. Cumplió');
    expect(mockDiasDeLaFicha.size).toBeGreaterThan(0);

    const dias = mockDia.mock.calls.length;
    const personas = mockPersonas.mock.calls.length;

    // 1) La ficha vuelve a las personas, con su búsqueda y sin releer.
    await atras();
    expect(onSalir).not.toHaveBeenCalled();
    expect(unico(r, TextInput).props.value).toBe('a');
    expect(mockPersonas.mock.calls.length).toBe(personas);
    expect(textos(r)).toContain('Ana Pérez');

    // 2) Las personas vuelven a los hábitos del día, también sin releer.
    await atras();
    expect(onSalir).not.toHaveBeenCalled();
    expect(mockDia.mock.calls.length).toBe(dias);
    expect(textos(r)).toContain('Agua tibia con limón');

    // 3) Los hábitos del día suben a «Mis mentores».
    await atras();
    expect(onSalir).toHaveBeenCalledTimes(1);
  });

  it('la flecha de la cabecera hace lo mismo que el atrás del sistema', async () => {
    const onSalir = jest.fn();
    const r = await montar(onSalir);
    await tocar(r, 'Despertar. Cuerpo');
    await act(async () => {
      const volver = botonesTocables(r).filter(n => n.props.accessibilityLabel === 'Volver');
      volver[volver.length - 1].props.onPress();
    });
    expect(onSalir).not.toHaveBeenCalled();
    expect(botones(r)).toContain('Despertar. Cuerpo. Cumplieron 41 de 100 · 50 pendientes · 9 sin cumplir. Ver los alumnos.');
  });
});
