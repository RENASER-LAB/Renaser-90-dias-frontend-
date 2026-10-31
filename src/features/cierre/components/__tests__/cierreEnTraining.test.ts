/**
 * «Cierra tu día» dentro de Training por hora (spec 017), con el cuerpo MONTADO (`TrainingPorHora`), el reloj fijo y la red
 * reemplazada por un doble que anota cada pedido:
 *
 * - la fila está SIEMPRE (corrección del dueño, 2026-10-30), a cualquier hora, con o sin Dormir y sin hora propia; el cierre
 *   de hoy se lee desde que Training está a la vista;
 * - es la última de hoy, después de todo (también de Dormir y de lo hecho), y no cuenta: ni «N de M hechos», ni puntos, ni
 *   atraso, ni «Te toca ahora»;
 * - tocarla abre la hoja; al guardar queda en verde «Día cerrado» con lo de mañana y se queda en su lugar;
 * - sin la ruta (404), con el plan apagado o al pasar la medianoche, no hay fila;
 * - un día anterior dice «Cerrado» o «Sin cerrar», se lee SOLO al tocarlo, una vez por fecha, y no se abre;
 * - los casos de quien trabaja de noche, cierra temprano o tiene un día normal (pedido del dueño, 2026-10-30): se DESCRIBE
 *   lo que pasa, no se inventa ninguna regla.
 *
 * Calendario de 2026 (jest corre en `America/Lima`, UTC−5): jue 29/10 · vie 30 · sáb 31 · dom 1/11.
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
const mockLogro = jest.fn();
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => mockLogro() },
}));
const mockAlert = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...args: unknown[]) => mockAlert(...args) } }));

const mockPedidos: { ruta: string; metodo: string; cuerpo?: unknown }[] = [];
const mockRespuestas = new Map<string, unknown>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...(jest.requireActual('../../../../services/http/apiClient') as object),
  apiFetch: async (ruta: string, opciones?: { method?: string; body?: unknown }) => {
    mockPedidos.push({ ruta, metodo: opciones?.method ?? 'GET', cuerpo: opciones?.body });
    const clave = `${opciones?.method ?? 'GET'} ${ruta}`;
    for (const [parte, respuesta] of mockRespuestas) {
      if (clave.includes(parte)) {
        if (typeof respuesta === 'function') return (respuesta as () => unknown)();
        if (respuesta instanceof Error) throw respuesta;
        return respuesta;
      }
    }
    return [];
  },
}));

/* La hoja de abajo, reemplazada por un doble que dibuja título, cuerpo y pie y —como la de verdad— avisa `alTerminarDeCerrar`
   cuando termina de irse. */
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({
  HojaDesdeAbajo: (props: { visible: boolean; titulo: string; subtitulo?: string; children: unknown; pie?: unknown; alTerminarDeCerrar?: () => void }) => {
    const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    const R = jest.requireActual<typeof import('react')>('react');
    const estabaAbierta = R.useRef(props.visible);
    const aviso = R.useRef(props.alTerminarDeCerrar);
    aviso.current = props.alTerminarDeCerrar;
    R.useEffect(() => {
      if (estabaAbierta.current && !props.visible) aviso.current?.();
      estabaAbierta.current = props.visible;
    }, [props.visible]);
    return props.visible
      ? R.createElement(View, null, R.createElement(Text, null, props.titulo), R.createElement(Text, null, props.subtitulo ?? ''), props.children as never, props.pie as never)
      : null;
  },
}));

import { ApiError } from '../../../../services/http/apiClient';
import { TrainingPorHora } from '../../../training/components/TrainingPorHora';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const JUEVES = '2026-10-29';
const DOMINGO = '2026-11-01';
/** Hora de Lima → instante. */
const lima = (fechaIso: string, hora: string) => new Date(`${fechaIso}T${hora}:00-05:00`);

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
const ESCRITURA = habito('escritura', 'Escritura libre nocturna', '21:30');
const DORMIR = habito('dormir', 'Dormir', '22:30', { systemKey: 'SLEEP' });

const PENDIENTE = { id: 'a-2', titulo: 'Revisar las facturas', horaInicio: '20:30:00', cumplida: false, cumplidaEn: null, cierre: null };
const cierreDe = (fecha: string, extra: object = {}) => ({
  fecha,
  estado: 'ABIERTO',
  puedeCerrar: true,
  cerradoEn: null,
  nota: null,
  semana: { cumplidas: 7, planificadas: 12 },
  acciones: [PENDIENTE],
  ...extra,
});

const onRegistrar = jest.fn<(h: HabitItem) => void>();
const onMarcar = jest.fn<(h: HabitItem) => void>();
let raiz: ReactTestRenderer | null = null;

type Props = { hoyIso?: string; habits?: HabitItem[]; cierrePrendido?: boolean; activa?: boolean; diaPrograma?: number | null; cuenta: string };
function Cuerpo({ hoyIso = JUEVES, habits = [ESCRITURA, DORMIR], cierrePrendido, activa = true, diaPrograma = 20, cuenta }: Props) {
  const [dia, setDia] = React.useState<string | null>(null);
  React.useEffect(() => { setDia(null); }, [hoyIso]);
  return React.createElement(TrainingPorHora, {
    activa,
    estado: 'listo',
    mensajeDeError: null,
    onReintentar: () => undefined,
    cuentaId: cuenta,
    habits,
    planHabits: [],
    hoyIso,
    diaElegido: dia,
    onElegirDia: setDia,
    diaPrograma,
    fase: null,
    titulos: {},
    eventosPrendidos: false,
    cierrePrendido,
    confirmacion: null,
    onConfirmacionTerminada: () => undefined,
    aperturaPedida: null,
    onAperturaAtendida: () => undefined,
    onRegistrar,
    onMarcar,
    onAbrirEvento: () => undefined,
  });
}

/** Cada prueba es de una cuenta distinta: la memoria de la sesión (días leídos) es de toda la app. */
let numeroDeCuenta = 0;
let cuentaActual = '';
async function montar(props: Omit<Props, 'cuenta'> = {}, reloj?: Date) {
  if (reloj) jest.setSystemTime(reloj);
  cuentaActual = `cierre-${++numeroDeCuenta}`;
  await act(async () => { raiz = TestRenderer.create(React.createElement(Cuerpo, { ...props, cuenta: cuentaActual })); });
}
const actualizar = (props: Omit<Props, 'cuenta'>) => act(async () => { raiz!.update(React.createElement(Cuerpo, { ...props, cuenta: cuentaActual })); });
const avanzar = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });
const irA = async (hora: Date) => { jest.setSystemTime(hora); await avanzar(31_000); };

const textosDeNodos = (nodos: ReactTestInstance[]): string[] =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .filter(Boolean);
const textos = () => textosDeNodos(raiz!.root.findAll(() => true));
const hay = (texto: string) => textos().some(t => t.includes(texto));
const unicos = (nodos: ReactTestInstance[]) => {
  const vistos = new Set<string>();
  return nodos.filter(n => {
    const etiqueta = String(n.props.accessibilityLabel);
    if (vistos.has(etiqueta)) return false;
    vistos.add(etiqueta);
    return true;
  });
};
const tocables = () => unicos(raiz!.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel));
const conEtiqueta = (parte: string) => tocables().find(n => String(n.props.accessibilityLabel).includes(parte));
const filaDelCierre = () => conEtiqueta('Cierra tu día, 2 minutos') ?? conEtiqueta('Día cerrado');
const pulsar = (n: ReactTestInstance) => act(async () => { n.props.onPress(); });
const tocarTexto = (texto: string) => {
  const t = raiz!.root.findAll(n => n.type === 'Text' && textosDeNodos([n]).includes(texto))[0];
  // El tocable más interno que contiene ese texto (el último de la búsqueda en profundidad).
  const n = raiz!.root.findAll(x => typeof x.props.onPress === 'function' && x.findAll(y => y === t).length > 0).at(-1);
  if (!n) throw new Error(`No hay «${texto}» tocable`);
  return pulsar(n);
};
const dia = (rotulo: string) => conEtiqueta(rotulo)!;
const etiquetasDeLaSemana = () => raiz!.root.findAll(n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function').map(n => String(n.props.accessibilityLabel));
const pedidosDelCierre = () => mockPedidos.filter(p => p.ruta.includes('/rocks/day-closure'));

beforeEach(() => {
  jest.useFakeTimers();
  mockPedidos.length = 0;
  mockRespuestas.clear();
  [onRegistrar, onMarcar, mockAlert, mockLogro].forEach(m => m.mockReset());
  mockRespuestas.set('/calendar/events', []);
  mockRespuestas.set('/habit-preferences', { habits: [] });
  mockRespuestas.set('/rocks/upcoming', { desde: JUEVES, hasta: DOMINGO, rocas: [] });
  mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES));
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
});

describe('la fila está siempre, y de última', () => {
  it.each(['00:30', '06:00', '14:00', '21:00', '23:30'])('con Dormir a las 22:30 está a las %s, y el cierre de hoy se lee desde que Training está a la vista', async hora => {
    await montar({}, lima(JUEVES, hora));
    expect(filaDelCierre()).toBeDefined();
    expect(hay('Cierra tu día')).toBe(true);
    expect(hay('2 minutos')).toBe(true);
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual([`/api/v1/rocks/day-closure?date=${JUEVES}`]);
  });

  it('no depende de Dormir: sin Dormir hoy, con Dormir a las 08:00 (turno de noche) o a las 00:10, está igual', async () => {
    for (const habits of [[ESCRITURA], [habito('dormir', 'Dormir', '08:00', { systemKey: 'SLEEP' })], [habito('dormir', 'Dormir', '00:10', { systemKey: 'SLEEP' })]]) {
      await montar({ habits }, lima(JUEVES, '06:00'));
      expect(filaDelCierre()).toBeDefined();
      act(() => raiz?.unmount());
      raiz = null;
    }
  });

  it('no depende de nada del día: sin ningún hábito la fila está', async () => {
    await montar({ habits: [] }, lima(JUEVES, '14:00'));
    expect(filaDelCierre()).toBeDefined();
  });

  it('es la última de hoy: viene DESPUÉS de Dormir y de todo lo del día', async () => {
    await montar({}, lima(JUEVES, '22:10'));
    const t = textos();
    expect(t.indexOf('Escritura libre nocturna')).toBeGreaterThan(-1);
    expect(t.indexOf('Dormir')).toBeGreaterThan(t.indexOf('Escritura libre nocturna'));
    expect(t.indexOf('Cierra tu día')).toBeGreaterThan(t.indexOf('Dormir'));
  });

  it('es la última aunque Dormir ya esté hecho y plegado en «1 hecho hoy»', async () => {
    const habits = [ESCRITURA, habito('dormir', 'Dormir', '22:30', { systemKey: 'SLEEP', done: true })];
    await montar({ habits }, lima(JUEVES, '23:00'));
    const t = textos();
    expect(t.indexOf('1 hecho hoy')).toBeGreaterThan(-1);
    expect(t.indexOf('Cierra tu día')).toBeGreaterThan(t.indexOf('1 hecho hoy'));
  });

  it('NO lleva hora: ni «22:00» (Dormir menos 30) ni «21:30» como suya, ni en lo que oye el lector de pantalla', async () => {
    await montar({ habits: [DORMIR] }, lima(JUEVES, '22:10'));
    expect(textos()).not.toContain('22:00');
    expect(textos().filter(h => /^\d{1,2}:\d{2}$/.test(h))).toEqual(['22:30']); // solo la de Dormir
    const etiqueta = String(filaDelCierre()!.props.accessibilityLabel);
    expect(etiqueta).not.toMatch(/\d{1,2}:\d{2}|Sin hora/);
    expect(etiqueta.startsWith('Cierra tu día')).toBe(true);
  });

  it('cerrada, tampoco lleva hora de fila: cuándo cerró lo dice su texto', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES, { estado: 'CERRADO', cerradoEn: '2026-10-30T04:50:00Z', acciones: [] }));
    await montar({ habits: [DORMIR] }, lima(JUEVES, '23:55'));
    const etiqueta = String(filaDelCierre()!.props.accessibilityLabel);
    expect(etiqueta).toContain('Día cerrado');
    expect(etiqueta).toContain('Cerrado a las 23:50');
    expect(textos().filter(h => /^\d{1,2}:\d{2}$/.test(h))).toEqual(['22:30']);
  });

  it('no cuenta: «N de M hechos» y los puntos no la incluyen', async () => {
    await montar({}, lima(JUEVES, '22:10'));
    expect(hay('0 de 2 hechos · 0 pts')).toBe(true);
  });

  it('no se atrasa: pasada la hora de Dormir sigue en su lugar, no entre «Se te pasó la hora»', async () => {
    await montar({}, lima(JUEVES, '23:10'));
    const etiqueta = String(filaDelCierre()!.props.accessibilityLabel);
    expect(etiqueta).not.toMatch(/se te pasó la hora/i);
    expect(hay('Se te pasó la hora')).toBe(true); // lo atrasado es Dormir; el cierre sigue en su lugar
    const t = textos();
    expect(t.indexOf('Cierra tu día')).toBeGreaterThan(t.indexOf('Dormir'));
  });

  it('con todo lo demás hecho, «Terminaste lo de hoy» sigue saliendo: la fila del cierre no es algo que quede por hacer', async () => {
    const hechos = [habito('escritura', 'Escritura libre nocturna', '21:30', { done: true }), habito('dormir', 'Dormir', '22:30', { systemKey: 'SLEEP', done: true })];
    await montar({ habits: hechos }, lima(JUEVES, '22:10'));
    expect(hay('Terminaste lo de hoy')).toBe(true);
    expect(filaDelCierre()).toBeDefined();
    expect(hay('Van en el orden y a la hora que planificaste')).toBe(false);
  });

  it('la fila no es un hábito: no lleva ✓ ni «Subir» ni puntos', async () => {
    await montar({}, lima(JUEVES, '22:10'));
    const fila = filaDelCierre()!;
    expect(fila.props.accessibilityRole).toBe('button');
    expect(String(fila.props.accessibilityLabel)).toMatch(/opcional, no da puntos/);
    expect(onMarcar).not.toHaveBeenCalled();
  });
});

describe('cuándo NO hay fila', () => {
  it('con un backend sin la ruta (404) Training queda como siempre', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, new ApiError(404, 'No existe'));
    await montar({}, lima(JUEVES, '22:10'));
    expect(pedidosDelCierre()).toHaveLength(1);
    expect(filaDelCierre()).toBeUndefined();
    expect(hay('Cierra tu día')).toBe(false);
    expect(hay('0 de 2 hechos')).toBe(true);
  });

  it('con una respuesta que no es un cierre (un backend que contesta otra cosa) tampoco', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, []);
    await montar({}, lima(JUEVES, '22:10'));
    expect(filaDelCierre()).toBeUndefined();
  });

  it('con el plan apagado (Soporte TI) no se lee nada y no hay fila', async () => {
    await montar({ cierrePrendido: false }, lima(JUEVES, '22:10'));
    expect(pedidosDelCierre()).toEqual([]);
    expect(filaDelCierre()).toBeUndefined();
  });

  it('con Training fuera de vista no lee', async () => {
    await montar({ activa: false }, lima(JUEVES, '22:10'));
    expect(pedidosDelCierre()).toEqual([]);
  });

  it('al pasar la medianoche la fila de ayer no queda en hoy: es la del día nuevo, sin cerrar', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES, { estado: 'CERRADO', cerradoEn: '2026-10-30T03:30:00Z', acciones: [] }));
    await montar({}, lima(JUEVES, '23:00'));
    expect(String(filaDelCierre()!.props.accessibilityLabel)).toContain('Día cerrado');
    jest.setSystemTime(lima('2026-10-30', '00:05'));
    mockRespuestas.set('day-closure?date=2026-10-30', () => cierreDe('2026-10-30'));
    await actualizar({ hoyIso: '2026-10-30' });
    await avanzar(31_000);
    expect(hay('Día cerrado')).toBe(false);
    expect(String(filaDelCierre()!.props.accessibilityLabel)).toContain('Cierra tu día, 2 minutos');
    expect(pedidosDelCierre().map(p => p.ruta)).toContain('/api/v1/rocks/day-closure?date=2026-10-30');
  });
});

describe('la hoja y el cierre', () => {
  it('tocar la fila abre «Cierra tu día», relee el día y no registra nada de Training', async () => {
    await montar({}, lima(JUEVES, '22:10'));
    mockPedidos.length = 0;
    await pulsar(filaDelCierre()!);
    expect(pedidosDelCierre().map(p => `${p.metodo} ${p.ruta}`)).toEqual([`GET /api/v1/rocks/day-closure?date=${JUEVES}`]);
    expect(hay('Jueves 29 · Día 20')).toBe(true);
    expect(hay('Revisar las facturas')).toBe(true);
    expect(onRegistrar).not.toHaveBeenCalled();
    expect(onMarcar).not.toHaveBeenCalled();
  });

  it('al guardar la fila queda en verde «Día cerrado» con lo de mañana, en su lugar, y sin puntos', async () => {
    mockRespuestas.set(`PUT /api/v1/rocks/day-closure`, () =>
      cierreDe(JUEVES, { estado: 'CERRADO', cerradoEn: '2026-10-30T03:12:00Z', acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }] }),
    );
    await montar({}, lima(JUEVES, '22:10'));
    await pulsar(filaDelCierre()!);
    await tocarTexto('No me alcanzó el tiempo');
    await tocarTexto('Hacerla a otra hora');
    await tocarTexto('Guardar mi cierre');
    expect(mockPedidos.filter(p => p.metodo === 'PUT')).toHaveLength(1);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    // La hoja ya dice «Día cerrado»; cerrarla deja la fila verde en su lugar.
    expect(hay('Mañana: «Revisar las facturas», a otra hora.')).toBe(true);
    expect(hay('0 de 2 hechos · 0 pts')).toBe(true);
    const fila = filaDelCierre()!;
    expect(String(fila.props.accessibilityLabel)).toContain('Día cerrado');
    expect(String(fila.props.accessibilityLabel)).toContain('Mañana: «Revisar las facturas» a otra hora');
  });

  it('un cierre ya hecho se puede volver a abrir y cambiar (la fila verde sigue siendo un botón)', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () =>
      cierreDe(JUEVES, { estado: 'CERRADO', cerradoEn: '2026-10-30T03:12:00Z', acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_ENERGIA', manana: 'DEJARLA', nota: null } }] }),
    );
    await montar({}, lima(JUEVES, '22:10'));
    const fila = filaDelCierre()!;
    expect(String(fila.props.accessibilityLabel)).toContain('toca para cambiar tu cierre');
    await pulsar(fila);
    const elegidos = raiz!.root
      .findAll(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityState?.selected === true)
      .map(n => String(n.props.accessibilityLabel))
      .filter(etiqueta => !/, hoy$|^\w+ \d+$/.test(etiqueta)); // sin la pastilla del día de la semana
    expect([...new Set(elegidos)]).toEqual(['Me faltó energía', 'Dejarla']);
  });

  it('«Ver mañana en Training» elige el viernes en la semana', async () => {
    mockRespuestas.set(`PUT /api/v1/rocks/day-closure`, () =>
      cierreDe(JUEVES, { estado: 'CERRADO', acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }] }),
    );
    await montar({}, lima(JUEVES, '22:10'));
    await pulsar(filaDelCierre()!);
    await tocarTexto('No me alcanzó el tiempo');
    await tocarTexto('Hacerla a otra hora');
    await tocarTexto('Guardar mi cierre');
    await tocarTexto('Ver mañana en Training');
    await avanzar(500);
    const elegido = raiz!.root.findAll(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityState?.selected === true && typeof n.props.onPress === 'function')[0];
    expect(String(elegido.props.accessibilityLabel)).toContain('Viernes 30');
  });

  it('el DOMINGO mañana cae fuera de la semana: no se ofrece «Ver mañana en Training»', async () => {
    mockRespuestas.set(`day-closure?date=${DOMINGO}`, () => cierreDe(DOMINGO));
    mockRespuestas.set(`PUT /api/v1/rocks/day-closure`, () =>
      cierreDe(DOMINGO, { estado: 'CERRADO', acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }] }),
    );
    await montar({ hoyIso: DOMINGO }, lima(DOMINGO, '22:10'));
    await pulsar(filaDelCierre()!);
    await tocarTexto('No me alcanzó el tiempo');
    await tocarTexto('Hacerla a otra hora');
    await tocarTexto('Guardar mi cierre');
    expect(hay('Día cerrado')).toBe(true);
    expect(hay('Ver mañana en Training')).toBe(false);
  });

  it('un 409 («ese día ya cerró»): cierra la hoja, relee y avisa; no queda «Día cerrado» ni se anuncian puntos', async () => {
    mockRespuestas.set(`PUT /api/v1/rocks/day-closure`, new ApiError(409, 'Ese día ya cerró y no se puede cerrar tarde.'));
    await montar({}, lima(JUEVES, '22:10'));
    await pulsar(filaDelCierre()!);
    await tocarTexto('No me alcanzó el tiempo');
    await tocarTexto('Hacerla a otra hora');
    mockPedidos.length = 0;
    await tocarTexto('Guardar mi cierre');
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert.mock.calls[0][0]).toBe('Ese día ya cerró');
    expect(String(mockAlert.mock.calls[0][1])).toContain('ya cerró');
    expect(hay('Guardar mi cierre')).toBe(false); // la hoja se cerró
    expect(pedidosDelCierre().some(p => p.metodo === 'GET')).toBe(true); // y se releyó
    expect(mockLogro).not.toHaveBeenCalled();
  });
});

describe('un día anterior', () => {
  beforeEach(() => {
    mockRespuestas.set('day-closure?date=2026-10-28', () => cierreDe('2026-10-28', { estado: 'CERRADO', cerradoEn: '2026-10-29T03:00:00Z', puedeCerrar: false, semana: null }));
    mockRespuestas.set('day-closure?date=2026-10-27', () => cierreDe('2026-10-27', { estado: 'SIN_CERRAR', puedeCerrar: false, semana: null }));
  });

  it('abrir Training no lee ningún cierre anterior: solo el de hoy, que la fila necesita desde que Training está a la vista', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual([`/api/v1/rocks/day-closure?date=${JUEVES}`]);
    expect(new Set(etiquetasDeLaSemana()).size).toBe(7);
  });

  it('tocar el miércoles lee SU cierre una vez y dice «Cerrado»; el martes dice «Sin cerrar»', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    await pulsar(dia('Miércoles 28'));
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual([`/api/v1/rocks/day-closure?date=${JUEVES}`, '/api/v1/rocks/day-closure?date=2026-10-28']);
    const textosDelMiercoles = textos();
    expect(textosDelMiercoles).toContain('Día cerrado');
    expect(textosDelMiercoles).toContain('Cerrado');

    await pulsar(dia('Martes 27'));
    expect(textos()).toContain('Sin cerrar');
    expect(textos()).toContain('Cierra tu día');
  });

  it('volver a tocar el mismo día no vuelve a leer; es una lectura por fecha', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    for (let i = 0; i < 4; i++) {
      await pulsar(dia('Miércoles 28'));
      await pulsar(dia('Jueves 29'));
    }
    expect(pedidosDelCierre().filter(p => p.ruta.includes('2026-10-28'))).toHaveLength(1);
  });

  it('la fila de un día anterior es solo texto: tocarla no abre ninguna hoja ni escribe nada', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    await pulsar(dia('Miércoles 28'));
    const solo = raiz!.root.findAll(n => String(n.props.accessibilityLabel ?? '').includes('Día cerrado') && n.props.accessible === true);
    expect(solo.length).toBeGreaterThan(0);
    expect(solo.every(n => typeof n.props.onPress !== 'function')).toBe(true);
    expect(mockPedidos.filter(p => p.metodo !== 'GET')).toEqual([]);
    expect(hay('Cargando tu día')).toBe(false);
  });

  it('sin la ruta (404) ese día queda como siempre, sin fila', async () => {
    mockRespuestas.set('day-closure?date=2026-10-28', new ApiError(404, 'No existe'));
    await montar({}, lima(JUEVES, '10:00'));
    await pulsar(dia('Miércoles 28'));
    expect(hay('Día cerrado')).toBe(false);
    expect(hay('Sin cerrar')).toBe(false);
  });

  it('con el plan apagado no se lee ningún cierre anterior', async () => {
    await montar({ cierrePrendido: false }, lima(JUEVES, '10:00'));
    await pulsar(dia('Miércoles 28'));
    expect(pedidosDelCierre()).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------
 * Casos pedidos por el dueño (2026-10-30). Aquí se DESCRIBE cómo se comporta la regla nueva con quien trabaja de noche o
 * cierra temprano; no se inventa ninguna regla nueva. El día es siempre el día calendario de la persona (Lima).
 * ---------------------------------------------------------------------------------------------- */

const VIERNES = '2026-10-30';
const DESPERTAR_16 = habito('despertar', 'Despertar', '16:00', { systemKey: 'WAKE_UP' });
const DORMIR_08 = habito('dormir', 'Dormir', '08:00', { systemKey: 'SLEEP' });
const TURNO_DE_NOCHE = [DESPERTAR_16, DORMIR_08];
const cuerposDelPut = () => mockPedidos.filter(p => p.metodo === 'PUT').map(p => p.cuerpo as { fecha: string; acciones: Array<{ id: string }> });
const guardarElCierre = async () => {
  await tocarTexto('No me alcanzó el tiempo');
  await tocarTexto('Hacerla a otra hora');
  await tocarTexto('Guardar mi cierre');
};
const CERRADO_CON = (fecha: string, extra: object = {}) =>
  cierreDe(fecha, { estado: 'CERRADO', cerradoEn: `${fecha}T05:00:00Z`, acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }], ...extra });

describe('caso 1 · turno de noche (Despertar 16:00, Dormir 08:00) cierra su día a las 23:50', () => {
  it('el cierre se guarda en el día de hoy (el calendario de su zona), la fila queda en verde y sin hora', async () => {
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(JUEVES));
    await montar({ habits: TURNO_DE_NOCHE }, lima(JUEVES, '23:50'));
    expect(filaDelCierre()).toBeDefined();
    await pulsar(filaDelCierre()!);
    await guardarElCierre();
    expect(cuerposDelPut()).toHaveLength(1);
    expect(cuerposDelPut()[0].fecha).toBe(JUEVES);
    expect(cuerposDelPut()[0].acciones.map(a => a.id)).toEqual(['a-2']);
    const fila = String(filaDelCierre()!.props.accessibilityLabel);
    expect(fila).toContain('Día cerrado');
    expect(fila).toContain('Mañana: «Revisar las facturas» a otra hora');
    expect(fila).not.toMatch(/\d{1,2}:\d{2}|Sin hora/);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('la fila está a las 06:00 y a las 14:00 aunque su Dormir sea a las 08:00 (no espera a ninguna hora)', async () => {
    await montar({ habits: TURNO_DE_NOCHE }, lima(JUEVES, '06:00'));
    expect(filaDelCierre()).toBeDefined();
    await irA(lima(JUEVES, '14:00'));
    expect(filaDelCierre()).toBeDefined();
  });
});

describe('caso 2 · la misma persona abre Training después de la medianoche (00:30 y 02:00)', () => {
  beforeEach(() => {
    // Jueves: no lo cerró. Viernes: el día nuevo, todavía abierto.
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES, { estado: 'SIN_CERRAR', puedeCerrar: false, semana: null }));
    mockRespuestas.set(`day-closure?date=${VIERNES}`, () => cierreDe(VIERNES));
  });

  it('ve el día NUEVO (viernes 30) y la fila «Cierra tu día» es del día nuevo, con su propia lectura', async () => {
    await montar({ habits: TURNO_DE_NOCHE, hoyIso: VIERNES }, lima(VIERNES, '00:30'));
    expect(hay('Viernes 30')).toBe(true);
    expect(String(filaDelCierre()!.props.accessibilityLabel)).toContain('Cierra tu día, 2 minutos');
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual([`/api/v1/rocks/day-closure?date=${VIERNES}`]);
    await irA(lima(VIERNES, '02:00'));
    expect(hay('Viernes 30')).toBe(true);
    expect(filaDelCierre()).toBeDefined();
  });

  it('cerrar a las 00:30 o a las 02:00 cierra el día NUEVO (viernes), no el jueves en que empezó su turno', async () => {
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(VIERNES));
    await montar({ habits: TURNO_DE_NOCHE, hoyIso: VIERNES }, lima(VIERNES, '02:00'));
    await pulsar(filaDelCierre()!);
    await guardarElCierre();
    expect(cuerposDelPut().map(c => c.fecha)).toEqual([VIERNES]);
  });

  it('el jueves queda «Sin cerrar» y ya no se puede cerrar: la fila es solo texto y no se envía nada', async () => {
    await montar({ habits: TURNO_DE_NOCHE, hoyIso: VIERNES }, lima(VIERNES, '00:30'));
    await pulsar(dia('Jueves 29'));
    expect(pedidosDelCierre().map(p => p.ruta)).toContain(`/api/v1/rocks/day-closure?date=${JUEVES}`);
    expect(textos()).toContain('Sin cerrar');
    const solo = raiz!.root.findAll(n => String(n.props.accessibilityLabel ?? '').includes('Cierra tu día') && n.props.accessible === true);
    expect(solo.length).toBeGreaterThan(0);
    expect(solo.every(n => typeof n.props.onPress !== 'function')).toBe(true);
    expect(mockPedidos.filter(p => p.metodo !== 'GET')).toEqual([]);
  });

  it('una hoja abierta a las 23:55 que cruza la medianoche se cierra; no se reasigna el cierre al viernes', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES)); // a las 23:55 el jueves todavía está abierto
    await montar({ habits: TURNO_DE_NOCHE }, lima(JUEVES, '23:55'));
    await pulsar(filaDelCierre()!);
    expect(hay('Guardar mi cierre')).toBe(true);
    jest.setSystemTime(lima(VIERNES, '00:05'));
    await actualizar({ habits: TURNO_DE_NOCHE, hoyIso: VIERNES });
    await avanzar(31_000);
    expect(hay('Guardar mi cierre')).toBe(false);
    expect(mockPedidos.filter(p => p.metodo === 'PUT')).toEqual([]);
    expect(mockLogro).not.toHaveBeenCalled();
  });
});

describe('caso 3 · cierra temprano (06:00) y después cumple algo más ese mismo día', () => {
  it('a las 06:00 la fila está al final y se puede cerrar; el cierre es del día de hoy', async () => {
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(JUEVES));
    await montar({}, lima(JUEVES, '06:00'));
    const t = textos();
    expect(t.indexOf('Cierra tu día')).toBeGreaterThan(t.indexOf('Dormir'));
    await pulsar(filaDelCierre()!);
    await guardarElCierre();
    expect(cuerposDelPut()[0].fecha).toBe(JUEVES);
    expect(String(filaDelCierre()!.props.accessibilityLabel)).toContain('Día cerrado');
  });

  it('si después cumple esa acción, el día SIGUE cerrado (verde), pero ya no dice lo que dijo de ella', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => CERRADO_CON(JUEVES));
    await montar({}, lima(JUEVES, '06:00'));
    expect(String(filaDelCierre()!.props.accessibilityLabel)).toContain('Mañana: «Revisar las facturas» a otra hora');
    // Cumplió la acción desde Plan/Hoy: el servidor ya no entrega la respuesta de una acción cumplida (spec 017, contrato).
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () =>
      CERRADO_CON(JUEVES, { acciones: [{ ...PENDIENTE, cumplida: true, cumplidaEn: '2026-10-29T17:00:00Z', cierre: null }] }),
    );
    await irA(lima(JUEVES, '12:00'));
    await pulsar(filaDelCierre()!); // volver a abrir relee el día
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Revisar las facturas, cumplida a las 12:00').length).toBeGreaterThan(0);
    expect(hay('¿Qué pasó?')).toBe(false); // ya no se le pregunta por esa acción
    expect(hay('No te quedó nada pendiente. No hace falta responder nada.')).toBe(true);
  });

  it('se puede volver a abrir y editar el MISMO día: el cierre nuevo reemplaza al anterior', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => CERRADO_CON(JUEVES));
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(JUEVES, { acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_ENERGIA', manana: 'DEJARLA', nota: null } }] }));
    await montar({}, lima(JUEVES, '06:00'));
    await pulsar(filaDelCierre()!);
    await tocarTexto('Me faltó energía');
    await tocarTexto('Dejarla');
    await tocarTexto('Guardar mi cierre');
    expect(cuerposDelPut()).toHaveLength(1);
    expect(cuerposDelPut()[0].fecha).toBe(JUEVES);
    expect(String(filaDelCierre()!.props.accessibilityLabel)).toContain('Mañana: «Revisar las facturas» la dejas');
  });
});

describe('caso 4 · día normal (Despertar 06:00, Dormir 22:30) cierra a las 21:00', () => {
  const DIA_NORMAL = [habito('despertar', 'Despertar', '06:00', { systemKey: 'WAKE_UP' }), DORMIR];

  it('la fila está al final, se cierra y queda en verde en el día de hoy', async () => {
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(JUEVES, { cerradoEn: '2026-10-30T02:00:00Z' }));
    await montar({ habits: DIA_NORMAL }, lima(JUEVES, '21:00'));
    const t = textos();
    expect(t.indexOf('Cierra tu día')).toBeGreaterThan(t.indexOf('Dormir'));
    await pulsar(filaDelCierre()!);
    await guardarElCierre();
    expect(cuerposDelPut().map(c => c.fecha)).toEqual([JUEVES]);
    const fila = String(filaDelCierre()!.props.accessibilityLabel);
    expect(fila).toContain('Día cerrado');
    expect(fila).toContain('Mañana: «Revisar las facturas» a otra hora');
  });
});
