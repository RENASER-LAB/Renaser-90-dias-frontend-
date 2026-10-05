/**
 * E-516 (2026-10-05): en Comunidad → Eventos, con la lista desplazada (encabezado y barra
 * escondidos), abrir un evento dejaba el encabezado escondido encima del relleno de arriba: un hueco
 * negro de su alto (~400 px en el Pixel 6) y la barra de pestañas escondida. El detalle no se
 * desplaza, así que no había gesto que los devolviera; volver a la lista repetía lo mismo.
 *
 * La causa: la sección usa UNA instancia de `useOcultarBarraAlDesplazar` para sus cuatro vistas
 * (lista, detalle, formulario, «Mi agenda») sin decirle cuál se ve. En Android el `ScrollView` de
 * la vista nueva se monta de cero —poner o quitar el `RefreshControl` cambia lo que lo envuelve— y
 * arranca arriba SIN avisar ningún `onScroll`, que es lo único que movía al encabezado.
 *
 * Se prueba la sección de verdad, con el proveedor de la barra y el hook del encabezado como los usa
 * Comunidad; los hijos pesados (calendario, detalle, agenda) son dobles que solo exponen sus props.
 * Contra el código anterior fallan las tres primeras: el encabezado se quedaba en −ALTO y la barra
 * escondida.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Keyboard, ScrollView } from 'react-native';

import type { Evento, Ocurrencia } from '../../types/eventos.types';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'dark', c: tokens.dark, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('@react-navigation/native', () => ({ useFocusEffect: () => undefined }));
jest.mock('../../../../services/http/apiClient', () => ({ ApiError: class extends Error {}, mensajeDeError: () => '' }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: () => undefined } }));
jest.mock('../../../../components/Icon', () => ({ Icon: () => null }));
jest.mock('../../../../components/Legible', () => ({ BotonPrincipal: () => null, BotonSecundario: () => null }));
jest.mock('../../api/eventosApi', () => ({ obtenerEvento: () => new Promise(() => undefined) }));
jest.mock('../../utils/portadaDelEvento', () => ({ subirPortada: async () => undefined }));
jest.mock('../../utils/vistaPreferida', () => ({
  VISTA_POR_DEFECTO: 'calendario',
  leerVistaPreferida: async () => 'calendario',
  guardarVistaPreferida: async () => undefined,
}));
jest.mock('../../hooks/useEventos', () => ({
  useEventos: () => ({
    ocurrencias: [mockOcurrencia],
    cargando: false,
    refrescando: false,
    fallo: null,
    yaLeido: true,
    recargar: mockSinEfecto,
    responder: mockSinEfecto,
    quitarDeLaLista: mockSinEfecto,
  }),
}));
jest.mock('../../hooks/useEventosDelMes', () => ({
  useEventosDelMes: () => ({
    ocurrencias: [mockOcurrencia],
    cargando: false,
    fallo: null,
    recargar: mockSinEfecto,
    marcarAsistencia: mockSinEfecto,
  }),
}));
jest.mock('../CalendarioDelMes', () => ({ CalendarioDelMes: () => null }));
jest.mock('../TarjetasDeEventos', () => ({ TarjetasDeEventos: () => null }));
jest.mock('../DetalleDelEvento', () => ({ DetalleDelEvento: () => null }));
jest.mock('../FormularioDelEvento', () => ({ FormularioDelEvento: () => null }));
jest.mock('../MiAgenda', () => ({ MiAgenda: () => null }));
jest.mock('../SelectorDeVista', () => ({ SelectorDeVista: () => null }));
jest.mock('../piezas', () => ({ LETRA: { cuerpo: 16 }, Parrafo: () => null }));

import { BotonSecundario } from '../../../../components/Legible';
import {
  BarraInferiorProvider,
  useBarraInferior,
  type BarraInferior,
} from '../../../../navigation/barraAlDesplazar/BarraInferior';
import { useEncabezadoAlDesplazar } from '../../../../navigation/barraAlDesplazar/useEncabezadoAlDesplazar';
import { CalendarioDelMes } from '../CalendarioDelMes';
import { DetalleDelEvento } from '../DetalleDelEvento';
import { MiAgenda } from '../MiAgenda';
import { SeccionEventos } from '../SeccionEventos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockSinEfecto = async () => null;
const EVENTO: Evento = {
  id: 'ev-1',
  titulo: 'Evento semanal E2E',
  descripcion: null,
  portadaUrl: null,
  iniciaEn: '2026-10-06T01:00:00Z',
  duracionMinutos: 60,
  zona: 'America/Lima',
  tipoUbicacion: 'LINK',
  valorUbicacion: 'https://meet.google.com/abc-defg-hij',
  tipoEvento: 'ESPONTANEO',
  reglasDeAviso: null,
  notificarAlCrear: false,
  recurrente: false,
  creadoPor: null,
  audiencia: null,
  rolesDestino: [],
};
const mockOcurrencia: Ocurrencia = {
  evento: EVENTO,
  inicioOcurrencia: EVENTO.iniciaEn,
  iniciaEn: EVENTO.iniciaEn,
  duracionMinutos: 60,
  titulo: EVENTO.titulo,
  asistencia: null,
};

/** El encabezado de Comunidad del Pixel 6: 154 de alto, la fila de secciones a 70 del tope. */
const ALTO = 154;

let barra: BarraInferior | null = null;
let encabezado: ReturnType<typeof useEncabezadoAlDesplazar> | null = null;
const volverRef: { current: (() => boolean) | null } = { current: null };

function Comunidad() {
  barra = useBarraInferior();
  encabezado = useEncabezadoAlDesplazar({ disponible: true, conFila: true });
  return React.createElement(SeccionEventos, {
    userId: 'u-1',
    rol: 'TRAINEE',
    eventoPedido: null,
    onEventoPedidoAtendido: () => undefined,
    volverRef,
    alDesplazar: encabezado.alDesplazar,
    rellenoDelEncabezado: encabezado.relleno,
  });
}

const evento = (y: number) =>
  ({ nativeEvent: { contentOffset: { x: 0, y }, contentSize: { width: 412, height: 3000 }, layoutMeasurement: { width: 412, height: 765 } } }) as never;
const layout = (y: number, height: number) => ({ nativeEvent: { layout: { x: 0, y, width: 412, height } } }) as never;

let raiz: ReactTestRenderer;
const deTipo = (tipo: unknown) => raiz.root.findAll(n => n.type === tipo);
/** El único elemento de ese tipo que se ve ahora (la sección dibuja una sola vista a la vez). */
function uno(tipo: unknown) {
  const hallados = deTipo(tipo);
  expect(hallados).toHaveLength(1);
  return hallados[0];
}

async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(BarraInferiorProvider, null, React.createElement(Comunidad)));
  });
  barra!.altoQueGana.value = 77;
  act(() => {
    encabezado!.medir.encabezado(layout(0, ALTO));
    encabezado!.medir.bloqueDeSecciones(layout(30, 124));
    encabezado!.medir.fila(layout(46, 64));
  });
}

/** La lista que se ve ahora (la sección dibuja una sola a la vez). */
const desplazar = (...ys: number[]) =>
  act(() => ys.forEach(y => (uno(ScrollView).props.onScroll as (e: never) => void)(evento(y))));
const subio = () => encabezado!.desplazamiento.value;
const escondida = () => barra!.escondida.value;

/** Con la lista bajada: encabezado y barra escondidos, como en la captura del dueño. */
async function listaDesplazada() {
  await montar();
  desplazar(0, 100, 200, 300);
  expect(subio()).toBe(-ALTO);
  expect(escondida()).toBe(1);
}

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  (Keyboard as unknown as { isVisible: () => boolean }).isVisible = () => false;
});
afterEach(() => {
  act(() => raiz?.unmount());
  jest.restoreAllMocks();
  barra = encabezado = null;
});

describe('Eventos: el encabezado de Comunidad al cambiar de vista (E-516)', () => {
  it('abrir un evento con la lista desplazada devuelve el encabezado completo y la barra', async () => {
    await listaDesplazada();
    act(() => uno(CalendarioDelMes).props.onAbrir(mockOcurrencia));
    expect(deTipo(DetalleDelEvento)).toHaveLength(1);
    expect(subio()).toBe(0);
    expect(escondida()).toBe(0);
  });

  it('volver a la lista desde un evento desplazado también lo devuelve', async () => {
    await listaDesplazada();
    act(() => uno(CalendarioDelMes).props.onAbrir(mockOcurrencia));
    desplazar(0, 100, 200, 300);
    expect(subio()).toBe(-ALTO);
    act(() => uno(DetalleDelEvento).props.onVolver());
    expect(deTipo(CalendarioDelMes)).toHaveLength(1);
    expect(subio()).toBe(0);
    expect(escondida()).toBe(0);
  });

  it('abrir «Mi agenda» con la lista desplazada también lo devuelve', async () => {
    await listaDesplazada();
    const miAgenda = deTipo(BotonSecundario).find(b => b.props.etiqueta === 'Mi agenda')!;
    act(() => miAgenda.props.onPress());
    expect(deTipo(MiAgenda)).toHaveLength(1);
    expect(subio()).toBe(0);
    expect(escondida()).toBe(0);
  });

  it('dentro de una misma vista, bajar lo sigue escondiendo y subir arriba lo devuelve', async () => {
    await listaDesplazada();
    act(() => uno(CalendarioDelMes).props.onAbrir(mockOcurrencia));
    act(() => uno(DetalleDelEvento).props.onVolver());
    desplazar(0, 100, 200, 300);
    expect(subio()).toBe(-ALTO);
    expect(escondida()).toBe(1);
    desplazar(200, 100, 10);
    expect(subio()).toBe(0);
    expect(escondida()).toBe(0);
  });
});
