/**
 * Training (la pantalla de verdad, con sus datos y hooks reemplazados por dobles) en el CRUCE DE MEDIANOCHE y con el reloj
 * del teléfono distinto al del servidor (spec 014):
 *
 * - `hoyIso` sale de `fechaDeHoy` (el día que dice el servidor) y solo cae al reloj del teléfono si el servidor todavía
 *   no respondió (caso 5);
 * - al cambiar `hoyIso` (domingo → lunes con la app abierta) el día elegido vuelve a hoy y los registros que un día
 *   anterior tenía desmontados vuelven a montarse (caso 3);
 * - BUG CONOCIDO: `diaPrograma` y `fase` (`useProgramaDia`, que lee `/home`) NO se vuelven a leer al cambiar el día, así que
 *   Training sigue diciendo «Día N» de ayer y calcula mal el Día 1 hasta que se reinicia la app (caso 3 y 4).
 *
 * El cuerpo (`TrainingPorHora`) se reemplaza por un doble que anota sus props: lo que hace con ellas lo prueban
 * `features/training/components/__tests__/calendarioDeTraining.test.ts` y compañía.
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

/** El día de hoy que dice el servidor (`null` = todavía no respondió). Las pruebas lo cambian entre dibujos. */
const mockEstado: { hoy: string | null; diaPrograma: number } = { hoy: '2026-11-01', diaPrograma: 40 };
/** Las mismas listas en cada dibujo: la pantalla las copia a su estado y una lista nueva cada vez la haría repetirse. */
const mockSinHabitos: never[] = [];
jest.mock('../../features/training/hooks/useTraining', () => ({
  useTraining: () => ({
    habits: mockSinHabitos,
    planHabits: mockSinHabitos,
    loading: false,
    error: null,
    recargar: async () => undefined,
    fechaDeHoy: mockEstado.hoy,
  }),
}));
const mockRecargarDiaPrograma = jest.fn(async () => undefined);
jest.mock('../../features/programa/hooks/useProgramaDia', () => ({
  useProgramaDia: () => ({ diaPrograma: mockEstado.diaPrograma, fase: null, inscrito: true, loading: false, recargar: mockRecargarDiaPrograma }),
}));
jest.mock('../../features/programa/hooks/useArranqueDelPrograma', () => ({
  ...(jest.requireActual('../../features/programa/hooks/useArranqueDelPrograma') as object),
  useArranqueDelPrograma: () => ({ estado: 'ACTIVO' }),
}));
jest.mock('../../features/mentor/hooks/useProgramaPersonal', () => ({
  useProgramaPersonal: () => ({ puedeActivar: false, cargando: false, error: false, recargar: () => undefined }),
}));
jest.mock('../../features/habits/hooks/useRegistroConFoto', () => ({
  useRegistroConFoto: () => ({
    abierto: false,
    cerrar: () => undefined,
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

interface PropsDelCuerpo {
  hoyIso: string;
  diaElegido: string | null;
  diaPrograma: number | null;
  onElegirDia: (iso: string | null) => void;
}
const mockCuerpo: { props: PropsDelCuerpo | null } = { props: null };
jest.mock('../../features/training/components/TrainingPorHora', () => ({
  TrainingPorHora: (props: PropsDelCuerpo) => {
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
const dibujarDeNuevo = () => act(async () => { raiz!.update(React.createElement(TrainingScreen)); });
async function montar() {
  await act(async () => { raiz = TestRenderer.create(React.createElement(TrainingScreen)); });
}

beforeEach(() => {
  mockCuerpo.props = null;
  mockEstado.hoy = '2026-11-01';
  mockEstado.diaPrograma = 40;
  mockRecargarDiaPrograma.mockClear();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('caso 5 · el reloj del teléfono no manda: hoyIso sale de lo que dice el servidor', () => {
  it('RELOJ: con el teléfono en domingo 1/11 22:30 (Lima) y el servidor en lunes 2/11, la pantalla le da al cuerpo el lunes', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-02T03:30:00Z'));
    mockEstado.hoy = '2026-11-02';
    await montar();
    expect(mockCuerpo.props!.hoyIso).toBe('2026-11-02');
    expect(mockCuerpo.props!.diaElegido).toBeNull();
  });

  it('RELOJ: mientras el servidor no responde (fechaDeHoy = null) cae al día del teléfono, y cuando responde manda el del servidor', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-02T03:30:00Z')); // dom 1/11 en Lima
    mockEstado.hoy = null;
    await montar();
    expect(mockCuerpo.props!.hoyIso).toBe('2026-11-01');
    mockEstado.hoy = '2026-11-02';
    await dibujarDeNuevo();
    expect(mockCuerpo.props!.hoyIso).toBe('2026-11-02');
  });
});

describe('caso 3 · CRUCE DE MEDIANOCHE: domingo → lunes con la pantalla abierta', () => {
  it('MEDIANOCHE: al cambiar hoyIso el día elegido (un día anterior) vuelve a hoy y los registros vuelven a montarse', async () => {
    await montar();
    await elegir('2026-10-31'); // el sábado de la semana que termina
    expect(mockCuerpo.props!.diaElegido).toBe('2026-10-31');
    expect(montados()).toEqual([]);

    mockEstado.hoy = '2026-11-02'; // pasó la medianoche: el servidor ya dice lunes
    await dibujarDeNuevo();
    expect(mockCuerpo.props!.hoyIso).toBe('2026-11-02');
    expect(mockCuerpo.props!.diaElegido).toBeNull();
    expect(montados()).toEqual(REGISTROS);
  });

  it('MEDIANOCHE: aunque se haya elegido a mano el propio domingo (hoy), al llegar el lunes el día elegido vuelve a hoy', async () => {
    await montar();
    await elegir('2026-11-01'); // hoy elegido a mano (domingo)
    mockEstado.hoy = '2026-11-02';
    await dibujarDeNuevo();
    expect(mockCuerpo.props!.diaElegido).toBeNull();
  });

  it('MEDIANOCHE: dibujar de nuevo SIN cambiar de día no deshace el día que la persona eligió', async () => {
    await montar();
    await elegir('2026-10-29');
    for (let i = 0; i < 3; i++) await dibujarDeNuevo();
    expect(mockCuerpo.props!.diaElegido).toBe('2026-10-29');
  });

  /**
   * BUG CONOCIDO (no se arregla acá: es `TrainingScreen.tsx`, y `useProgramaDia`): `diaPrograma` y `fase` se leen de `/home`
   * una sola vez, al montar la pantalla (o al elegir el Día 1). Con la app abierta al pasar la medianoche, el Día N de ayer
   * se queda hasta reiniciar: la línea dice «Día 7 de 90» siendo el día 8, y `fechaDelDiaUno(hoyIso, diaPrograma)` corre un
   * día hacia adelante, así que en la semana del Día 1 el propio Día 1 se rotula «Tu programa empezó después de este día.»
   * y no se pide. La pantalla debería releer el día del programa cuando cambia `hoyIso`.
   * Arreglado (TrainingScreen relee `/home` al cambiar el día de hoy): ahora es un `it` normal.
   */
  it('CORREGIDO: al cambiar hoyIso la pantalla vuelve a leer el día del programa (useProgramaDia.recargar)', async () => {
    await montar();
    mockRecargarDiaPrograma.mockClear();
    mockEstado.hoy = '2026-11-02';
    await dibujarDeNuevo();
    expect(mockRecargarDiaPrograma).toHaveBeenCalled();
  });
});
