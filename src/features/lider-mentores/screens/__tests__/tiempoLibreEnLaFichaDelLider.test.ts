import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { CargarHuecos } from '../../../huecos/types/huecos.types';
import type { SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * «Tiempo libre de la semana» en la ficha del líder de mentores (spec 015), que Administración y Alquimista usan igual:
 * debajo del Código Renaser, por `/leadership/groups/{g}/people/{p}/huecos`, y una función de carga estable por persona
 * que NO cambia al moverse por las semanas de arriba (la sección tiene las suyas y guarda lo que lee).
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
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../academy/components/LeccionVideoPlayer', () => ({ LeccionVideoPlayer: () => null }));
jest.mock('../../components/ReproductorDeAudio', () => ({ ReproductorDeAudio: () => null }));
jest.mock('../../../../components/ConfirmacionEnLinea', () => ({ ConfirmacionEnLinea: () => null }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: () => undefined, seleccion: () => undefined } }));
jest.mock('../../../admin/utils/dialogo', () => ({ avisar: jest.fn() }));

const mockSemana = jest.fn<(grupoId: string, personaId: string, semanaHasta?: string | null) => Promise<SemanaDePersona>>();
jest.mock('../../api/cumplimientoDelLiderApi', () => ({
  obtenerSemanaDePersona: (g: string, p: string, s?: string | null) => mockSemana(g, p, s),
  obtenerTablaDelLider: jest.fn(),
  obtenerRadarDePersona: jest.fn(),
}));
jest.mock('../../api/liderMentoresApi', () => ({ registrarObservacion: jest.fn() }));
jest.mock('../../utils/irAlChat', () => ({ escribirleA: jest.fn(), enviarPorChat: jest.fn() }));

jest.mock('../../../mentor/components/CodigoRenaserDelAlumno', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { CodigoRenaserDelAlumno: () => R.createElement('SeccionDelRadar') };
});
const mockTiempoLibre = jest.fn();
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { TiempoLibreDeLaSemana: (props: object) => (mockTiempoLibre(props), R.createElement('SeccionDeHuecos')) };
});
const mockHuecos = jest.fn<(grupoId: string, personaId: string, semana?: string | null) => Promise<unknown>>();
jest.mock('../../../huecos/api/huecosApi', () => ({
  obtenerHuecosDePersona: (g: string, p: string, s?: string | null) => mockHuecos(g, p, s),
}));

import { PersonaDelLiderScreen } from '../PersonaDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SEMANA: SemanaDePersona = {
  grupoId: 'g1',
  personaId: 'u1',
  nombre: 'Ana Pérez',
  avatarUrl: null,
  rol: 'TRAINEE',
  desde: '2026-10-12',
  hasta: '2026-10-18',
  zona: 'America/Lima',
  semanaEnCurso: true,
  cerrada: false,
  primeraSemana: '2026-08-29',
  mentor: { id: 'm1', nombre: 'Luisa' },
  resumen: null,
  color: 'AMARILLO',
  etiqueta: null,
  noSeMide: false,
  porcentaje: 74.5,
  dias: [],
};

function pantalla(grupoId = 'g1', personaId = 'u1') {
  return React.createElement(PersonaDelLiderScreen, {
    grupoId,
    grupoNombre: 'Fénix',
    personaId,
    nombre: 'Ana Pérez',
    avatarUrl: null,
    onVolver: () => undefined,
  });
}

async function montar(grupoId = 'g1', personaId = 'u1'): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(pantalla(grupoId, personaId));
  });
  return r;
}

const ultimaCarga = () => (mockTiempoLibre.mock.calls.at(-1)?.[0] as { cargar: CargarHuecos }).cargar;

beforeEach(() => {
  mockTiempoLibre.mockReset();
  mockSemana.mockReset().mockResolvedValue(SEMANA);
  mockHuecos.mockReset().mockResolvedValue({});
});

describe('«Tiempo libre de la semana» en la ficha del líder', () => {
  it('va debajo del Código Renaser', async () => {
    const r = await montar();
    const marcas = r.root.findAll(n => n.type === 'SeccionDelRadar' || n.type === 'SeccionDeHuecos').map(n => n.type);
    expect(marcas).toEqual(['SeccionDelRadar', 'SeccionDeHuecos']);
  });

  it('carga por la lectura del liderazgo, con el grupo y la persona; sin semana pide la en curso', async () => {
    await montar('g1', 'u1');
    const cargar = ultimaCarga();
    await cargar('2026-10-19');
    expect(mockHuecos).toHaveBeenLastCalledWith('g1', 'u1', '2026-10-19');
    await cargar();
    expect(mockHuecos).toHaveBeenLastCalledWith('g1', 'u1', undefined);
  });

  it('la función de carga es la misma en cada dibujo, también cuando la ficha de arriba llega con su semana', async () => {
    const r = await montar();
    const primera = ultimaCarga();
    await act(async () => {
      r.update(pantalla());
      r.update(pantalla());
    });
    expect(ultimaCarga()).toBe(primera);
    /* La lectura de la semana de arriba terminó (mockSemana resolvió) y la sección no se enteró. */
    expect(new Set(mockTiempoLibre.mock.calls.map(c => (c[0] as { cargar: unknown }).cargar)).size).toBe(1);
  });

  it('otra persona es otra función de carga', async () => {
    const r = await montar('g1', 'u1');
    const primera = ultimaCarga();
    await act(async () => {
      r.update(pantalla('g1', 'u2'));
    });
    expect(ultimaCarga()).not.toBe(primera);
  });
});
