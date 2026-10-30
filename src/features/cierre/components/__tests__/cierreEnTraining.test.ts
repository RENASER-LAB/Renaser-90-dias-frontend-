/**
 * «Cierra tu día» dentro de Training por hora (spec 017), con el cuerpo MONTADO (`TrainingPorHora`), el reloj fijo y la red
 * reemplazada por un doble que anota cada pedido:
 *
 * - la fila aparece 30 min antes de Dormir (21:30 sin Dormir), nunca antes, y solo entonces se lee el cierre;
 * - es la última de hoy y no cuenta: ni «N de M hechos», ni puntos, ni atraso, ni «Te toca ahora»;
 * - tocarla abre la hoja; al guardar queda en verde «Día cerrado» con lo de mañana y se queda en su lugar;
 * - sin la ruta (404), con el plan apagado o al pasar la medianoche, no hay fila;
 * - un día anterior dice «Cerrado» o «Sin cerrar», se lee SOLO al tocarlo, una vez por fecha, y no se abre.
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

describe('cuándo aparece la fila', () => {
  it('con Dormir a las 22:30 aparece a las 22:00 y no antes; hasta entonces no se lee nada del cierre', async () => {
    await montar({}, lima(JUEVES, '21:40'));
    expect(filaDelCierre()).toBeUndefined();
    expect(pedidosDelCierre()).toEqual([]);

    await irA(lima(JUEVES, '21:59'));
    expect(filaDelCierre()).toBeUndefined();
    expect(pedidosDelCierre()).toEqual([]);

    await irA(lima(JUEVES, '22:00'));
    expect(filaDelCierre()).toBeDefined();
    expect(hay('Cierra tu día')).toBe(true);
    expect(hay('2 minutos')).toBe(true);
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual([`/api/v1/rocks/day-closure?date=${JUEVES}`]);
  });

  it('sin Dormir hoy aparece a las 21:30', async () => {
    await montar({ habits: [ESCRITURA] }, lima(JUEVES, '21:29'));
    expect(filaDelCierre()).toBeUndefined();
    await irA(lima(JUEVES, '21:31'));
    expect(filaDelCierre()).toBeDefined();
  });

  it('con Dormir pasada la medianoche (00:10) la fila está desde las 00:00', async () => {
    await montar({ habits: [habito('dormir', 'Dormir', '00:10', { systemKey: 'SLEEP' })] }, lima(JUEVES, '09:00'));
    expect(filaDelCierre()).toBeDefined();
  });

  it('es la última de hoy: queda entre lo último y Dormir, por su hora', async () => {
    await montar({}, lima(JUEVES, '22:10'));
    const horas = textos().filter(t => ['21:30', '22:00', '22:30'].includes(t));
    expect(horas).toEqual(['21:30', '22:00', '22:30']);
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

  it('al pasar la medianoche la fila de ayer no queda en hoy', async () => {
    await montar({}, lima(JUEVES, '23:00'));
    expect(filaDelCierre()).toBeDefined();
    jest.setSystemTime(lima('2026-10-30', '00:05'));
    mockRespuestas.set('day-closure?date=2026-10-30', () => cierreDe('2026-10-30'));
    await actualizar({ hoyIso: '2026-10-30' });
    await avanzar(31_000);
    expect(filaDelCierre()).toBeUndefined();
    expect(hay('Día cerrado')).toBe(false);
    // Todavía no es la hora del día nuevo (22:00): ni siquiera se lee.
    expect(pedidosDelCierre().map(p => p.ruta)).not.toContain('/api/v1/rocks/day-closure?date=2026-10-30');
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

  it('abrir Training no lee ningún cierre anterior (y antes de la hora, ninguno)', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    expect(pedidosDelCierre()).toEqual([]);
    expect(new Set(etiquetasDeLaSemana()).size).toBe(7);
  });

  it('tocar el miércoles lee SU cierre una vez y dice «Cerrado»; el martes dice «Sin cerrar»', async () => {
    await montar({}, lima(JUEVES, '10:00'));
    await pulsar(dia('Miércoles 28'));
    expect(pedidosDelCierre().map(p => p.ruta)).toEqual(['/api/v1/rocks/day-closure?date=2026-10-28']);
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
