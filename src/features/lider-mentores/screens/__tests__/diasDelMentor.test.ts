import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { fichaSchema, type FichaApi } from '../../api/liderMentoresSchemas';
import type { SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * El líder ve los días y las evidencias de un mentor o una guía con programa propio (D-318, 2026-11-03; pedido del dueño:
 * «¿de los mentores puede ver qué hábitos hace o no, como con los aprendices?»): en la ficha del mentor, una fila «Sus días y
 * evidencias ›» que solo existe si el servidor dice `haceSuPrograma`; abre `PersonaDelLiderScreen` por la puerta sin grupo, sin
 * «Avisar a su mentor» (él es el mentor); y el atrás sube un nivel: días → ficha → padrón.
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
jest.mock('../../utils/irAlChat', () => ({ escribirleA: jest.fn(), escribirleAlMentor: jest.fn(), enviarPorChat: jest.fn() }));

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

const mockFicha = jest.fn<(mentorId: string) => Promise<FichaApi>>();
jest.mock('../../api/liderMentoresApi', () => ({
  obtenerFicha: (id: string) => mockFicha(id),
  obtenerPadron: jest.fn(),
  obtenerReporte: jest.fn(),
  registrarObservacion: jest.fn(),
}));

/* El padrón se reemplaza por un botón que abre a la mentora: lo que se prueba es la ficha y lo que cuelga de ella. */
jest.mock('../PadronScreen', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    PadronScreen: (props: { onAbrirMentor: (id: string) => void; onVolver: () => void }) =>
      React.createElement(
        Pressable,
        { accessibilityLabel: 'Abrir a Luisa Rojas', onPress: () => props.onAbrirMentor('m1') },
        React.createElement(Text, null, 'PADRON'),
      ),
  };
});

/* Las lecturas de la ficha de la persona: lo que importa es con qué grupo (o sin él) se piden. */
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
jest.mock('../../../ochenta-veinte/components/OchentaVeinteDeLaFicha', () => ({ OchentaVeinteDeLaFicha: () => null }));
jest.mock('../../../diagnostico/components/SeccionDelDiagnosticoDeLaPersona', () => ({ SeccionDelDiagnosticoDeLaPersona: () => null }));

import { FichaMentorScreen } from '../FichaMentorScreen';
import { LiderMentoresScreen } from '../LiderMentoresScreen';
import { PersonaDelLiderScreen } from '../PersonaDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ------------------------------------------------------------------------------------------
// Datos
// ------------------------------------------------------------------------------------------

const FILA = 'Sus días y evidencias';

function ficha(cambios: Partial<FichaApi> = {}): FichaApi {
  return {
    mentor: {
      userId: 'm1',
      fullName: 'Luisa Rojas',
      avatarUrl: null,
      groups: { source: 'OK', items: [] },
      traineeCount: 0,
      semaforo: { source: 'OK', summary: null },
      attention: { source: 'OK', open: 0, oldestOpenDays: null, answered: 0, medianResponseHours: null },
      evaluation: { source: 'OK', month: '2026-11', percentage: null, delivered: null, expected: null, traineesEvaluated: null, state: null },
    },
    accountActive: true,
    profile: { level: 'N1', operationalStatus: 'GREEN', since: '2026-03-03T15:00:00Z' },
    month: '2026-11',
    timezone: 'America/Lima',
    cutoffAt: '2026-11-03T15:00:00Z',
    recentObservations: [],
    haceSuPrograma: true,
    ...cambios,
  } as FichaApi;
}

function semanaDelMentor(cambios: Partial<SemanaDePersona> = {}): SemanaDePersona {
  return {
    grupoId: null,
    personaId: 'm1',
    nombre: 'Luisa Rojas',
    avatarUrl: null,
    rol: 'MENTOR',
    desde: '2026-10-27',
    hasta: '2026-11-02',
    zona: 'America/Lima',
    semanaEnCurso: true,
    cerrada: false,
    primeraSemana: '2026-09-05',
    mentor: null,
    puedeAvisarAlMentor: false,
    resumen: { obligaciones: 2, cumplidas: 1, conEntrega: 1, pendientes: 1, sinCumplir: 0 },
    color: 'SIN_DATOS',
    etiqueta: null,
    noSeMide: true,
    porcentaje: 85,
    dias: [
      {
        fecha: '2026-11-01',
        diaDePrograma: 40,
        motivo: null,
        obligaciones: [
          {
            registroId: 'r1',
            titulo: 'Ritual de la mañana',
            estado: 'COMPLETADO',
            requiereEvidencia: true,
            entrega: 'ENTREGADA',
            entregadaEn: '2026-11-01T14:00:00Z',
            revision: null,
            evidenciaId: 'e1',
            respuestaTexto: 'Me sentí con energía',
            evidencias: [{ id: 'e1', tipo: 'FOTO', subidaEn: '2026-11-01T14:00:00Z' }],
            publicacionId: null,
            medicion: null,
          },
          {
            registroId: 'r2',
            titulo: 'Caminar',
            estado: 'PENDIENTE',
            requiereEvidencia: false,
            entrega: 'NO_REQUERIDA',
            entregadaEn: null,
            revision: null,
            evidenciaId: null,
            respuestaTexto: null,
            evidencias: [],
            publicacionId: null,
            medicion: null,
          },
        ],
        acciones: [],
      },
    ],
    ...cambios,
  };
}

// ------------------------------------------------------------------------------------------
// Ayudas
// ------------------------------------------------------------------------------------------

async function montarLaFicha(f: FichaApi = ficha(), onAbrirDias = jest.fn()): Promise<ReactTestRenderer> {
  mockFicha.mockResolvedValue(f);
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(FichaMentorScreen, { mentorId: 'm1', aviso: null, onVolver: () => undefined, onObservar: () => undefined, onAbrirDias }),
    );
  });
  return r;
}

async function montarElFlujo(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(LiderMentoresScreen, { onSalir: () => undefined }));
  });
  return r;
}

function textos(r: ReactTestRenderer | ReactTestInstance): string {
  const raiz = 'root' in r ? r.root : r;
  return raiz
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

async function atras(): Promise<void> {
  await act(async () => {
    retrocesos[retrocesos.length - 1].actual();
  });
}

const hayFila = (r: ReactTestRenderer) => botones(r).some(b => b.startsWith(FILA));

beforeEach(() => {
  mockFicha.mockReset();
  mockSemana.mockReset().mockResolvedValue(semanaDelMentor());
  mockRadar.mockReset().mockResolvedValue({});
  mockHuecos.mockReset().mockResolvedValue({});
  mockCierres.mockReset().mockResolvedValue({});
  retrocesos.length = 0;
  cargas.radar = cargas.huecos = cargas.cierres = undefined;
});

// ------------------------------------------------------------------------------------------

describe('la fila «Sus días y evidencias» de la ficha del mentor', () => {
  it('aparece cuando el servidor dice que el mentor hace su programa, con 48 de alto o más y su nombre accesible', async () => {
    const r = await montarLaFicha(ficha({ haceSuPrograma: true }));
    expect(textos(r)).toContain(FILA);
    expect(botones(r)).toContain(`${FILA}. Abre los siete días de Luisa Rojas con sus hábitos y lo que subió.`);
    const fila = botonesTocables(r).find(n => (n.props.accessibilityLabel as string).startsWith(FILA));
    const estilo = JSON.stringify(fila?.props.style);
    expect(estilo).toContain('"minHeight":56');
  });

  it.each([
    ['false', false],
    ['null', null],
    ['ausente (un servidor anterior)', undefined],
  ])('no se dibuja si haceSuPrograma es %s', async (_nombre, valor) => {
    const r = await montarLaFicha(ficha({ haceSuPrograma: valor as boolean | null | undefined }));
    expect(textos(r)).not.toContain(FILA);
    expect(hayFila(r)).toBe(false);
    /* Lo demás de la ficha sigue igual. */
    expect(textos(r)).toContain('Sus grupos');
    expect(botones(r)).toContain('Escribirle');
  });

  it('no se dibuja sin quien la atienda (la ficha abierta desde un lugar que no sabe abrir días)', async () => {
    mockFicha.mockResolvedValue(ficha());
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(
        React.createElement(FichaMentorScreen, { mentorId: 'm1', aviso: null, onVolver: () => undefined, onObservar: () => undefined }),
      );
    });
    expect(hayFila(r)).toBe(false);
  });

  it('tocarla entrega lo que ya se sabe del mentor: su id, su nombre y su foto', async () => {
    const onAbrirDias = jest.fn();
    const r = await montarLaFicha(ficha({ mentor: { ...ficha().mentor, avatarUrl: 'https://x/y.jpg' } }), onAbrirDias);
    await tocar(r, FILA);
    expect(onAbrirDias).toHaveBeenCalledWith({ userId: 'm1', nombre: 'Luisa Rojas', avatarUrl: 'https://x/y.jpg' });
  });
});

describe('abrir sus días desde «Mis mentores»', () => {
  async function abrirSusDias(): Promise<ReactTestRenderer> {
    mockFicha.mockResolvedValue(ficha());
    const r = await montarElFlujo();
    await tocar(r, 'Abrir a Luisa Rojas');
    await tocar(r, FILA);
    return r;
  }

  it('lee su semana por la puerta SIN grupo (grupo en null), y su Radar, tiempo libre y cierres también', async () => {
    await abrirSusDias();
    expect(mockSemana).toHaveBeenCalledTimes(1);
    expect(mockSemana).toHaveBeenCalledWith(null, 'm1', null);
    await cargas.radar?.('c1');
    await cargas.huecos?.('2026-10-26');
    await cargas.cierres?.('2026-10-26');
    expect(mockRadar).toHaveBeenLastCalledWith(null, 'm1', 'c1');
    expect(mockHuecos).toHaveBeenLastCalledWith(null, 'm1', '2026-10-26');
    expect(mockCierres).toHaveBeenLastCalledWith(null, 'm1', '2026-10-26');
  });

  it('dibuja sus días de verdad —hábitos hechos y pendientes y lo que escribió— aunque no cuente para el semáforo', async () => {
    const r = await abrirSusDias();
    /* Solo lo de sus días: la ficha, oculta debajo, sigue en el árbol con sus propios textos. */
    const t = textos(r.root.findAll(n => (n.type as unknown) === PersonaDelLiderScreen)[0]);
    expect(t).toContain('Su propio programa');
    expect(t).toContain('Mentor · No se mide en el semáforo');
    expect(t).toContain('85');
    expect(t).toContain('Ritual de la mañana');
    expect(t).toContain('Caminar');
    /* Sin renglón de grupo vacío ni «Sin grupo»: él no es un aprendiz sin grupo. */
    expect(t).not.toContain('Sin grupo');
    /* Hay días que contar: la línea de la semana ya no se esconde por «no se mide». */
    expect(t).toContain('1 cumplidos · 0 sin cumplir · 1 pendientes');
  });

  it('no ofrece «Avisar a su mentor» aunque el servidor mandara un mentor y dijera que se puede: él es el mentor. «Escribirle» sí', async () => {
    mockSemana.mockResolvedValue(semanaDelMentor({ mentor: { id: 'otro', nombre: 'Alguien' }, puedeAvisarAlMentor: true }));
    const r = await abrirSusDias();
    expect(botones(r).some(b => b.startsWith('Avisar a su mentor'))).toBe(false);
    expect(botones(r)).toContain('Escribirle a Luisa Rojas');
  });

  it('un 404 de sus días dice que ya no están disponibles, sin romper la ficha de abajo', async () => {
    const { ApiError } = jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient');
    mockSemana.mockRejectedValue(new ApiError(404, 'no'));
    const r = await abrirSusDias();
    expect(textos(r)).toContain('Sus días ya no están disponibles para ver.');
  });

  it('el atrás sube un nivel por vez: días → ficha (sin releerla) → padrón', async () => {
    const r = await abrirSusDias();
    expect(mockFicha).toHaveBeenCalledTimes(1);
    /* Con los días abiertos, el único retroceso activo es el de los días: el de la ficha, oculta, está apagado. */
    expect(retrocesos).toHaveLength(1);
    expect(r.root.findAll(n => (n.type as unknown) === PersonaDelLiderScreen)).toHaveLength(1);

    await atras();
    expect(r.root.findAll(n => (n.type as unknown) === PersonaDelLiderScreen)).toHaveLength(0);
    expect(textos(r)).toContain(FILA);
    /* La ficha no se volvió a leer: seguía montada, oculta. */
    expect(mockFicha).toHaveBeenCalledTimes(1);
    expect(retrocesos).toHaveLength(1);

    await atras();
    expect(textos(r)).toContain('PADRON');
    expect(r.root.findAll(n => (n.type as unknown) === FichaMentorScreen)).toHaveLength(0);
  });

  it('la flecha «Volver» de sus días también vuelve a la ficha', async () => {
    const r = await abrirSusDias();
    const volver = botonesTocables(r).filter(n => n.props.accessibilityLabel === 'Volver');
    /* La de la ficha (oculta) y la de sus días: la última es la de sus días. */
    await act(async () => {
      volver[volver.length - 1].props.onPress();
    });
    expect(r.root.findAll(n => (n.type as unknown) === PersonaDelLiderScreen)).toHaveLength(0);
    expect(textos(r)).toContain(FILA);
  });

  it('la ficha oculta no se muestra encima: mientras se miran sus días, su contenedor va con display none', async () => {
    const r = await abrirSusDias();
    const laFicha = r.root.findAll(n => (n.type as unknown) === FichaMentorScreen)[0];
    const contenedor = (laFicha as unknown as { parent: { props: { style?: unknown } } }).parent;
    expect(contenedor.props.style).toEqual({ display: 'none' });
  });
});

describe('un aprendiz sigue igual', () => {
  it('«Avisar a su mentor» sigue ofreciéndose con grupo y mentor (avisarAlMentor es true por defecto)', async () => {
    mockSemana.mockResolvedValue(
      semanaDelMentor({ grupoId: 'g1', personaId: 'u1', rol: 'TRAINEE', noSeMide: false, color: 'AMARILLO', mentor: { id: 'm9', nombre: 'Luisa' }, puedeAvisarAlMentor: true }),
    );
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
    expect(botones(r).some(b => b.startsWith('Avisar a su mentor'))).toBe(true);
    expect(textos(r)).toContain('Fénix · Mentor: Luisa');
  });
});

describe('el contrato de la ficha (GET /leadership/mentors/{id})', () => {
  it('lee haceSuPrograma cuando viene, y un servidor anterior sin el campo sigue siendo una ficha válida', () => {
    const completa = ficha();
    expect(fichaSchema.parse(completa).haceSuPrograma).toBe(true);
    const { haceSuPrograma: _quitado, ...sinElCampo } = completa;
    const leida = fichaSchema.parse(sinElCampo);
    expect(leida.haceSuPrograma).toBeUndefined();
    expect(fichaSchema.parse({ ...completa, haceSuPrograma: null }).haceSuPrograma).toBeNull();
  });
});
