/**
 * Regla del dueño (spec 014): en un día anterior NO se monta ningún componente de registro. Esta prueba monta la
 * pantalla de Training de verdad —con sus datos y sus hooks reemplazados por dobles— y mira qué registros hay en el árbol:
 *
 * - hoy (y un día que viene): la cámara con «¿Qué sentiste?», la hoja de evidencia, la Pastilla y la Clase están montadas;
 * - un día anterior: no está ninguna, y al volver a hoy vuelven;
 * - al pasar a un día anterior se cierra lo que haya quedado abierto de un registro.
 *
 * El cuerpo (`TrainingPorHora`) se reemplaza por un doble que solo deja elegir el día: lo que hace con cada fila
 * lo prueba `features/training/components/__tests__/diaAnteriorSinRegistro.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ setParams: () => undefined }),
  useRoute: () => ({ params: undefined }),
}));
jest.mock('../../navigation/navegacionRef', () => ({ irAPestana: () => true, navegacionRef: {} }));
jest.mock('../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../hooks/useMedicionDePantalla', () => ({ useMedicionDePantalla: () => undefined }));
jest.mock('../../features/auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'TRAINEE' } }) }));
jest.mock('../../features/plataforma/estado/useFuncionalidad', () => ({
  useFuncionalidad: () => ({ disponible: true, prendida: true, aviso: null }),
  useAlVolverAPrenderse: () => undefined,
}));

const mockHoy = '2026-10-29';
/** Las mismas listas en cada dibujo: la pantalla las copia a su estado y una lista nueva cada vez la haría repetirse. */
const mockSinHabitos: never[] = [];
jest.mock('../../features/training/hooks/useTraining', () => ({
  useTraining: () => ({
    habits: mockSinHabitos,
    planHabits: mockSinHabitos,
    loading: false,
    error: null,
    recargar: async () => undefined,
    fechaDeHoy: mockHoy,
  }),
}));
jest.mock('../../features/programa/hooks/useProgramaDia', () => ({
  useProgramaDia: () => ({ diaPrograma: 10, fase: null, inscrito: true, loading: false, recargar: async () => undefined }),
}));
jest.mock('../../features/programa/hooks/useArranqueDelPrograma', () => ({
  ...(jest.requireActual('../../features/programa/hooks/useArranqueDelPrograma') as object),
  useArranqueDelPrograma: () => ({ estado: 'ACTIVO' }),
}));
jest.mock('../../features/mentor/hooks/useProgramaPersonal', () => ({
  useProgramaPersonal: () => ({ puedeActivar: false, cargando: false, error: false, recargar: () => undefined }),
}));
const mockCerrarRegistroConFoto = jest.fn();
jest.mock('../../features/habits/hooks/useRegistroConFoto', () => ({
  useRegistroConFoto: () => ({
    abierto: false,
    cerrar: mockCerrarRegistroConFoto,
    modal: {},
    iniciar: async () => undefined,
    reanudarPendiente: async () => undefined,
  }),
}));
jest.mock('../../features/spirit/hooks/useEspiritu', () => ({
  useEspiritu: () => ({ diaEnCurso: null, diaEntregadoHoy: null, cargando: false, error: null, enviando: false, errorEnvio: null, limpiarError: () => undefined, recargar: async () => undefined }),
}));
jest.mock('../../features/academy/hooks/useClaseDiaria', () => ({
  useClaseDiaria: () => ({ clase: null, cargando: false, error: null, enviando: false, errorEnvio: null, abrir: async () => null, limpiar: () => undefined, enviarResumen: async () => true }),
}));
jest.mock('../../features/habits/hooks/useRenombreDeHabito', () => ({
  useRenombreLocal: () => ({ titulos: {}, renombrar: async () => undefined, quitarRenombre: async () => undefined }),
}));

/** Los cuatro registros: cada uno es un doble que se deja ver en el árbol con su nombre. */
const doble = (nombre: string) => () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return React.createElement(View, { testID: `registro-${nombre}` });
};
jest.mock('../../features/habits/components/EvidenciaHabitoModal', () => ({ EvidenciaHabitoModal: doble('evidencia') }));
jest.mock('../../features/habits/components/RegistroConFotoModal', () => ({ RegistroConFotoModal: doble('camara') }));
jest.mock('../../features/spirit/components/PastillaRenacerModal', () => ({ PastillaRenacerModal: doble('pastilla') }));
jest.mock('../../features/academy/components/ClaseDiariaModal', () => ({ ClaseDiariaModal: doble('clase') }));
jest.mock('../../features/training/components/PracticasDeTraining', () => ({ PracticasDeTraining: () => null }));

/** El cuerpo: un doble que anota sus props, para elegir el día como lo haría la pastilla de la semana. */
const mockCuerpo: { props: { onElegirDia: (iso: string | null) => void; diaElegido: string | null } | null } = { props: null };
jest.mock('../../features/training/components/TrainingPorHora', () => ({
  TrainingPorHora: (props: { onElegirDia: (iso: string | null) => void; diaElegido: string | null }) => {
    mockCuerpo.props = props;
    return null;
  },
}));

import TrainingScreen from '../TrainingScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
const REGISTROS = ['evidencia', 'camara', 'pastilla', 'clase'];
const montados = () => REGISTROS.filter(nombre => raiz!.root.findAll(n => n.props.testID === `registro-${nombre}`).length > 0);
const elegir = (iso: string | null) => act(async () => { mockCuerpo.props!.onElegirDia(iso); });

beforeEach(() => {
  mockCuerpo.props = null;
  mockCerrarRegistroConFoto.mockReset();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

async function montar() {
  await act(async () => { raiz = TestRenderer.create(React.createElement(TrainingScreen)); });
}

describe('Training: los registros solo existen fuera de un día anterior', () => {
  it('hoy están los cuatro (la línea base)', async () => {
    await montar();
    expect(mockCuerpo.props).not.toBeNull();
    expect(montados()).toEqual(REGISTROS);
  });

  it('en un día anterior no se monta NINGUNO: ni la cámara, ni la evidencia, ni la Pastilla, ni la Clase', async () => {
    await montar();
    await elegir('2026-10-28');
    expect(mockCuerpo.props!.diaElegido).toBe('2026-10-28');
    expect(montados()).toEqual([]);
    await elegir('2026-10-26');
    expect(montados()).toEqual([]);
  });

  it('al volver a hoy vuelven a estar', async () => {
    await montar();
    await elegir('2026-10-27');
    expect(montados()).toEqual([]);
    await elegir(null);
    expect(montados()).toEqual(REGISTROS);
  });

  it('un día que viene no es un día anterior: los registros siguen montados (y la lista no ofrece ninguno)', async () => {
    await montar();
    await elegir('2026-10-30');
    expect(montados()).toEqual(REGISTROS);
  });

  it('al pasar a un día anterior se cierra lo que haya quedado abierto de la cámara', async () => {
    await montar();
    await elegir('2026-10-28');
    expect(mockCerrarRegistroConFoto).toHaveBeenCalledTimes(1);
  });

  it('elegir hoy no cierra nada', async () => {
    await montar();
    await elegir(null);
    expect(mockCerrarRegistroConFoto).not.toHaveBeenCalled();
  });
});
