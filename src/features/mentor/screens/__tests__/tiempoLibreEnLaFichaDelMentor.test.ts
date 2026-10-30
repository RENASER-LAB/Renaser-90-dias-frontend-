import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { SemanaAlumnoApi } from '../../api/mentorSchemas';
import { alumnoDesdeLaInfo } from '../../utils/alumnoDesdeLaInfo';
import type { CargarHuecos } from '../../../huecos/types/huecos.types';

/**
 * «Tiempo libre de la semana» en la ficha del mentor (spec 015): debajo del Código Renaser, con la ruta del mentor
 * (`/mentor/groups/{g}/learners/{u}/huecos`) y una función de carga estable por persona. Sin grupo no hay a quién
 * preguntarle.
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
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: () => true }));
jest.mock('../../../../components/Aparicion', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Aparicion: ({ children }: { children: React.ReactNode }) => R.createElement(View, null, children) };
});
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({ HojaDesdeAbajo: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('../../../lider-mentores/components/ReproductorDeAudio', () => ({ ReproductorDeAudio: () => null }));
jest.mock('../../../academy/components/LeccionVideoPlayer', () => ({ LeccionVideoPlayer: () => null }));
jest.mock('../../../lider-mentores/components/VisorDePublicacion', () => ({ VerPublicacion: () => null }));
jest.mock('../../components/RejillaSemanal', () => ({ RejillaSemanal: () => null }));
jest.mock('../../components/HabitosDelAlumno', () => ({ HabitosDelAlumno: () => null }));
jest.mock('../../../semaforo/components/TarjetaSemaforoDeAprendiz', () => ({ TarjetaSemaforoDeAprendiz: () => null }));
jest.mock('../../../caja/components/ChipDeCaja', () => ({ ChipDeCaja: () => null }));
jest.mock('../../../chat/api/chatApi', () => ({ abrirConversacionDirecta: jest.fn() }));
jest.mock('../../../lider-mentores/api/cumplimientoDelLiderApi', () => ({ leerEvidencia: jest.fn(), obtenerPublicacion: jest.fn() }));
jest.mock('../../hooks/useSemanaDelAlumno', () => ({
  useSemanaDelAlumno: () => ({
    semana: { dias: [], cobertura: 'SIN_DATOS' } as unknown as SemanaAlumnoApi,
    diasConContenido: [],
    cargando: false,
    fallo: null,
    desplazar: () => undefined,
    recargar: async () => undefined,
  }),
}));

/* Las dos secciones de la ficha se vuelven una marca: importa el ORDEN y con qué `cargar` se montan. */
const mockRadar = jest.fn();
jest.mock('../../components/CodigoRenaserDelAlumno', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { CodigoRenaserDelAlumno: (props: object) => (mockRadar(props), R.createElement('SeccionDelRadar')) };
});
jest.mock('../../../cierre/components/CierresDelDia', () => ({ CierresDelDia: () => null }));
const mockTiempoLibre = jest.fn();
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { TiempoLibreDeLaSemana: (props: object) => (mockTiempoLibre(props), R.createElement('SeccionDeHuecos')) };
});
const mockHuecos = jest.fn<(grupoId: string, alumnoId: string, semana?: string | null) => Promise<unknown>>();
jest.mock('../../../huecos/api/huecosApi', () => ({
  obtenerHuecosDeAlumno: (g: string, a: string, s?: string | null) => mockHuecos(g, a, s),
}));

import { AlumnoScreen } from '../AlumnoScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alumno = alumnoDesdeLaInfo({ usuarioId: 'a-1', nombre: 'Ana Pérez' }, 'g-7', null);

function pantalla(grupoId: string | null) {
  return React.createElement(AlumnoScreen, { alumno, grupoId, onVolver: () => undefined });
}

async function montar(grupoId: string | null = 'g-7'): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(pantalla(grupoId));
  });
  return r;
}

const ultimaCarga = () => (mockTiempoLibre.mock.calls.at(-1)?.[0] as { cargar: CargarHuecos | null }).cargar;

beforeEach(() => {
  mockRadar.mockReset();
  mockTiempoLibre.mockReset();
  mockHuecos.mockReset().mockResolvedValue({});
});

describe('«Tiempo libre de la semana» en la ficha del mentor', () => {
  it('va debajo del Código Renaser', async () => {
    const r = await montar();
    const marcas = r.root.findAll(n => n.type === 'SeccionDelRadar' || n.type === 'SeccionDeHuecos').map(n => n.type);
    expect(marcas).toEqual(['SeccionDelRadar', 'SeccionDeHuecos']);
  });

  it('carga por la ruta del mentor, con el grupo y la persona; sin semana pide la en curso', async () => {
    await montar();
    const cargar = ultimaCarga();
    expect(cargar).toEqual(expect.any(Function));
    await cargar!('2026-10-19');
    expect(mockHuecos).toHaveBeenLastCalledWith('g-7', 'a-1', '2026-10-19');
    await cargar!();
    expect(mockHuecos).toHaveBeenLastCalledWith('g-7', 'a-1', undefined);
  });

  it('la función de carga es la misma en cada dibujo de la ficha: es la llave de lo que la sección guarda', async () => {
    const r = await montar();
    const primera = ultimaCarga();
    await act(async () => {
      r.update(pantalla('g-7'));
      r.update(pantalla('g-7'));
    });
    expect(ultimaCarga()).toBe(primera);
  });

  it('otra persona u otro grupo es otra función de carga', async () => {
    const r = await montar('g-7');
    const primera = ultimaCarga();
    await act(async () => {
      r.update(pantalla('g-8'));
    });
    expect(ultimaCarga()).not.toBe(primera);
  });

  it('sin grupo no hay a quién preguntarle: la sección recibe `null`', async () => {
    await montar(null);
    expect(ultimaCarga()).toBeNull();
    expect(mockHuecos).not.toHaveBeenCalled();
  });
});
