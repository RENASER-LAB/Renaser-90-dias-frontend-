import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Switch } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { PreferenciaHabitoApi } from '../../../habits/types/habits.types';
import type { HabitItem } from '../../../../screens/TrainingScreen';

/**
 * La hoja «PLANIFICAR» de Training, montada de verdad (e2e web del 27/09):
 *
 * - PLN-03: en la web, tocar el interruptor de pausa de un hábito abría TAMBIÉN el editor de su
 *   hora, detrás del diálogo de pausa. El `Switch` vivía dentro del `Pressable` de la fila, y en
 *   react-native-web el clic del interruptor (un `<input type="checkbox">`) sube hasta la fila.
 * - PLN-02: con un cambio de hora ya guardado que rige desde mañana (D-91), al volver a abrir el
 *   hábito decía «Ahora: 09:00» y la rueda arrancaba en 09:00, sin decir que desde mañana va 09:30.
 *   Guardar desde ahí (por ejemplo, para tocar solo el aviso) devolvía el hábito a 09:00.
 */

const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockRueda = jest.fn<(props: { horaInicial: number; minutoInicial: number; onCambiar: (h: number, m: number) => void }) => void>();
const mockPreferencias = jest.fn<() => Promise<PreferenciaHabitoApi[]>>();
const mockCambiarHorario = jest.fn<(...args: unknown[]) => Promise<{ deferred: boolean; deferredEffectiveDate?: string | null }>>();

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, mensaje?: string) => mockAlerta(titulo, mensaje) },
}));
jest.mock('../../../habits/components/RuedaHoraPicker', () => ({
  RuedaHoraPicker: (props: { horaInicial: number; minutoInicial: number; onCambiar: (h: number, m: number) => void }) => {
    mockRueda(props);
    return null;
  },
}));
jest.mock('../../../habits/components/RuedaAntelacionPicker', () => ({ RuedaAntelacionPicker: () => null }));
const mockFilaDias = jest.fn<(props: { onAlternarDia: (dia: string) => void }) => void>();
jest.mock('../../../habits/components/FilaDeDiasDelPlan', () => ({
  FilaDeDiasDelPlan: (props: { onAlternarDia: (dia: string) => void }) => {
    mockFilaDias(props);
    return null;
  },
}));
const mockAntelacionesDe = jest.fn<(userId: string, habitoId: string) => Promise<number[]>>(async () => []);
jest.mock('../../../habits/notificaciones/recordatoriosDeHabito', () => ({
  HAY_RECORDATORIOS: true,
  HAY_RECORDATORIOS_WEB: false,
  antelacionesDe: (userId: string, habitoId: string) => mockAntelacionesDe(userId, habitoId),
  programar: async () => true,
  // D-217: con el cambio diferido (D-91, siempre) la hoja programa la alarma respetando su fecha.
  programarConCambioDiferido: async () => true,
  prepararWebPush: async () => true,
}));
// D-217: la hoja pide «Alarmas y recordatorios» con el primer recordatorio; acá no hay sistema que
// consultar, así que nunca hace falta pedirlo.
jest.mock('../../../alarmas/pedirAlarmaExacta', () => ({
  hayQuePedirAlarmaExactaAlGuardar: async () => false,
  anotarQueSePidioAlarmaExacta: async () => undefined,
  abrirPermisoDeAlarmasExactas: async () => 'ninguna',
  TEXTO_PEDIDO_ALARMA_EXACTA: '',
}));
jest.mock('../../../habits/api/habitsApi', () => ({
  obtenerPreferencias: () => mockPreferencias(),
  obtenerPlanDesbloqueos: async () => ({ items: [] }),
  obtenerHorarioSemanal: async () => [],
  cambiarHorario: (...args: unknown[]) => mockCambiarHorario(...args),
  agregarHabitoAlPlan: async () => undefined,
  cambiarEstadoHabito: async () => undefined,
}));

import { PlanificarDimensionModal } from '../PlanificarDimensionModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const habito = (titulo: string, habitoId: string, hora: string, desactivable = true): HabitItem => ({
  id: `track-${habitoId}`,
  dimension: 'CUERPO',
  title: titulo,
  time: hora,
  tag: 'CUERPO',
  streak: 0,
  done: false,
  hasEvidence: false,
  tieneTrackHoy: true,
  habitoId,
  isDeactivatable: desactivable,
  icon: 'salad',
});
const JUGO = habito('JUGO VERDE', 'h-jugo', '09:00');
const CLASE = habito('Clase diaria', 'h-clase', '14:59', false);

const preferencia = (habitId: string, hora: string, pendiente: PreferenciaHabitoApi['pendingChange'] = null): PreferenciaHabitoApi => ({
  habitId,
  title: habitId,
  triggerTime: `${hora}:00`,
  limitTime: null,
  customized: true,
  reminderEnabled: false,
  reminderMinutesBefore: null,
  pendingChange: pendiente,
});

async function esperar() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

async function montar(): Promise<ReactTestRenderer> {
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = TestRenderer.create(
      React.createElement(PlanificarDimensionModal, {
        visible: true,
        dimension: 'CUERPO',
        habits: [JUGO, CLASE],
        onCerrar: () => undefined,
        onGuardado: () => undefined,
      })
    );
  });
  await esperar();
  return raiz;
}

/** Todo el texto visible, en orden. */
function textos(raiz: ReactTestRenderer): string {
  return raiz.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

/** Lo que se toca (tiene `onPress`) y contiene algo que cumple `adentro`, de afuera hacia adentro. */
function tocablesQueContienen(raiz: ReactTestRenderer, adentro: (n: ReactTestInstance) => boolean): ReactTestInstance[] {
  return raiz.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(adentro).length > 0);
}

/** Toca la fila de un hábito de la lista, como lo haría la persona. */
async function abrir(raiz: ReactTestRenderer, titulo: string) {
  const filas = tocablesQueContienen(raiz, n => (n.type as unknown) === 'Text' && n.props.children === titulo);
  expect(filas.length > 0).toBe(true);
  await act(async () => {
    filas[filas.length - 1].props.onPress();
  });
  await esperar();
}

let raiz: ReactTestRenderer | null = null;

beforeEach(() => {
  mockAlerta.mockReset();
  mockRueda.mockReset();
  mockPreferencias.mockReset();
  mockCambiarHorario.mockReset();
  mockFilaDias.mockReset();
  mockAntelacionesDe.mockReset();
  mockAntelacionesDe.mockImplementation(async () => []);
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('PLN-03: el interruptor de pausa no abre el editor', () => {
  it('ni el interruptor ni el candado viven dentro de lo que se toca para abrir el hábito', async () => {
    mockPreferencias.mockResolvedValue([preferencia('h-jugo', '09:00'), preferencia('h-clase', '14:59')]);
    raiz = await montar();

    expect(raiz.root.findAll(n => n.type === Switch)).toHaveLength(1);
    // Ningún `onPress` envuelve al interruptor: en la web, su clic llegaría a ese `onPress`.
    expect(tocablesQueContienen(raiz, n => n.type === Switch)).toHaveLength(0);
    // El candado es su propio botón, y nada más lo envuelve. Desde 2026-10-05 ese botón es un
    // `Presionable` (que lleva adentro su `Pressable`): son dos nodos con `onPress`, los dos sin el
    // título de la fila. Si el candado viviera dentro de la fila, uno de ellos llevaría el título.
    const envuelvenAlCandado = tocablesQueContienen(raiz, n => n.props.name === 'lock');
    expect(envuelvenAlCandado.length).toBeGreaterThan(0);
    for (const nodo of envuelvenAlCandado) {
      expect(nodo.findAll(n => (n.type as unknown) === 'Text')).toHaveLength(0);
    }
  });

  it('la fila se sigue tocando para abrir el editor', async () => {
    mockPreferencias.mockResolvedValue([preferencia('h-jugo', '09:00')]);
    raiz = await montar();
    await abrir(raiz, 'JUGO VERDE');
    expect(textos(raiz)).toContain('Ahora: 09:00');
  });
});

describe('PLN-02: el editor avisa el cambio de hora que rige desde mañana', () => {
  it('con un cambio ya guardado: dice la hora de hoy, la nueva y desde cuándo, y la rueda arranca en la nueva', async () => {
    mockPreferencias.mockResolvedValue([
      preferencia('h-jugo', '09:00', { triggerTime: '09:30:00', limitTime: null, effectiveDate: '2026-09-28' }),
    ]);
    raiz = await montar();
    await abrir(raiz, 'JUGO VERDE');

    const todo = textos(raiz);
    expect(todo).toContain('Ahora: 09:00');
    expect(todo).toContain('Desde el lunes 28 de septiembre: 09:30');
    expect(mockRueda).toHaveBeenLastCalledWith(expect.objectContaining({ horaInicial: 9, minutoInicial: 30 }));
  });

  it('sin cambio pendiente no agrega nada', async () => {
    mockPreferencias.mockResolvedValue([preferencia('h-jugo', '09:00')]);
    raiz = await montar();
    await abrir(raiz, 'JUGO VERDE');

    expect(textos(raiz)).not.toContain('Desde el');
    expect(mockRueda).toHaveBeenLastCalledWith(expect.objectContaining({ horaInicial: 9, minutoInicial: 0 }));
  });

  it('recién guardado (se difiere a mañana): al volver a abrirlo lo dice igual', async () => {
    mockPreferencias.mockResolvedValue([preferencia('h-jugo', '09:00')]);
    mockCambiarHorario.mockResolvedValue({ deferred: true, deferredEffectiveDate: '2026-09-28' });
    raiz = await montar();
    await abrir(raiz, 'JUGO VERDE');

    await act(async () => {
      mockRueda.mock.lastCall![0].onCambiar(9, 30);
    });
    const [guardar] = raiz.root.findAll(n => typeof n.props.label === 'string' && n.props.label.startsWith('Guardar 09:30'));
    await act(async () => {
      guardar.props.onPress();
    });
    await esperar();
    expect(mockCambiarHorario).toHaveBeenCalledTimes(1);

    await abrir(raiz, 'JUGO VERDE');
    const todo = textos(raiz);
    expect(todo).toContain('Ahora: 09:00');
    expect(todo).toContain('Desde el lunes 28 de septiembre: 09:30');
    expect(mockRueda).toHaveBeenLastCalledWith(expect.objectContaining({ horaInicial: 9, minutoInicial: 30 }));
  });
});

/**
 * E-408 (2026-09-28): la hoja abría un hábito sin recordatorio con «A la hora» YA MARCADO y guardaba
 * `recordatorio_activo = false`: lo que se veía no era lo que se guardaba. Visto dos veces con Jugo verde.
 *
 * Causas: (1) al abrir un hábito, las antelaciones quedaban las del hábito anterior hasta que llegaba la
 * lectura del teléfono, y esa lectura, al llegar tarde, pisaba lo que la persona ya había tocado; (2) con
 * días elegidos, la hoja mostraba el recordatorio pero guardar días lo ignoraba.
 */
describe('E-408: lo que se ve en el recordatorio es lo que se guarda', () => {
  const conAviso = (habitId: string, hora: string): PreferenciaHabitoApi => ({
    ...preferencia(habitId, hora), reminderEnabled: true, reminderMinutesBefore: 0,
  });
  const aLaHoraMarcado = (r: ReactTestRenderer): boolean => {
    const boton = r.root.findAll(n => typeof n.props.onPress === 'function'
      && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('A la hora exacta'));
    return boton.length > 0 && boton[0].props.accessibilityState?.selected === true;
  };
  const volver = async (r: ReactTestRenderer) => {
    // La ‹ de la hoja (2026-10-05): un ícono con nombre para el lector de pantalla, sin texto.
    const [boton] = r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Volver a la lista');
    await act(async () => { boton.props.onPress(); });
  };
  const guardar = async (r: ReactTestRenderer) => {
    const [boton] = r.root.findAll(n => typeof n.props.label === 'string' && n.props.label.startsWith('Guardar'));
    await act(async () => { boton.props.onPress(); });
    await esperar();
  };

  it('abrir un hábito sin recordatorio después de uno con «A la hora» no lo muestra marcado', async () => {
    mockPreferencias.mockResolvedValue([conAviso('h-jugo', '09:00'), preferencia('h-clase', '14:59')]);
    mockCambiarHorario.mockResolvedValue({ deferred: true, deferredEffectiveDate: '2026-09-29' });
    mockAntelacionesDe.mockImplementation(async (_u, id) => (id === 'h-jugo' ? [0] : new Promise<number[]>(() => {})));
    raiz = await montar();
    await abrir(raiz, 'JUGO VERDE');
    expect(aLaHoraMarcado(raiz)).toBe(true);
    await volver(raiz);
    await abrir(raiz, 'Clase diaria');
    // La lectura del teléfono de Clase diaria todavía no llegó: manda lo que dice el servidor (nada).
    expect(aLaHoraMarcado(raiz)).toBe(false);
    await guardar(raiz);
    expect(mockCambiarHorario).toHaveBeenLastCalledWith('h-clase', '14:59:00', null,
      expect.objectContaining({ activo: false, minutosAntes: null }));
  });

  it('si la persona marca «A la hora» antes de que llegue la lectura del teléfono, no se lo pisa', async () => {
    let responder!: (v: number[]) => void;
    mockPreferencias.mockResolvedValue([preferencia('h-jugo', '09:00')]);
    mockCambiarHorario.mockResolvedValue({ deferred: true, deferredEffectiveDate: '2026-09-29' });
    mockAntelacionesDe.mockImplementation(() => new Promise<number[]>(r => { responder = r; }));
    raiz = await montar();
    await abrir(raiz, 'JUGO VERDE');
    const [aLaHora] = raiz.root.findAll(n => typeof n.props.onPress === 'function'
      && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('A la hora exacta'));
    await act(async () => { aLaHora.props.onPress(); });
    await act(async () => { responder([]); });
    await esperar();
    expect(aLaHoraMarcado(raiz)).toBe(true);
    await guardar(raiz);
    expect(mockCambiarHorario).toHaveBeenLastCalledWith('h-jugo', '09:00:00', null,
      expect.objectContaining({ activo: true, minutosAntes: 0 }));
  });

  it('con días elegidos no se ofrece un recordatorio que guardar días no guarda', async () => {
    mockPreferencias.mockResolvedValue([preferencia('h-jugo', '09:00')]);
    raiz = await montar();
    await abrir(raiz, 'JUGO VERDE');
    expect(raiz.root.findAll(n => n.props.accessibilityLabel?.startsWith?.('A la hora exacta')).length).toBeGreaterThan(0);
    await act(async () => { mockFilaDias.mock.lastCall![0].onAlternarDia('VIE'); });
    expect(raiz.root.findAll(n => n.props.accessibilityLabel?.startsWith?.('A la hora exacta'))).toHaveLength(0);
  });
});
