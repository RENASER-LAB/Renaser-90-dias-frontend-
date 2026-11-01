/**
 * «Cierra tu día» dentro de Plan (spec 033, movida de Training), con `CierreEnPlan` MONTADO, el reloj fijo y la red reemplazada
 * por un doble que anota cada pedido:
 *
 * - la tarjeta está SIEMPRE (spec 017, corregida el 2026-10-30; spec 033, decisión 033-3 A), a cualquier hora, con o sin Dormir y
 *   sin hora propia; el cierre de hoy se lee desde que Plan está a la vista;
 * - tocarla abre la hoja; al guardar queda en verde «Día cerrado» con lo de mañana y se queda en su lugar;
 * - sin la ruta (404), con el plan apagado, fuera de vista o al pasar la medianoche, no hay tarjeta;
 * - «Ver mañana en Plan» se ofrece todos los días (también el domingo) y solo si Plan muestra acciones;
 * - cada acción pendiente lleva el ícono de su eje;
 * - un día anterior dice «Cerrado» o «Sin cerrar», se lee SOLO al tocarlo, una vez por fecha, y nunca se cierra;
 * - los casos de quien trabaja de noche, cierra temprano o tiene un día normal (pedido del dueño, 2026-10-30): se DESCRIBE
 *   lo que pasa, no se inventa ninguna regla.
 *
 * Calendario de 2026 (jest corre en `America/Lima`, UTC−5): jue 29/10 · vie 30 · sáb 31 · dom 1/11.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
let mockEnfocada = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockEnfocada }));
let mockPlanPrendido = true;
jest.mock('../../../plataforma/estado/useFuncionalidad', () => ({
  useFuncionalidad: () => ({ prendida: mockPlanPrendido, aviso: null, disponible: true }),
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
import { CierreEnPlan } from '../CierreEnPlan';
import type { EjeObjetivo } from '../../../objetivos/types/objetivos.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const JUEVES = '2026-10-29';
const DOMINGO = '2026-11-01';
/** Hora de Lima → instante. */
const lima = (fechaIso: string, hora: string) => new Date(`${fechaIso}T${hora}:00-05:00`);

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

const onVerManana = jest.fn<() => void>();
let raiz: ReactTestRenderer | null = null;

type Props = { puedeVerManana?: boolean; diaPrograma?: number | null; ejes?: Record<string, EjeObjetivo>; cuenta: string };
function Cuerpo({ puedeVerManana = true, diaPrograma = 20, ejes = {}, cuenta }: Props) {
  return React.createElement(CierreEnPlan, {
    cuentaId: cuenta,
    diaPrograma,
    habitosHoy: { completados: 1, total: 3 },
    ejeDe: (id: string) => ejes[id] ?? null,
    puedeVerManana,
    onVerManana,
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
const tarjeta = () => conEtiqueta('Cierra tu día, 2 minutos') ?? conEtiqueta('Día cerrado');
const pulsar = (n: ReactTestInstance) => act(async () => { n.props.onPress(); });
const tocarTexto = (texto: string) => {
  const t = raiz!.root.findAll(n => n.type === 'Text' && textosDeNodos([n]).includes(texto))[0];
  // El tocable más interno que contiene ese texto (el último de la búsqueda en profundidad).
  const n = raiz!.root.findAll(x => typeof x.props.onPress === 'function' && x.findAll(y => y === t).length > 0).at(-1);
  if (!n) throw new Error(`No hay «${texto}» tocable`);
  return pulsar(n);
};
const diasDeLaSemana = () => unicos(raiz!.root.findAll(n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function'));
const diaDeLaSemana = (rotulo: string) => diasDeLaSemana().find(n => String(n.props.accessibilityLabel).startsWith(rotulo))!;
const pedidosDelCierre = () => mockPedidos.filter(p => p.ruta.includes('/rocks/day-closure'));

beforeEach(() => {
  jest.useFakeTimers();
  mockPedidos.length = 0;
  mockRespuestas.clear();
  mockEnfocada = true;
  mockPlanPrendido = true;
  [onVerManana, mockAlert, mockLogro].forEach(m => m.mockReset());
  mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES));
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
});

describe('la tarjeta está siempre', () => {
  it.each(['00:30', '06:00', '14:00', '21:00', '23:30'])('a las %s está, y el cierre de hoy se lee desde que Plan está a la vista', async hora => {
    await montar({}, lima(JUEVES, hora));
    expect(tarjeta()).toBeDefined();
    expect(hay('Cierra tu día')).toBe(true);
    expect(hay('2 minutos · opcional, no da puntos')).toBe(true);
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual([`/api/v1/rocks/day-closure?date=${JUEVES}`]);
  });

  it('no depende de ninguna hora ni de ningún hábito: no lleva hora y lo que oye el lector empieza por «Cierra tu día»', async () => {
    await montar({}, lima(JUEVES, '22:10'));
    const etiqueta = String(tarjeta()!.props.accessibilityLabel);
    expect(etiqueta).not.toMatch(/\d{1,2}:\d{2}|Sin hora/);
    expect(etiqueta.startsWith('Cierra tu día')).toBe(true);
    expect(etiqueta).toContain('opcional, no da puntos');
    expect(tarjeta()!.props.accessibilityRole).toBe('button');
  });

  it('cerrada, tampoco lleva hora de título: cuándo cerró lo dice su texto', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES, { estado: 'CERRADO', cerradoEn: '2026-10-30T04:50:00Z', acciones: [] }));
    await montar({}, lima(JUEVES, '23:55'));
    const etiqueta = String(tarjeta()!.props.accessibilityLabel);
    expect(etiqueta).toContain('Día cerrado');
    expect(etiqueta).toContain('Cerrado a las 23:50');
    expect(etiqueta).toContain('toca para cambiar tu cierre');
  });

  it('sin Mapa activo, sin acciones agendadas, sin nada: igual está (decisión 033-3 A) y se puede cerrar con la nota del día', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES, { acciones: [] }));
    await montar({ puedeVerManana: false }, lima(JUEVES, '14:00'));
    expect(tarjeta()).toBeDefined();
    await pulsar(tarjeta()!);
    expect(hay('Hoy no tenías acciones.')).toBe(true);
    expect(hay('Tu nota del día')).toBe(true);
  });
});

describe('cuándo NO hay tarjeta', () => {
  it('con un backend sin la ruta (404) Plan queda como siempre', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, new ApiError(404, 'No existe'));
    await montar({}, lima(JUEVES, '22:10'));
    expect(pedidosDelCierre()).toHaveLength(1);
    expect(tarjeta()).toBeUndefined();
    expect(hay('Cierra tu día')).toBe(false);
  });

  it('con una respuesta que no es un cierre (un backend que contesta otra cosa) tampoco', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, []);
    await montar({}, lima(JUEVES, '22:10'));
    expect(tarjeta()).toBeUndefined();
  });

  it('con un fallo de red no se dibuja (nada de parpadeos) y se reintenta al volver al foco', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, new ApiError(0, 'Sin red'));
    await montar({}, lima(JUEVES, '22:10'));
    expect(tarjeta()).toBeUndefined();
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES));
    mockEnfocada = false;
    await actualizar({});
    mockEnfocada = true;
    await actualizar({});
    expect(tarjeta()).toBeDefined();
  });

  it('con el plan apagado (Soporte TI) no se lee nada y no hay tarjeta', async () => {
    mockPlanPrendido = false;
    await montar({}, lima(JUEVES, '22:10'));
    expect(pedidosDelCierre()).toEqual([]);
    expect(tarjeta()).toBeUndefined();
  });

  it('con Plan fuera de vista no lee', async () => {
    mockEnfocada = false;
    await montar({}, lima(JUEVES, '22:10'));
    expect(pedidosDelCierre()).toEqual([]);
  });

  it('al pasar la medianoche la tarjeta de ayer no queda en hoy: es la del día nuevo, sin cerrar', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES, { estado: 'CERRADO', cerradoEn: '2026-10-30T03:30:00Z', acciones: [] }));
    await montar({}, lima(JUEVES, '23:00'));
    expect(String(tarjeta()!.props.accessibilityLabel)).toContain('Día cerrado');
    mockRespuestas.set('day-closure?date=2026-10-30', () => cierreDe('2026-10-30'));
    await irA(lima('2026-10-30', '00:05'));
    expect(hay('Día cerrado')).toBe(false);
    expect(String(tarjeta()!.props.accessibilityLabel)).toContain('Cierra tu día, 2 minutos');
    expect(pedidosDelCierre().map(p => p.ruta)).toContain('/api/v1/rocks/day-closure?date=2026-10-30');
  });
});

describe('la hoja y el cierre', () => {
  it('tocar la tarjeta abre «Cierra tu día», relee el día y no escribe nada', async () => {
    await montar({}, lima(JUEVES, '22:10'));
    mockPedidos.length = 0;
    await pulsar(tarjeta()!);
    expect(pedidosDelCierre().map(p => `${p.metodo} ${p.ruta}`)).toEqual([`GET /api/v1/rocks/day-closure?date=${JUEVES}`]);
    expect(hay('Jueves 29 · Día 20')).toBe(true);
    expect(hay('Revisar las facturas')).toBe(true);
    expect(hay('1 de 3 hechos hoy. No hace falta responder nada.')).toBe(true);
  });

  it('cada acción pendiente lleva el ícono de su eje (Cuerpo → activity); sin eje conocido, el neutro (target)', async () => {
    await montar({ ejes: { 'a-2': 'CUERPO' } }, lima(JUEVES, '22:10'));
    await pulsar(tarjeta()!);
    expect(raiz!.root.findAll(n => n.props.name === 'activity').length).toBeGreaterThan(0);
    expect(raiz!.root.findAll(n => n.props.name === 'target')).toHaveLength(0);
    act(() => raiz?.unmount());
    raiz = null;

    await montar({}, lima(JUEVES, '22:10'));
    await pulsar(tarjeta()!);
    expect(raiz!.root.findAll(n => n.props.name === 'target').length).toBeGreaterThan(0);
  });

  it('al guardar la tarjeta queda en verde «Día cerrado» con lo de mañana, en su lugar, con un solo logro y sin puntos', async () => {
    mockRespuestas.set(`PUT /api/v1/rocks/day-closure`, () =>
      cierreDe(JUEVES, { estado: 'CERRADO', cerradoEn: '2026-10-30T03:12:00Z', acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }] }),
    );
    await montar({}, lima(JUEVES, '22:10'));
    await pulsar(tarjeta()!);
    await guardarElCierre();
    expect(mockPedidos.filter(p => p.metodo === 'PUT')).toHaveLength(1);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(hay('Mañana: «Revisar las facturas», a otra hora.')).toBe(true);
    const etiqueta = String(tarjeta()!.props.accessibilityLabel);
    expect(etiqueta).toContain('Día cerrado');
    expect(etiqueta).toContain('Mañana: «Revisar las facturas» a otra hora');
    expect(hay('+')).toBe(false);
    expect(mockPedidos.filter(p => /evidence|complete/.test(p.ruta))).toEqual([]);
  });

  it('un cierre ya hecho se puede volver a abrir y cambiar (la tarjeta verde sigue siendo un botón)', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () =>
      cierreDe(JUEVES, { estado: 'CERRADO', cerradoEn: '2026-10-30T03:12:00Z', acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_ENERGIA', manana: 'DEJARLA', nota: null } }] }),
    );
    await montar({}, lima(JUEVES, '22:10'));
    expect(String(tarjeta()!.props.accessibilityLabel)).toContain('toca para cambiar tu cierre');
    await pulsar(tarjeta()!);
    const elegidos = raiz!.root
      .findAll(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityState?.selected === true)
      .map(n => String(n.props.accessibilityLabel));
    expect([...new Set(elegidos)]).toEqual(['Me faltó energía', 'Dejarla']);
  });

  it('«Ver mañana en Plan» se ofrece (también el DOMINGO) y solo mueve: cierra la hoja y avisa a Plan, sin escribir nada más', async () => {
    mockRespuestas.set(`day-closure?date=${DOMINGO}`, () => cierreDe(DOMINGO));
    mockRespuestas.set(`PUT /api/v1/rocks/day-closure`, () =>
      cierreDe(DOMINGO, { estado: 'CERRADO', acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }] }),
    );
    await montar({}, lima(DOMINGO, '22:10'));
    await pulsar(tarjeta()!);
    await guardarElCierre();
    expect(hay('Día cerrado')).toBe(true);
    mockPedidos.length = 0;
    await tocarTexto('Ver mañana en Plan');
    await avanzar(500);
    expect(onVerManana).toHaveBeenCalledTimes(1);
    expect(hay('Guardar mi cierre')).toBe(false);
    expect(hay('Ver mañana en Plan')).toBe(false);
    expect(mockPedidos).toEqual([]);
  });

  it('sin acciones que ver (sin Mapa) no se ofrece «Ver mañana en Plan»', async () => {
    mockRespuestas.set(`PUT /api/v1/rocks/day-closure`, () =>
      cierreDe(JUEVES, { estado: 'CERRADO', acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }] }),
    );
    await montar({ puedeVerManana: false }, lima(JUEVES, '22:10'));
    await pulsar(tarjeta()!);
    await guardarElCierre();
    expect(hay('Día cerrado')).toBe(true);
    expect(hay('Ver mañana en Plan')).toBe(false);
    expect(hay('Listo')).toBe(true);
  });

  it('un 409 («ese día ya cerró»): cierra la hoja, relee y avisa; no queda «Día cerrado» ni se anuncian puntos', async () => {
    mockRespuestas.set(`PUT /api/v1/rocks/day-closure`, new ApiError(409, 'Ese día ya cerró y no se puede cerrar tarde.'));
    await montar({}, lima(JUEVES, '22:10'));
    await pulsar(tarjeta()!);
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
    mockRespuestas.set('day-closure?date=2026-10-28', () =>
      cierreDe('2026-10-28', {
        estado: 'CERRADO',
        cerradoEn: '2026-10-29T03:00:00Z',
        puedeCerrar: false,
        semana: null,
        nota: 'Un buen día',
        acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }],
      }),
    );
    mockRespuestas.set('day-closure?date=2026-10-27', () => cierreDe('2026-10-27', { estado: 'SIN_CERRAR', puedeCerrar: false, semana: null }));
  });

  it('abrir Plan no lee ningún cierre anterior: solo el de hoy; los siete días están, y solo los que ya pasaron se tocan', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual([`/api/v1/rocks/day-closure?date=${JUEVES}`]);
    const dias = diasDeLaSemana();
    expect(dias).toHaveLength(7);
    const sinTocar = dias.filter(n => n.props.accessibilityState?.disabled === true).map(n => String(n.props.accessibilityLabel));
    expect(sinTocar).toEqual(['Jueves 29, hoy, no se puede ver', 'Viernes 30, no se puede ver', 'Sábado 31, no se puede ver', 'Domingo 1, no se puede ver']);
    expect(hay('Toca un día que ya pasó para ver cómo quedó. Un día que terminó no se puede cerrar.')).toBe(true);
  });

  it('tocar el miércoles lee SU cierre una vez y dice «Cerrado a las 22:00» con lo que respondió; el martes dice «Sin cerrar»', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    await pulsar(diaDeLaSemana('Miércoles 28'));
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual([`/api/v1/rocks/day-closure?date=${JUEVES}`, '/api/v1/rocks/day-closure?date=2026-10-28']);
    expect(textos()).toContain('Miércoles 28 · Cerrado a las 22:00');
    expect(textos()).toContain('«Revisar las facturas»: No me alcanzó el tiempo → Hacerla a otra hora');
    expect(textos()).toContain('Tu nota: Un buen día');

    await pulsar(diaDeLaSemana('Martes 27'));
    expect(textos()).toContain('Martes 27 · Sin cerrar');
  });

  it('volver a tocar el mismo día no vuelve a leer; es una lectura por fecha', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    for (let i = 0; i < 4; i++) {
      await pulsar(diaDeLaSemana('Miércoles 28'));
      await pulsar(diaDeLaSemana('Martes 27'));
    }
    expect(pedidosDelCierre().filter(p => p.ruta.includes('2026-10-28'))).toHaveLength(1);
  });

  it('un día anterior es solo para mirar: no hay ningún botón de cerrarlo, ni se abre hoja, ni se escribe nada', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    await pulsar(diaDeLaSemana('Martes 27'));
    expect(hay('Guardar mi cierre')).toBe(false);
    expect(hay('Cerrar este día')).toBe(false);
    expect(mockPedidos.filter(p => p.metodo !== 'GET')).toEqual([]);
    expect(hay('Cargando tu día')).toBe(false);
  });

  it('sin la ruta (404) ese día lo dice sin inventar nada', async () => {
    mockRespuestas.set('day-closure?date=2026-10-28', new ApiError(404, 'No existe'));
    await montar({}, lima(JUEVES, '10:00'));
    await pulsar(diaDeLaSemana('Miércoles 28'));
    expect(hay('No hay un cierre de ese día para mostrar.')).toBe(true);
    expect(hay('Cerrado')).toBe(false);
  });

  it('un fallo de red dice qué pasó y «Reintentar» lo vuelve a pedir', async () => {
    mockRespuestas.set('day-closure?date=2026-10-28', new ApiError(0, 'Sin red'));
    await montar({}, lima(JUEVES, '10:00'));
    await pulsar(diaDeLaSemana('Miércoles 28'));
    expect(hay('No pudimos cargar este día.')).toBe(true);
    mockRespuestas.set('day-closure?date=2026-10-28', () => cierreDe('2026-10-28', { estado: 'CERRADO', cerradoEn: '2026-10-29T03:00:00Z', puedeCerrar: false, semana: null, acciones: [] }));
    await tocarTexto('Reintentar');
    expect(textos()).toContain('Miércoles 28 · Cerrado a las 22:00');
  });

  it('el lunes, o el Día 1 si es hoy, no hay días anteriores: la semana no se dibuja', async () => {
    await montar({}, lima('2026-10-26', '10:00'));
    expect(diasDeLaSemana()).toHaveLength(0);
    expect(hay('Tus cierres de la semana')).toBe(false);
  });

  it('sin saber el día del programa (todavía sin /home) no se pide ni se ofrece ningún día', async () => {
    await montar({ diaPrograma: null }, lima(JUEVES, '10:00'));
    expect(diasDeLaSemana()).toHaveLength(0);
    expect(tarjeta()).toBeDefined();
  });
});

/* ------------------------------------------------------------------------------------------------
 * Casos pedidos por el dueño (2026-10-30). Aquí se DESCRIBE cómo se comporta la regla con quien trabaja de noche o cierra
 * temprano; no se inventa ninguna regla nueva. El día es siempre el día calendario de la persona (Lima).
 * ---------------------------------------------------------------------------------------------- */

const VIERNES = '2026-10-30';
const cuerposDelPut = () => mockPedidos.filter(p => p.metodo === 'PUT').map(p => p.cuerpo as { fecha: string; acciones: Array<{ id: string }> });
const guardarElCierre = async () => {
  await tocarTexto('No me alcanzó el tiempo');
  await tocarTexto('Hacerla a otra hora');
  await tocarTexto('Guardar mi cierre');
};
const CERRADO_CON = (fecha: string, extra: object = {}) =>
  cierreDe(fecha, { estado: 'CERRADO', cerradoEn: `${fecha}T05:00:00Z`, acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }], ...extra });

describe('caso 1 · turno de noche cierra su día a las 23:50', () => {
  it('el cierre se guarda en el día de hoy (el calendario de su zona), la tarjeta queda en verde y sin hora', async () => {
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(JUEVES));
    await montar({}, lima(JUEVES, '23:50'));
    expect(tarjeta()).toBeDefined();
    await pulsar(tarjeta()!);
    await guardarElCierre();
    expect(cuerposDelPut()).toHaveLength(1);
    expect(cuerposDelPut()[0].fecha).toBe(JUEVES);
    expect(cuerposDelPut()[0].acciones.map(a => a.id)).toEqual(['a-2']);
    const etiqueta = String(tarjeta()!.props.accessibilityLabel);
    expect(etiqueta).toContain('Día cerrado');
    expect(etiqueta).toContain('Mañana: «Revisar las facturas» a otra hora');
    expect(etiqueta).not.toMatch(/\d{1,2}:\d{2}|Sin hora/);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('la tarjeta está a las 06:00 y a las 14:00 (no espera a ninguna hora)', async () => {
    await montar({}, lima(JUEVES, '06:00'));
    expect(tarjeta()).toBeDefined();
    await irA(lima(JUEVES, '14:00'));
    expect(tarjeta()).toBeDefined();
  });
});

describe('caso 2 · la misma persona abre Plan después de la medianoche (00:30 y 02:00)', () => {
  beforeEach(() => {
    // Jueves: no lo cerró. Viernes: el día nuevo, todavía abierto.
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES, { estado: 'SIN_CERRAR', puedeCerrar: false, semana: null }));
    mockRespuestas.set(`day-closure?date=${VIERNES}`, () => cierreDe(VIERNES));
  });

  it('ve el día NUEVO (viernes 30): la tarjeta es del día nuevo, con su propia lectura', async () => {
    await montar({}, lima(VIERNES, '00:30'));
    expect(String(tarjeta()!.props.accessibilityLabel)).toContain('Cierra tu día, 2 minutos');
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual([`/api/v1/rocks/day-closure?date=${VIERNES}`]);
    await irA(lima(VIERNES, '02:00'));
    expect(tarjeta()).toBeDefined();
  });

  it('cerrar a las 00:30 o a las 02:00 cierra el día NUEVO (viernes), no el jueves en que empezó su turno', async () => {
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(VIERNES));
    await montar({}, lima(VIERNES, '02:00'));
    await pulsar(tarjeta()!);
    await guardarElCierre();
    expect(cuerposDelPut().map(c => c.fecha)).toEqual([VIERNES]);
  });

  it('el jueves queda «Sin cerrar» y ya no se puede cerrar: es solo texto y no se envía nada', async () => {
    await montar({}, lima(VIERNES, '00:30'));
    await pulsar(diaDeLaSemana('Jueves 29'));
    expect(pedidosDelCierre().map(p => p.ruta)).toContain(`/api/v1/rocks/day-closure?date=${JUEVES}`);
    expect(textos()).toContain('Jueves 29 · Sin cerrar');
    expect(hay('Guardar mi cierre')).toBe(false);
    expect(mockPedidos.filter(p => p.metodo !== 'GET')).toEqual([]);
  });

  it('una hoja abierta a las 23:55 que cruza la medianoche se cierra; no se reasigna el cierre al viernes', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => cierreDe(JUEVES)); // a las 23:55 el jueves todavía está abierto
    await montar({}, lima(JUEVES, '23:55'));
    await pulsar(tarjeta()!);
    expect(hay('Guardar mi cierre')).toBe(true);
    await irA(lima(VIERNES, '00:05'));
    expect(hay('Guardar mi cierre')).toBe(false);
    expect(mockPedidos.filter(p => p.metodo === 'PUT')).toEqual([]);
    expect(mockLogro).not.toHaveBeenCalled();
  });
});

describe('caso 3 · cierra temprano (06:00) y después cumple algo más ese mismo día', () => {
  it('a las 06:00 la tarjeta está y se puede cerrar; el cierre es del día de hoy', async () => {
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(JUEVES));
    await montar({}, lima(JUEVES, '06:00'));
    await pulsar(tarjeta()!);
    await guardarElCierre();
    expect(cuerposDelPut()[0].fecha).toBe(JUEVES);
    expect(String(tarjeta()!.props.accessibilityLabel)).toContain('Día cerrado');
  });

  it('si después cumple esa acción, el día SIGUE cerrado (verde), pero ya no se le pregunta por ella', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => CERRADO_CON(JUEVES));
    await montar({}, lima(JUEVES, '06:00'));
    expect(String(tarjeta()!.props.accessibilityLabel)).toContain('Mañana: «Revisar las facturas» a otra hora');
    // Cumplió la acción desde Training u Hoy: el servidor ya no entrega la respuesta de una acción cumplida (spec 017, contrato).
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () =>
      CERRADO_CON(JUEVES, { acciones: [{ ...PENDIENTE, cumplida: true, cumplidaEn: '2026-10-29T17:00:00Z', cierre: null }] }),
    );
    await irA(lima(JUEVES, '12:00'));
    await pulsar(tarjeta()!); // volver a abrir relee el día
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Revisar las facturas, cumplida a las 12:00').length).toBeGreaterThan(0);
    expect(hay('¿Qué pasó?')).toBe(false);
    expect(hay('No te quedó nada pendiente. No hace falta responder nada.')).toBe(true);
  });

  it('se puede volver a abrir y editar el MISMO día: el cierre nuevo reemplaza al anterior', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, () => CERRADO_CON(JUEVES));
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(JUEVES, { acciones: [{ ...PENDIENTE, cierre: { motivo: 'SIN_ENERGIA', manana: 'DEJARLA', nota: null } }] }));
    await montar({}, lima(JUEVES, '06:00'));
    await pulsar(tarjeta()!);
    await tocarTexto('Me faltó energía');
    await tocarTexto('Dejarla');
    await tocarTexto('Guardar mi cierre');
    expect(cuerposDelPut()).toHaveLength(1);
    expect(cuerposDelPut()[0].fecha).toBe(JUEVES);
    expect(String(tarjeta()!.props.accessibilityLabel)).toContain('Mañana: «Revisar las facturas» la dejas');
  });
});

describe('solo se pregunta por lo que ya llegó a su hora (decisión del dueño, 2026-10-30)', () => {
  /* El servidor simulado hace lo que hace el de verdad: con SU reloj y la zona de la persona (Lima) marca `exigeRespuesta`
     de cada pendiente: `true` si no tiene hora o su hora ya llegó, `false` si todavía no. */
  const comoLoDiceElServidor = (accion: typeof PENDIENTE) => {
    const ahora = new Date();
    const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    return { ...accion, exigeRespuesta: !accion.horaInicio || accion.horaInicio.slice(0, 5) <= hhmm };
  };
  const cierreSegunLaHora = () => cierreDe(JUEVES, { acciones: [comoLoDiceElServidor(PENDIENTE)] });

  it('a las 06:00 la hoja NO pregunta por la de las 20:30: se puede guardar sin responder y el PUT no lleva esa acción', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, cierreSegunLaHora);
    mockRespuestas.set('PUT /api/v1/rocks/day-closure', () => CERRADO_CON(JUEVES, { acciones: [{ ...PENDIENTE, exigeRespuesta: false }] }));
    await montar({}, lima(JUEVES, '06:00'));
    await pulsar(tarjeta()!);
    expect(hay('Revisar las facturas')).toBe(true);
    expect(hay('Es a las 20:30 · todavía no llega')).toBe(true);
    expect(hay('¿Qué pasó?')).toBe(false);
    await tocarTexto('Guardar mi cierre');
    expect(cuerposDelPut()).toEqual([{ fecha: JUEVES, acciones: [] }]);
    expect(String(tarjeta()!.props.accessibilityLabel)).toContain('Día cerrado');
    expect(mockLogro).toHaveBeenCalledTimes(1);
  });

  it('a las 21:00 SÍ pregunta por la de las 20:30: sin responder no se puede guardar', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, cierreSegunLaHora);
    await montar({}, lima(JUEVES, '21:00'));
    await pulsar(tarjeta()!);
    expect(hay('Era a las 20:30 · quedó pendiente')).toBe(true);
    expect(hay('¿Qué pasó?')).toBe(true);
    expect(hay('todavía no llega')).toBe(false);
    expect(hay('Elige qué pasó y qué harás mañana con «Revisar las facturas».')).toBe(true);
    expect(mockPedidos.filter(p => p.metodo === 'PUT')).toEqual([]);
  });

  it('la hora llega con Plan abierto: al volver a abrir la hoja (relee el día) ya pregunta', async () => {
    mockRespuestas.set(`day-closure?date=${JUEVES}`, cierreSegunLaHora);
    await montar({}, lima(JUEVES, '20:00'));
    await pulsar(tarjeta()!);
    expect(hay('¿Qué pasó?')).toBe(false);
    jest.setSystemTime(lima(JUEVES, '20:31'));
    await avanzar(31_000);
    // Cerrar y volver a abrir la hoja relee el día con el reloj del servidor.
    const hoja = raiz!.root.findAll(n => typeof n.props.alCerrar === 'function')[0];
    if (hoja) await act(async () => { hoja.props.alCerrar(); });
    await pulsar(tarjeta()!);
    expect(hay('¿Qué pasó?')).toBe(true);
  });
});
