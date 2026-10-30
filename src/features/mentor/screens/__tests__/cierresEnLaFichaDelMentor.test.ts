import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { SemanaAlumnoApi } from '../../api/mentorSchemas';
import { alumnoDesdeLaInfo } from '../../utils/alumnoDesdeLaInfo';
import type { CargarCierres } from '../../../cierre/types/cierre.types';

/**
 * «Cierres del día» en la ficha del mentor (spec 017): debajo del tiempo libre, con la ruta del mentor
 * (`/mentor/groups/{g}/learners/{u}/cierres`) y una función de carga estable por persona. Sin grupo no hay a quién
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
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { TiempoLibreDeLaSemana: () => R.createElement('SeccionDeHuecos') };
});
jest.mock('../../../huecos/api/huecosApi', () => ({ obtenerHuecosDeAlumno: jest.fn(), obtenerHuecosDePersona: jest.fn() }));
const mockCierres = jest.fn();
jest.mock('../../../cierre/components/CierresDelDia', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { CierresDelDia: (props: object) => (mockCierres(props), R.createElement('SeccionDeCierres')) };
});
const mockCierresApi = jest.fn<(grupoId: string, alumnoId: string, semana?: string | null) => Promise<unknown>>();
jest.mock('../../../cierre/api/cierreApi', () => ({
  obtenerCierresDeAlumno: (g: string, a: string, s?: string | null) => mockCierresApi(g, a, s),
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

const ultimaCarga = () => (mockCierres.mock.calls.at(-1)?.[0] as { cargar: CargarCierres | null }).cargar;

beforeEach(() => {
  mockRadar.mockReset();
  mockCierres.mockReset();
  mockCierresApi.mockReset().mockResolvedValue({});
});

describe('«Cierres del día» en la ficha del mentor', () => {
  it('va debajo del tiempo libre, que va debajo del Código Renaser', async () => {
    const r = await montar();
    const marcas = r.root.findAll(n => n.type === 'SeccionDelRadar' || n.type === 'SeccionDeHuecos' || n.type === 'SeccionDeCierres').map(n => n.type);
    expect(marcas).toEqual(['SeccionDelRadar', 'SeccionDeHuecos', 'SeccionDeCierres']);
  });

  it('carga por la ruta del mentor, con el grupo y la persona; sin semana pide la en curso', async () => {
    await montar();
    const cargar = ultimaCarga();
    expect(cargar).toEqual(expect.any(Function));
    await cargar!('2026-10-19');
    expect(mockCierresApi).toHaveBeenLastCalledWith('g-7', 'a-1', '2026-10-19');
    await cargar!();
    expect(mockCierresApi).toHaveBeenLastCalledWith('g-7', 'a-1', undefined);
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
    expect(mockCierresApi).not.toHaveBeenCalled();
  });
});
