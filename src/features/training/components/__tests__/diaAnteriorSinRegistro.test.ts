/**
 * Regla del dueño (spec 014): en un día anterior NO se puede subir nada, y la persona «nunca debería llegar» a esa
 * opción. Se prueba con el cuerpo de Training montado de verdad (`TrainingPorHora`), el servidor reemplazado por un doble
 * que anota cada pedido:
 *
 * - en un día anterior no hay ✓, ni «Subir», ni hoja; tocar una fila solo dice «Ya hecho» o que ese día ya cerró;
 * - ninguna acción llama a un endpoint de escritura (`/complete`, `/evidence`, `/rocks/…`): todo es lectura;
 * - tocar el mismo día varias veces hace UN solo pedido, y abrir o enfocar Training no pide ningún día anterior.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import type { HabitItem } from '../../../../screens/TrainingScreen';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined },
}));

/** Cada pedido que sale de la app, con su método. */
const mockPedidos: { ruta: string; metodo: string }[] = [];
const mockRespuestas = new Map<string, unknown>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...(jest.requireActual('../../../../services/http/apiClient') as object),
  apiFetch: async (ruta: string, opciones?: { method?: string }) => {
    mockPedidos.push({ ruta, metodo: opciones?.method ?? 'GET' });
    for (const [parte, respuesta] of mockRespuestas) {
      if (ruta.includes(parte)) {
        if (respuesta instanceof Error) throw respuesta;
        return respuesta;
      }
    }
    return [];
  },
}));

import { ApiError } from '../../../../services/http/apiClient';
import { TrainingPorHora } from '../TrainingPorHora';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HOY = '2026-10-29'; // jueves
const AYER = '2026-10-28';

const registroDelServidor = (id: string, titulo: string, estado: string, hora: string) => ({
  id,
  habitoId: `h-${id}`,
  fechaEjecucion: AYER,
  diaPrograma: 5,
  tipoDia: 'TODOS',
  esOpcional: false,
  estado,
  puntosOtorgados: estado === 'COMPLETADO' ? 8 : 0,
  completadoEn: estado === 'COMPLETADO' ? '2026-10-28T11:12:00Z' : null,
  respuestaTexto: null,
  calificacionProductividad: null,
  guia: null,
  tituloHabito: titulo,
  tipoHabito: 'CHECKBOX',
  horaDisparo: hora,
  horaLimite: null,
  puntosEnJuego: null,
  puntosMaximos: null,
  plazoEvidencia: null,
  rachaDias: null,
});

const habito = (id: string, titulo: string, hora: string, extra: Partial<HabitItem> = {}): HabitItem => ({
  id,
  habitoId: `h-${id}`,
  dimension: 'CUERPO',
  title: titulo,
  time: hora,
  tag: 'Innegociable',
  streak: null,
  done: false,
  hasEvidence: false,
  tieneTrackHoy: true,
  estado: 'PENDIENTE',
  ...extra,
});

const onRegistrar = jest.fn<(h: HabitItem) => void>();
const onMarcar = jest.fn<(h: HabitItem) => void>();
const onAbrirEvento = jest.fn<(id: string) => void>();

let raiz: ReactTestRenderer | null = null;

/** El cuerpo de Training con el día elegido guardado en estado, como lo hace la pantalla. */
let numeroDeCuenta = 0;
function Envoltorio({ activa = true, cuenta }: { activa?: boolean; cuenta: string }) {
  const [dia, setDia] = React.useState<string | null>(null);
  return React.createElement(TrainingPorHora, {
    activa,
    estado: 'listo',
    mensajeDeError: null,
    onReintentar: () => undefined,
    cuentaId: cuenta,
    habits: [
      habito('ver', 'Agua tibia', '06:00'), // evidencia opcional: «Subir» y la hoja (sin círculo desde el 30/10)
      habito('foto', 'Ducha fría', '07:00', { evidenceRequirement: 'REQUIRED' }), // exige foto: «Subir»
    ],
    planHabits: [],
    hoyIso: HOY,
    diaElegido: dia,
    onElegirDia: setDia,
    diaPrograma: 40,
    fase: null,
    titulos: {},
    eventosPrendidos: true,
    confirmacion: null,
    onConfirmacionTerminada: () => undefined,
    aperturaPedida: null,
    onAperturaAtendida: () => undefined,
    onRegistrar,
    onMarcar,
    onAbrirEvento,
  });
}

/** Cada prueba es de una cuenta distinta: la memoria de la sesión es de toda la app y no debe pasar de una a otra. */
let cuentaActual = '';
async function montar(activa = true) {
  cuentaActual = `cuenta-de-la-prueba-${++numeroDeCuenta}`;
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Envoltorio, { activa, cuenta: cuentaActual }));
  });
}

/** El primer nodo (el más externo) de cada etiqueta: un mismo botón aparece como `Presionable`, `Pressable` y vista. */
const unicos = (nodos: ReactTestInstance[]) => {
  const vistos = new Set<string>();
  return nodos.filter(n => {
    const etiqueta = String(n.props.accessibilityLabel);
    if (vistos.has(etiqueta)) return false;
    vistos.add(etiqueta);
    return true;
  });
};
const tocables = (r: ReactTestRenderer) =>
  unicos(r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel));
const conEtiqueta = (r: ReactTestRenderer, parte: string): ReactTestInstance =>
  tocables(r).filter(n => String(n.props.accessibilityLabel).includes(parte))[0];
const pulsar = async (n: ReactTestInstance) => act(async () => { n.props.onPress(); });
const casillas = (r: ReactTestRenderer) =>
  unicos(r.root.findAll(n => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function'));
const hayModal = (r: ReactTestRenderer) =>
  r.root.findAll(n => (n.type as unknown) === 'Modal' || (n.type as { name?: string }).name === 'Modal').length > 0;
const textosDeNodos = (nodos: ReactTestInstance[]): string =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .join(' | ');
const textos = (r: ReactTestRenderer): string => textosDeNodos(r.root.findAll(() => true));
const pedidosDeDias = () => mockPedidos.filter(p => p.ruta.includes('/habit-tracks/day'));

beforeEach(() => {
  mockPedidos.length = 0;
  mockRespuestas.clear();
  onRegistrar.mockReset();
  onMarcar.mockReset();
  onAbrirEvento.mockReset();
  mockRespuestas.set('/habit-tracks/day?date=2026-10-28', [
    registroDelServidor('hecho', 'Agua tibia', 'COMPLETADO', '06:00:00'),
    registroDelServidor('no-hecho', 'Ducha fría', 'EXPIRADO', '07:00:00'),
  ]);
  mockRespuestas.set('/calendar/events', []);
  mockRespuestas.set('/habit-preferences', { habits: [] });
  mockRespuestas.set('/rocks/upcoming', { desde: HOY, hasta: '2026-11-01', rocas: [] });
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('HOY: lo que ofrece la lista (la línea base de las pruebas de abajo)', () => {
  it('los dos llevan «Subir» y ninguno el círculo (pedido del dueño, 30/10); tocar el que exige foto abre su registro', async () => {
    await montar();
    expect(casillas(raiz!)).toHaveLength(0);
    expect(textos(raiz!)).toContain('Subir');
    await pulsar(conEtiqueta(raiz!, 'Ducha fría'));
    expect(onRegistrar).toHaveBeenCalledTimes(1);
    expect(onRegistrar.mock.calls[0][0].id).toBe('foto');
  });

  it('en lo opcional, «Subir» abre directo su registro y el nombre abre la hoja (con «Marcar como hecho»)', async () => {
    await montar();
    await pulsar(conEtiqueta(raiz!, 'Subir evidencia de Agua tibia'));
    expect(onRegistrar).toHaveBeenCalledTimes(1);
    expect(onRegistrar.mock.calls[0][0].id).toBe('ver');
    expect(onMarcar).not.toHaveBeenCalled();
    await pulsar(conEtiqueta(raiz!, 'Agua tibia'));
    expect(hayModal(raiz!)).toBe(true);
    expect(textos(raiz!)).toContain('Marcar como hecho');
  });

  it('abrir Training no pide ningún día anterior (ni nada de planificación)', async () => {
    await montar();
    expect(pedidosDeDias()).toHaveLength(0);
    expect(mockPedidos.filter(p => p.ruta.includes('/habit-preferences') || p.ruta.includes('/rocks/'))).toHaveLength(0);
  });
});

describe('un día ANTERIOR: no se monta ningún registro y nada escribe', () => {
  async function irAlDiaAnterior() {
    await pulsar(conEtiqueta(raiz!, 'Miércoles 28'));
  }

  it('lleva ✓ en lo hecho y candado en lo demás, sin casillas ni «Subir»', async () => {
    await montar();
    await irAlDiaAnterior();
    expect(textos(raiz!)).toContain('Agua tibia');
    expect(textos(raiz!)).toContain('Ducha fría');
    expect(textos(raiz!)).toContain('1 de 2 hechos · ese día ya cerró');
    expect(casillas(raiz!)).toHaveLength(0);
    for (const palabra of ['Subir', 'Tomar foto', 'Escuchar', 'Marcar', 'Te toca ahora', 'Lo que sigue', 'Se te pasó la hora']) {
      expect(textos(raiz!)).not.toContain(palabra);
    }
    expect(hayModal(raiz!)).toBe(false);
  });

  it('tocar lo hecho solo dice «Ya hecho»; tocar el candado solo dice que ese día ya cerró', async () => {
    await montar();
    await irAlDiaAnterior();
    await pulsar(conEtiqueta(raiz!, 'Agua tibia'));
    expect(textos(raiz!)).toContain('Ya hecho');
    await pulsar(conEtiqueta(raiz!, 'Ducha fría'));
    expect(textos(raiz!)).toContain('Ese día ya cerró. No se puede registrar.');
    // Nada más se abrió: ni hoja, ni cámara, ni evento, ni marca.
    expect(hayModal(raiz!)).toBe(false);
    expect(onRegistrar).not.toHaveBeenCalled();
    expect(onMarcar).not.toHaveBeenCalled();
    expect(onAbrirEvento).not.toHaveBeenCalled();
  });

  it('ninguna acción llama a un endpoint de escritura: ni /complete, ni /evidence, ni /rocks/…', async () => {
    await montar();
    await irAlDiaAnterior();
    for (const parte of ['Agua tibia', 'Ducha fría', 'Agua tibia', 'Ducha fría']) await pulsar(conEtiqueta(raiz!, parte));
    expect(mockPedidos.length).toBeGreaterThan(0);
    expect(mockPedidos.every(p => p.metodo === 'GET')).toBe(true);
    expect(mockPedidos.filter(p => /\/complete|\/evidence|\/rocks\//.test(p.ruta))).toEqual([]);
    expect(onRegistrar).not.toHaveBeenCalled();
    expect(onMarcar).not.toHaveBeenCalled();
  });

  it('tocar el mismo día muchas veces hace UN solo pedido al servidor', async () => {
    await montar();
    for (let i = 0; i < 6; i++) {
      await irAlDiaAnterior();
      await pulsar(conEtiqueta(raiz!, 'Jueves 29, hoy'));
      await pulsar(conEtiqueta(raiz!, 'Miércoles 28'));
    }
    expect(pedidosDeDias()).toHaveLength(1);
    expect(pedidosDeDias()[0]).toEqual({ ruta: '/api/v1/habit-tracks/day?date=2026-10-28', metodo: 'GET' });
  });

  it('un día sin registros dice «Ese día no tuviste hábitos registrados.», sin ✓ ni candados', async () => {
    mockRespuestas.set('/habit-tracks/day?date=2026-10-27', []);
    await montar();
    await pulsar(conEtiqueta(raiz!, 'Martes 27'));
    expect(textos(raiz!)).toContain('Ese día no tuviste hábitos registrados.');
    expect(casillas(raiz!)).toHaveLength(0);
    expect(hayModal(raiz!)).toBe(false);
  });

  it('sin lectura del servidor (404) muestra lo planificado, sin ✓ ni candado inventados, y nada para tocar', async () => {
    mockRespuestas.set('/habit-tracks/day?date=2026-10-28', new ApiError(404, 'No encontrado'));
    await montar();
    await irAlDiaAnterior();
    expect(textos(raiz!)).toContain('Lo que hiciste ese día está en Yo → Mis evidencias.');
    expect(casillas(raiz!)).toHaveLength(0);
    await pulsar(conEtiqueta(raiz!, 'Miércoles 28'));
    expect(pedidosDeDias()).toHaveLength(1);
    expect(mockPedidos.every(p => p.metodo === 'GET')).toBe(true);
  });

  it('un error de red no se reintenta solo: hay «Reintentar» y recién ahí se vuelve a pedir', async () => {
    mockRespuestas.set('/habit-tracks/day?date=2026-10-28', new ApiError(503, 'Sin servicio'));
    await montar();
    await irAlDiaAnterior();
    await pulsar(conEtiqueta(raiz!, 'Jueves 29, hoy'));
    await irAlDiaAnterior();
    expect(pedidosDeDias()).toHaveLength(1);
    expect(textos(raiz!)).toContain('No pudimos cargar este día.');
    mockRespuestas.set('/habit-tracks/day?date=2026-10-28', [registroDelServidor('hecho', 'Agua tibia', 'COMPLETADO', '06:00:00')]);
    const reintentar = raiz!.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && textosDe(n) === 'Reintentar')[0];
    await pulsar(reintentar);
    expect(pedidosDeDias()).toHaveLength(2);
  });
});

const textosDe = (n: ReactTestInstance): string => textosDeNodos(n.findAll(() => true));

describe('un día que VIENE: lo planificado, sin botones', () => {
  it('no hay casillas ni «Subir», ni se toca nada, y solo se lee', async () => {
    await montar();
    await pulsar(conEtiqueta(raiz!, 'Viernes 30'));
    expect(casillas(raiz!)).toHaveLength(0);
    expect(textos(raiz!)).toContain('Es tu planificación. Para cambiar una hora, toca el engranaje.');
    expect(pedidosDeDias()).toHaveLength(0);
    expect(mockPedidos.every(p => p.metodo === 'GET')).toBe(true);
    expect(hayModal(raiz!)).toBe(false);
  });
});

describe('abrir o enfocar Training no pide días anteriores', () => {
  it('perder y recuperar el foco, y dibujar de nuevo muchas veces, no pide ningún día', async () => {
    await montar(true);
    for (let i = 0; i < 5; i++) {
      await act(async () => { raiz!.update(React.createElement(Envoltorio, { activa: false, cuenta: cuentaActual })); });
      await act(async () => { raiz!.update(React.createElement(Envoltorio, { activa: true, cuenta: cuentaActual })); });
    }
    expect(pedidosDeDias()).toHaveLength(0);
  });
});
