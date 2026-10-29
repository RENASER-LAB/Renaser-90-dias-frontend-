import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { SemanaAlumnoApi } from '../../../mentor/api/mentorSchemas';
import type { CargarHuecos } from '../../../huecos/types/huecos.types';

/**
 * «Tiempo libre de la semana» en la ficha de administración y del alquimista (spec 015): debajo del Código Renaser, por
 * la lectura del liderazgo (`/leadership/groups/{g}/people/{p}/huecos`) con el grupo de la persona, y una función de
 * carga estable por persona. Sin grupo no hay a quién preguntarle.
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
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({ HojaDesdeAbajo: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('../../../lider-mentores/components/ReproductorDeAudio', () => ({ ReproductorDeAudio: () => null }));
jest.mock('../../../academy/components/LeccionVideoPlayer', () => ({ LeccionVideoPlayer: () => null }));
jest.mock('../../../lider-mentores/components/VisorDePublicacion', () => ({ VerPublicacion: () => null }));
jest.mock('../../../mentor/components/RejillaSemanal', () => ({ RejillaSemanal: () => null }));
jest.mock('../../../semaforo/components/TarjetaSemaforoDeAprendiz', () => ({ TarjetaSemaforoDeAprendiz: () => null }));
jest.mock('../../../caja/components/ChipDeCaja', () => ({ ChipDeCaja: () => null }));
jest.mock('../../../chat/api/chatApi', () => ({ abrirConversacionDirecta: jest.fn() }));
jest.mock('../../api/adminApi', () => ({ recuperarCuentaDePersona: jest.fn() }));
jest.mock('../../utils/dialogo', () => ({ avisar: jest.fn() }));
jest.mock('../CambiarDiaScreen', () => ({ CambiarDiaScreen: () => null }));
jest.mock('../EliminarCuentaAdminScreen', () => ({ EliminarCuentaAdminScreen: () => null }));
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin-1', role: 'ADMIN' } }) }));
jest.mock('../../hooks/useDetalleAprendiz', () => ({
  useDetalleAprendiz: () => ({ detalle: null, ultimoAjuste: null, quienAjusto: null, cargando: false, fallo: null, recargar: async () => undefined }),
}));
jest.mock('../../hooks/useSemanaAdministrativa', () => ({
  useSemanaAdministrativa: () => ({
    semana: { dias: [], cobertura: 'SIN_DATOS' } as unknown as SemanaAlumnoApi,
    sinDatos: true,
    cargando: false,
    fallo: null,
    desplazar: () => undefined,
    recargar: async () => undefined,
  }),
}));
jest.mock('../../../lider-mentores/api/cumplimientoDelLiderApi', () => ({
  leerEvidencia: jest.fn(),
  obtenerPublicacion: jest.fn(),
  obtenerRadarDePersona: jest.fn(),
}));

/* Las dos secciones de la ficha se vuelven una marca: importa el ORDEN y con qué `cargar` se montan. */
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

import { FichaAprendizScreen } from '../FichaAprendizScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function pantalla(cellId: string | null) {
  return React.createElement(FichaAprendizScreen, {
    aprendiz: { id: 'a-1', fullName: 'Ana Pérez', cellId },
    onVolver: () => undefined,
  });
}

async function montar(cellId: string | null = 'c-3'): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(pantalla(cellId));
  });
  return r;
}

const ultimaCarga = () => (mockTiempoLibre.mock.calls.at(-1)?.[0] as { cargar: CargarHuecos | null }).cargar;

beforeEach(() => {
  mockTiempoLibre.mockReset();
  mockHuecos.mockReset().mockResolvedValue({});
});

describe('«Tiempo libre de la semana» en la ficha de administración', () => {
  it('va debajo del Código Renaser', async () => {
    const r = await montar();
    const marcas = r.root.findAll(n => n.type === 'SeccionDelRadar' || n.type === 'SeccionDeHuecos').map(n => n.type);
    expect(marcas).toEqual(['SeccionDelRadar', 'SeccionDeHuecos']);
  });

  it('carga por la lectura del liderazgo, con el grupo de la persona y su id; sin semana pide la en curso', async () => {
    await montar('c-3');
    const cargar = ultimaCarga();
    expect(cargar).toEqual(expect.any(Function));
    await cargar!('2026-10-19');
    expect(mockHuecos).toHaveBeenLastCalledWith('c-3', 'a-1', '2026-10-19');
    await cargar!();
    expect(mockHuecos).toHaveBeenLastCalledWith('c-3', 'a-1', undefined);
  });

  it('la función de carga es la misma en cada dibujo de la ficha: es la llave de lo que la sección guarda', async () => {
    const r = await montar('c-3');
    const primera = ultimaCarga();
    await act(async () => {
      r.update(pantalla('c-3'));
      r.update(pantalla('c-3'));
    });
    expect(ultimaCarga()).toBe(primera);
  });

  it('sin grupo (la persona no tiene) no hay a quién preguntarle: la sección recibe `null`', async () => {
    await montar(null);
    expect(ultimaCarga()).toBeNull();
    expect(mockHuecos).not.toHaveBeenCalled();
  });
});
