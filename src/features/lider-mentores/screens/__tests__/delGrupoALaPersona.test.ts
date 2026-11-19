import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { LecturaDeGrupos } from '../../../semaforo/hooks/useLecturaPorSemana';
import type { ResumenPorGrupos, SemaforoDelGrupo } from '../../../semaforo/types/semaforo.types';

/**
 * Del semáforo por grupos a la ficha de una persona (spec 005, US1; rehecho con la spec 056): las tarjetas se abren SOLO si el servidor
 * lo dice (FR-021), el grupo del líder trae a quien no se mide con su %, la persona se abre con la ficha de la 055, y el retroceso del
 * sistema sube un nivel a la vez.
 *
 * **La ventana del resumen manda en todo** (decisión del dueño del 2026-10-19): el resumen, la lista y la ficha abren
 * en los mismos 7 días, con el mismo rótulo y las mismas flechas; lo que la lista está mirando es lo que abre la ficha.
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
/* Spec 012: la ficha suma el Código Renaser de la persona (su propia lectura y su `Aparicion`); estas pruebas son de otra cosa. */
jest.mock('../../../mentor/components/CodigoRenaserDelAlumno', () => ({ CodigoRenaserDelAlumno: () => null }));
/* Spec 015: la ficha suma su tiempo libre de la semana (su propia lectura y su `Aparicion`); estas pruebas son de otra cosa. */
jest.mock('../../../cierre/components/CierresDelDia', () => ({ CierresDelDia: () => null }));
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => ({ TiempoLibreDeLaSemana: () => null }));
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
jest.mock('../../api/cumplimientoDelLiderApi', () => ({
  obtenerTablaDelLider: (g: string, s?: string | null) => mockTabla(g, s),
}));

/* Spec 056: desde el grupo se abre la ficha de la 055 con lo del líder. La ficha compartida se prueba en su archivo; acá importa con qué origen se abre
   y que el atrás suba un nivel. */
let ultimasPropsDeLaFicha: { origen: { quien: string; grupoId: string | null }; alumno: { participanteId: string }; rotuloDeVolver?: string } | null = null;
jest.mock('../../../mentor/components/FichaDePersona', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  const { useSystemBackHandler } = jest.requireMock<{ useSystemBackHandler: (f: () => boolean) => void }>('../../../../hooks/useSystemBackHandler');
  return {
    FichaDePersona: (props: { origen: { quien: string; grupoId: string | null }; alumno: { participanteId: string }; rotuloDeVolver?: string; onVolver: () => void }) => {
      ultimasPropsDeLaFicha = props;
      useSystemBackHandler(() => {
        props.onVolver();
        return true;
      });
      return R.createElement(View, { testID: 'ficha-de-persona' }, R.createElement(Text, null, 'FICHA DE LA PERSONA'));
    },
  };
});
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
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({ HojaDesdeAbajo: () => null }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: () => undefined, seleccion: () => undefined, error: () => undefined } }));

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

/** La lista del líder sin `semanaHasta`: la misma ventana vigente del resumen, los 7 días que terminan ayer. */
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
  retrocesos.length = 0;
});

// ------------------------------------------------------------------------------------------

describe('las tarjetas del semáforo por grupos (FR-021)', () => {
  it('se abren solo las que el servidor dice que se pueden abrir', async () => {
    const r = await montar(resumen([grupo('g1', 'Fénix', true), grupo('g2', 'Sin mentor', false)]));
    const abribles = botones(r).filter(b => b.includes('Abrir el semáforo del grupo'));
    expect(abribles).toHaveLength(1);
    expect(abribles[0]).toContain('Fénix');
    // Spec 018: la línea de ayuda ya no está; la tarjeta que se abre lleva su botón.
    expect(textos(r)).not.toContain('Toca un grupo para ver a sus personas.');
  });

  it('contra un backend anterior (sin `puedeAbrirse`) ninguna se abre y el texto es el de siempre', async () => {
    const r = await montar(resumen([grupo('g1', 'Fénix', false)]));
    expect(botones(r).filter(b => b.includes('Abrir el semáforo del grupo'))).toHaveLength(0);
    expect(textos(r)).not.toContain('Solo cantidades: a cada aprendiz lo acompaña y lo ve su mentor.');
    expect(mockTabla).not.toHaveBeenCalled();
  });
});

describe('abierta desde la fila de un grupo de «Mis mentores» (spec 018)', () => {
  async function montarEnElGrupo(onSalir = jest.fn()): Promise<ReactTestRenderer> {
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(
        React.createElement(CumplimientoDelLiderScreen, {
          lectura: resumen([grupo('g1', 'Fénix', true)]),
          onSalir,
          grupoInicial: { grupoId: 'g1', nombre: 'Fénix', inicio: { posicion: { modo: 'vigente' }, hastaVigente: '2026-10-18' } },
        }),
      );
    });
    return r;
  }

  it('arranca en el grupo del líder, en los mismos 7 días, sin pasar por el resumen', async () => { // spec 056 FR-011
    mockTabla.mockResolvedValue(LISTA);
    const r = await montarEnElGrupo();
    expect(mockTabla).toHaveBeenCalledWith('g1', null);
    const t = textos(r);
    expect(t).toContain('Ana Pérez');
    expect(t).toContain('Grupo en ámbar · 60 % en 7 días');
    // No es el resumen: ni «Por grupo» ni la tarjeta del grupo.
    expect(t).not.toContain('Por grupo');
    expect(botones(r).some(b => b.includes('Abrir el semáforo del grupo'))).toBe(false);
  });

  it('volver desde el grupo sale a Hoy; desde una persona vuelve al grupo', async () => { // spec 056 FR-046
    mockTabla.mockResolvedValue(LISTA);
    const onSalir = jest.fn();
    const r = await montarEnElGrupo(onSalir);

    await tocar(r, 'Abrir la ficha de Ana Pérez');
    expect(textos(r)).toContain('FICHA DE LA PERSONA');
    await atras(); // persona → grupo
    expect(onSalir).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Ana Pérez');

    await atras(); // grupo → Hoy
    expect(onSalir).toHaveBeenCalledTimes(1);
  });

  it('abierta sin grupo —el aviso del sábado— sigue empezando en el resumen de siempre', async () => {
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    expect(textos(r)).toContain('Por grupo');
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
  it('tocar un grupo lista a sus personas; la que no se mide dice «No se mide en el semáforo» y su %', async () => { // spec 056 FR-012
    mockTabla.mockResolvedValue(LISTA);
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    expect(mockTabla).toHaveBeenCalledWith('g1', null);
    const t = textos(r);
    expect(t).toContain('Ana Pérez');
    expect(t).toContain('No se mide en el semáforo · 88 %');
  });

  it('un grupo sin nadie dice «Este grupo todavía no tiene aprendices.»', async () => { // spec 056 FR-013
    mockTabla.mockResolvedValue({ ...LISTA, aprendices: [], resumen: { verde: 0, amarillo: 0, rojo: 0, sinDatos: 0, total: 0 } });
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    expect(textos(r)).toContain('Este grupo todavía no tiene aprendices.');
  });

  it('si la lista no carga lo dice con «Reintentar»; no deja la pantalla en blanco', async () => { // spec 056 FR-042
    mockTabla.mockRejectedValue(new Error('boom'));
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    expect(textos(r)).toContain('No pudimos cargar');
    expect(r.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(h => (h.type as unknown) === 'Text').some(h => React.Children.toArray(h.props.children).join('') === 'Reintentar')).length).toBeGreaterThan(0);
  });

  it('tocar a una persona abre su ficha de la 055 con origen líder y el grupo desde el que se abrió', async () => { // spec 056 FR-014
    mockTabla.mockResolvedValue(LISTA);
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]));
    await tocar(r, 'Abrir el semáforo del grupo');
    await tocar(r, 'Abrir la ficha de Ana Pérez');
    expect(ultimasPropsDeLaFicha?.origen).toEqual({ quien: 'lider', grupoId: 'g1' });
    expect(ultimasPropsDeLaFicha?.alumno.participanteId).toBe('u1');
    expect(ultimasPropsDeLaFicha?.rotuloDeVolver).toBe('Fénix');
  });
});

describe('el retroceso del sistema sube un nivel a la vez', () => {
  it('persona → grupo → resumen → Hoy', async () => { // spec 056 FR-046
    mockTabla.mockResolvedValue(LISTA);
    const onSalir = jest.fn();
    const r = await montar(resumen([grupo('g1', 'Fénix', true)]), onSalir);
    await tocar(r, 'Abrir el semáforo del grupo');
    await tocar(r, 'Abrir la ficha de Ana Pérez');
    expect(textos(r)).toContain('FICHA DE LA PERSONA');

    await atras(); // persona → grupo
    expect(textos(r)).toContain('Ana Pérez');
    expect(textos(r)).not.toContain('FICHA DE LA PERSONA');

    await atras(); // grupo → resumen
    expect(textos(r)).toContain('Todos los grupos');
    expect(onSalir).not.toHaveBeenCalled();

    await atras(); // resumen → Hoy
    expect(onSalir).toHaveBeenCalledTimes(1);
  });
});
