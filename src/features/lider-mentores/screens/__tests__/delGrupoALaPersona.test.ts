import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { LecturaDeGrupos } from '../../../semaforo/hooks/useLecturaPorSemana';
import type { ResumenPorGrupos, SemaforoDelGrupo } from '../../../semaforo/types/semaforo.types';
import type { SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * Del semáforo por grupos a la semana de una persona (spec 005, US1): las tarjetas se abren SOLO si el servidor
 * lo dice (FR-021), la lista del grupo trae a quien no se mide con su %, la persona se ve día por día con la falta
 * de datos dicha en palabras, y el retroceso del sistema sube un nivel a la vez.
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
jest.mock('../../../semaforo/components/graficos', () => ({ GraficoDeDias: () => null, GraficoDeSemanas: () => null }));
/* El visor de evidencias trae el reproductor de las lecciones (WebView) y el de audio: módulos nativos que Jest no tiene. */
jest.mock('../../../academy/components/LeccionVideoPlayer', () => ({ LeccionVideoPlayer: () => null }));
jest.mock('../../components/ReproductorDeAudio', () => ({ ReproductorDeAudio: () => null }));

/** Los retrocesos del sistema registrados por las pantallas montadas; el último es el que atiende el gesto. */
const retrocesos: Array<{ actual: () => boolean | void }> = [];
jest.mock('../../../../hooks/useSystemBackHandler', () => {
  const { useEffect, useRef } = jest.requireActual<typeof import('react')>('react');
  return {
    useSystemBackHandler: (fn: () => boolean | void) => {
      const ref = useRef(fn);
      ref.current = fn;
      useEffect(() => {
        const entrada = { actual: () => ref.current() };
        retrocesos.push(entrada);
        return () => {
          retrocesos.splice(retrocesos.indexOf(entrada), 1);
        };
      }, []);
    },
  };
});

const mockTabla = jest.fn<(grupoId: string, semanaHasta?: string | null) => Promise<SemaforoDelGrupo>>();
const mockSemana = jest.fn<(grupoId: string, personaId: string, semanaHasta?: string | null) => Promise<SemanaDePersona>>();
jest.mock('../../api/cumplimientoDelLiderApi', () => ({
  obtenerTablaDelLider: (g: string, s?: string | null) => mockTabla(g, s),
  obtenerSemanaDePersona: (g: string, p: string, s?: string | null) => mockSemana(g, p, s),
}));

import { ResumenDeGrupos } from '../../../semaforo/components/ResumenDeGrupos';
import { CumplimientoDelLiderScreen } from '../CumplimientoDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ------------------------------------------------------------------------------------------
// Datos
// ------------------------------------------------------------------------------------------

function grupo(id: string, nombre: string, puedeAbrirse: boolean) {
  return {
    grupoId: id,
    grupoNombre: nombre,
    mentorNombre: puedeAbrirse ? 'Luisa' : null,
    sinMentor: !puedeAbrirse,
    resumen: { verde: 1, amarillo: 0, rojo: 1, sinDatos: 0, total: 2 },
    promedio: 60,
    colorDelPromedio: 'AMARILLO' as const,
    etiquetaDelPromedio: 'Requiere atención',
    puedeAbrirse,
  };
}

function resumen(grupos: ReturnType<typeof grupo>[]): LecturaDeGrupos {
  const datos: ResumenPorGrupos = {
    desde: '2026-10-12',
    hasta: '2026-10-18',
    cerrada: false,
    totales: { verde: 2, amarillo: 0, rojo: 2, sinDatos: 0, total: 4 },
    grupos,
  };
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
    volverAVigente: () => undefined,
    recargar: () => undefined,
    inicio: { posicion: { modo: 'vigente' }, hastaVigente: '2026-10-18' },
  };
}

const LISTA: SemaforoDelGrupo = {
  grupoId: 'g1',
  grupoNombre: 'Fénix',
  desde: '2026-10-12',
  hasta: '2026-10-18',
  cerrada: false,
  resumen: { verde: 0, amarillo: 0, rojo: 1, sinDatos: 0, total: 1 },
  aprendices: [
    { aprendizId: 'u1', nombre: 'Ana Pérez', avatarUrl: null, porcentaje: 30.5, color: 'ROJO', etiqueta: 'Con problemas', diasConDatos: 5, dias: [] },
    {
      aprendizId: 'm1',
      nombre: 'Luisa Rojas',
      avatarUrl: null,
      porcentaje: 88.2,
      color: 'SIN_DATOS',
      etiqueta: null,
      diasConDatos: null,
      dias: [],
      noSeMide: true,
      rol: 'MENTOR',
    },
  ],
};

function semana(cambios: Partial<SemanaDePersona> = {}): SemanaDePersona {
  return {
    grupoId: 'g1',
    personaId: 'u1',
    nombre: 'Ana Pérez',
    avatarUrl: null,
    desde: '2026-10-17',
    hasta: '2026-10-23',
    zona: 'America/Lima',
    semanaEnCurso: true,
    primeraSemana: '2026-08-29',
    mentor: { id: 'm1', nombre: 'Luisa' },
    resumen: { obligaciones: 5, cumplidas: 3, conEntrega: 1, pendientes: 1, sinCumplir: 1 },
    color: 'ROJO',
    etiqueta: 'Con problemas',
    noSeMide: false,
    porcentaje: 30.5,
    dias: [
      { fecha: '2026-10-17', diaDePrograma: 49, motivo: 'PAUSADO', obligaciones: [], acciones: [] },
      {
        fecha: '2026-10-18',
        diaDePrograma: 50,
        motivo: null,
        obligaciones: [
          {
            registroId: 'r1',
            titulo: 'Ritual de la mañana',
            estado: 'COMPLETADO',
            requiereEvidencia: false,
            entrega: 'NO_REQUERIDA',
            entregadaEn: null,
            revision: null,
            evidenciaId: null,
            respuestaTexto: null,
            evidencias: [],
            publicacionId: null,
          },
          {
            registroId: 'r2',
            titulo: 'Agua tibia',
            estado: 'EXPIRADO',
            requiereEvidencia: false,
            entrega: 'NO_REQUERIDA',
            entregadaEn: null,
            revision: null,
            evidenciaId: null,
            respuestaTexto: null,
            evidencias: [],
            publicacionId: null,
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

async function montar(lectura: LecturaDeGrupos, onSalir = jest.fn()): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(CumplimientoDelLiderScreen, { lectura, onSalir }));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

/** Lo que se puede tocar y cómo se llama para el lector de pantalla. */
function botones(r: ReactTestRenderer): string[] {
  return botonesTocables(r).map(n => n.props.accessibilityLabel as string);
}

/** Un `Presionable` y el `Pressable` de adentro son un solo botón, no dos: solo el más externo. */
function botonesTocables(r: ReactTestRenderer) {
  const todos = r.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string');
  return todos.filter(n => !todos.includes((n as unknown as { parent: never }).parent));
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

beforeEach(() => {
  mockTabla.mockReset();
  mockSemana.mockReset();
  retrocesos.length = 0;
});

// ------------------------------------------------------------------------------------------

describe('las tarjetas del semáforo por grupos (FR-021)', () => {
  it('se abren solo las que el servidor dice que se pueden abrir', async () => {
    const r = await montar(resumen([grupo('g1', 'Fénix', true), grupo('g2', 'Sin mentor', false)]));
    const abribles = botones(r).filter(b => b.includes('Abrir el semáforo del grupo'));
    expect(abribles).toHaveLength(1);
    expect(abribles[0]).toContain('Fénix');
    expect(textos(r)).toContain('Toca un grupo para ver a sus personas.');
  });

  it('contra un backend anterior (sin `puedeAbrirse`) ninguna se abre y el texto es el de siempre', async () => {
    const r = await montar(resumen([grupo('g1', 'Fénix', false)]));
    expect(botones(r).filter(b => b.includes('Abrir el semáforo del grupo'))).toHaveLength(0);
    expect(textos(r)).toContain('Solo cantidades: a cada aprendiz lo acompaña y lo ve su mentor.');
    expect(mockTabla).not.toHaveBeenCalled();
  });
});

describe('Administración y Alquimista (su recorrido no cambia)', () => {
  it('siguen abriendo todos los grupos como siempre, con o sin `puedeAbrirse`', async () => {
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(
        React.createElement(ResumenDeGrupos, { lectura: resumen([grupo('g1', 'Fénix', false)]), onAbrirGrupo: () => undefined }),
      );
    });
    expect(botones(r).filter(b => b.includes('Abrir el semáforo del grupo'))).toHaveLength(1);
  });
});

describe('del grupo a la persona', () => {
  it('tocar un grupo lista a sus personas; la que no se mide dice su rol, «No se mide en el semáforo» y su %', async () => {
    mockTabla.mockResolvedValue(LISTA);
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    expect(mockTabla).toHaveBeenCalledWith('g1', null);
    const t = textos(r);
    expect(t).toContain('Ana Pérez');
    expect(t).toContain('Mentor · No se mide en el semáforo');
    expect(t).toContain('88.2');
    // Las dos filas se abren a su ficha; la del mentor se dice completa a quien no la ve.
    expect(botones(r).some(b => b.startsWith('Luisa Rojas. Mentor. No se mide en el semáforo, 88.2'))).toBe(true);
  });

  it('un grupo sin nadie dice «Este grupo todavía no tiene personas»', async () => {
    mockTabla.mockResolvedValue({ ...LISTA, aprendices: [], resumen: null });
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    expect(textos(r)).toContain('Este grupo todavía no tiene personas.');
  });

  it('si la lista no carga, lo dice con «Reintentar»; no deja la pantalla en blanco', async () => {
    mockTabla.mockRejectedValue(new Error('caído'));
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    expect(textos(r)).toContain('No pudimos cargar el semáforo del grupo');
    expect(textos(r)).toContain('Reintentar');
  });

  it('tocar a una persona abre su semana: día por día, la pausa dicha en palabras y nunca como incumplida', async () => {
    mockTabla.mockResolvedValue(LISTA);
    mockSemana.mockResolvedValue(semana());
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    await tocar(r, 'Ana Pérez');
    expect(mockSemana).toHaveBeenCalledWith('g1', 'u1', null);
    const t = textos(r);
    expect(t).toContain('Esta semana');
    expect(t).toContain('Del sábado 17 al viernes 23 de octubre');
    expect(t).toContain('Sábado 17 de octubre');
    expect(t).toContain('En pausa · Día 49');
    expect(t).toContain('Domingo 18 de octubre');
    expect(t).toContain('1 de 2 hábitos cumplidos · Día 50');
    // El día más reciente con hábitos viene abierto: cada hábito con su estado en palabras.
    expect(t).toContain('Ritual de la mañana');
    expect(t).toContain('Cumplido · sin evidencia');
    expect(t).toContain('Venció');
    // Con color y porcentaje de la semana.
    expect(t).toContain('Con problemas');
    expect(t).toContain('30.5');
    expect(t).toContain('3 cumplidos · 1 sin cumplir · 1 pendientes · 1 con evidencia');
  });

  it('la lista parada en una semana anterior abre a la persona en ESA semana', async () => {
    mockTabla.mockResolvedValue(LISTA);
    mockSemana.mockResolvedValue(semana({ semanaEnCurso: false, desde: '2026-10-10', hasta: '2026-10-16' }));
    const lectura = {
      ...resumen([grupo('g1', 'Fénix', true)]),
      posicion: { modo: 'semana', semanaHasta: '2026-10-16' } as const,
      inicio: { posicion: { modo: 'semana', semanaHasta: '2026-10-16' } as const, hastaVigente: '2026-10-18' },
    };
    const r = await montar(lectura);
    await tocar(r, 'Abrir el semáforo del grupo');
    expect(mockTabla).toHaveBeenCalledWith('g1', '2026-10-16');
    await tocar(r, 'Ana Pérez');
    expect(mockSemana).toHaveBeenCalledWith('g1', 'u1', '2026-10-16');
    expect(textos(r)).toContain('Semana cerrada');
  });

  it('el mentor o la guía con programa propio se abre igual, y dice que no se mide', async () => {
    mockTabla.mockResolvedValue(LISTA);
    mockSemana.mockResolvedValue(semana({ personaId: 'm1', nombre: 'Luisa Rojas', noSeMide: true, color: 'SIN_DATOS', etiqueta: null, porcentaje: 88.2 }));
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    await tocar(r, 'Luisa Rojas');
    expect(textos(r)).toContain('No se mide en el semáforo');
    expect(textos(r)).toContain('88.2');
  });

  it('si la semana falla: error con «Reintentar» y nada de otra persona', async () => {
    mockTabla.mockResolvedValue(LISTA);
    mockSemana.mockRejectedValue(new Error('caído'));
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    await tocar(r, 'Ana Pérez');
    expect(textos(r)).toContain('No pudimos cargar la semana de Ana Pérez');
    expect(textos(r)).toContain('Reintentar');
    expect(textos(r)).not.toContain('Ritual de la mañana');
  });

  it('una semana sin días dice que no hay nada que mostrar', async () => {
    mockTabla.mockResolvedValue(LISTA);
    mockSemana.mockResolvedValue(semana({ dias: [], resumen: null }));
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    await tocar(r, 'Ana Pérez');
    expect(textos(r)).toContain('No hay nada que mostrar de esta semana.');
  });
});

describe('el retroceso del sistema sube un nivel a la vez', () => {
  it('persona → grupo → resumen → Hoy, y la lista del grupo sigue ahí (sin releerse)', async () => {
    mockTabla.mockResolvedValue(LISTA);
    mockSemana.mockResolvedValue(semana());
    const onSalir = jest.fn();
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]), onSalir);
    await tocar(r, 'Abrir el semáforo del grupo');
    await tocar(r, 'Ana Pérez');
    expect(textos(r)).toContain('Esta semana');

    await atras(); // persona → grupo
    expect(textos(r)).toContain('Primero quienes más lo necesitan');
    expect(mockTabla).toHaveBeenCalledTimes(1);

    await atras(); // grupo → resumen
    expect(textos(r)).toContain('Todos los grupos');
    expect(onSalir).not.toHaveBeenCalled();

    await atras(); // resumen → Hoy
    expect(onSalir).toHaveBeenCalledTimes(1);
  });
});
