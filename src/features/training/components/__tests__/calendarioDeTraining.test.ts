/**
 * El calendario de Training por hora (spec 014) con el cuerpo de la pantalla MONTADO (`TrainingPorHora`), fechas fijas y
 * el servidor reemplazado por un doble que anota cada pedido:
 *
 * - caso 1 · DOMINGO       — la fila es lunes 26 a domingo 1; el domingo viene elegido; ningún día «viene»;
 * - caso 2 · LUNES         — la fila es lunes 2 a domingo 8; tocar cualquier día NO pide ningún día al servidor;
 * - caso 3 · MEDIANOCHE    — con `useTraining` + `useActualizacionDelDia` de verdad: al pasar de domingo 23:59:59 a lunes
 *                            00:00:00 con la app abierta, la fila pasa a la semana nueva, el día elegido pasa a hoy y
 *                            una hoja abierta del domingo se cierra y no abre ningún registro pendiente;
 * - caso 4 · DÍA 1 A MITAD DE SEMANA — «Tu programa empezó después de este día.» y esos días no se piden;
 * - caso 5 · RELOJ DISTINTO — la semana y «hoy» salen del `hoyIso` del servidor, no del reloj del teléfono.
 *
 * Calendario de 2026 (jest corre en `America/Lima`, UTC−5): jue 29/10 · vie 30 · sáb 31 · dom 1/11 · lun 2/11.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import type { HabitItem } from '../../../../screens/TrainingScreen';
import type { DatosEntrenamiento } from '../../api/cargarEntrenamiento';

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

/** Cada pedido que sale de la app. */
const mockPedidos: { ruta: string; metodo: string }[] = [];
jest.mock('../../../../services/http/apiClient', () => ({
  ...(jest.requireActual('../../../../services/http/apiClient') as object),
  apiFetch: async (ruta: string, opciones?: { method?: string }) => {
    mockPedidos.push({ ruta, metodo: opciones?.method ?? 'GET' });
    if (ruta.includes('/habit-preferences')) return { habits: [] };
    if (ruta.includes('/rocks/upcoming')) return { desde: '2026-10-26', hasta: '2026-11-08', rocas: [] };
    return [];
  },
}));

/**
 * La hoja de abajo, reemplazada por un doble que no hace nada solo. La de verdad le avisa a `HojaDelHabito` que ya se fue
 * (`alTerminarDeCerrar`) a los pocos milisegundos de bajar; acá la prueba decide CUÁNDO llega ese aviso (antes o después
 * de la medianoche). Lo que hace la hoja de verdad lo prueba `hojaDelHabito.test.ts` y las de `components/hojaDesdeAbajo`.
 */
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({
  HojaDesdeAbajo: (props: { visible: boolean; titulo: string; children: unknown; pie?: unknown }) => {
    const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    const React_ = jest.requireActual<typeof import('react')>('react');
    return props.visible
      ? React_.createElement(View, null, React_.createElement(Text, null, props.titulo), props.children as never, props.pie as never)
      : null;
  },
}));

/** La lectura de Training que usa el `useTraining` de verdad (solo la red se reemplaza). */
const mockCargar = jest.fn<() => Promise<DatosEntrenamiento>>();
jest.mock('../../api/cargarEntrenamiento', () => ({ cargarEntrenamiento: () => mockCargar() }));

import { fechaEnZona, zonaDelTelefono } from '../../../eventos/utils/zonaHoraria';
import { useTraining } from '../../hooks/useTraining';
import { accionDeLaHoja } from '../../utils/filaDelDia';
import type { ItemDelDia } from '../../utils/itemsDelDia';
import { HojaDelHabito } from '../HojaDelHabito';
import { TrainingPorHora } from '../TrainingPorHora';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* ---------------------------------------------------------------------------------------------------------------
 * Ayudas
 * ------------------------------------------------------------------------------------------------------------- */
const habito = (id: string, hora: string, extra: Partial<HabitItem> = {}): HabitItem => ({
  id,
  habitoId: `h-${id}`,
  dimension: 'CUERPO',
  title: `Hábito ${id}`,
  time: hora,
  tag: 'Innegociable',
  streak: null,
  done: false,
  hasEvidence: false,
  tieneTrackHoy: true,
  estado: 'PENDIENTE',
  evidenceRequirement: 'REQUIRED',
  ...extra,
});
const guia = { secciones: [{ titulo: 'Qué hacer', texto: 'Bebe agua.' }] };

const onRegistrar = jest.fn<(h: HabitItem) => void>();
const onMarcar = jest.fn<(h: HabitItem) => void>();
let raiz: ReactTestRenderer | null = null;

const textosDeNodos = (nodos: ReactTestInstance[]): string =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .join(' | ');
const textos = (): string => textosDeNodos(raiz!.root.findAll(() => true));
const titulo = (): string =>
  textosDeNodos(raiz!.root.findAll(n => n.type === 'Text' && n.props.accessibilityRole === 'header'));

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
const pastillas = () =>
  unicos(raiz!.root.findAll(n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function'));
/** Lo que dice la fila de la semana, de izquierda a derecha («Lunes 26», …, «Domingo 1, hoy»). */
const rotulosDeLaSemana = () => pastillas().map(n => String(n.props.accessibilityLabel));
const diaElegidoEnLaFila = () => pastillas().find(n => n.props.accessibilityState?.selected === true)?.props.accessibilityLabel;
const pulsar = (n: ReactTestInstance) => act(async () => { n.props.onPress(); });
const tocarDia = (rotulo: string) => {
  const pastilla = pastillas().find(n => n.props.accessibilityLabel === rotulo);
  if (!pastilla) throw new Error(`No hay un día «${rotulo}» en la fila: ${rotulosDeLaSemana().join(', ')}`);
  return pulsar(pastilla);
};
const tocarFila = (parte: string) => {
  const fila = unicos(raiz!.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel)).find(n =>
    String(n.props.accessibilityLabel).includes(parte),
  );
  if (!fila) throw new Error(`No hay una fila «${parte}»`);
  return pulsar(fila);
};
const pedidosDeDias = () => mockPedidos.filter(p => p.ruta.includes('/habit-tracks/day')).map(p => decodeURIComponent(p.ruta.split('date=')[1]));
const pedidosDelPlan = () => mockPedidos.filter(p => p.ruta.includes('/habit-preferences') || p.ruta.includes('/rocks/upcoming'));
const hoja = () => raiz!.root.findAll(n => (n.type as unknown) === HojaDelHabito)[0];

/**
 * El cuerpo de Training con el día elegido guardado en estado y reiniciado cuando cambia `hoyIso`, como lo hace
 * `TrainingScreen` (`useEffect(() => setDiaElegido(null), [hoyIso])`; el espejo de este trozo se vigila en
 * `screens/__tests__/trainingMedianoche.test.ts`, que monta la pantalla de verdad).
 */
function Cuerpo(props: { hoyIso: string; diaPrograma: number | null; habits: HabitItem[]; cuenta: string; estado?: 'cargando' | 'error' | 'listo'; mostrar?: boolean }) {
  const [dia, setDia] = React.useState<string | null>(null);
  React.useEffect(() => { setDia(null); }, [props.hoyIso]);
  // `mostrar = false`: el engranaje («Tus prácticas») ocupa el lugar del cuerpo; el día elegido lo guarda la pantalla.
  if (props.mostrar === false) return null;
  return React.createElement(TrainingPorHora, {
    activa: true,
    estado: props.estado ?? 'listo',
    mensajeDeError: null,
    onReintentar: () => undefined,
    cuentaId: props.cuenta,
    habits: props.habits,
    planHabits: [],
    hoyIso: props.hoyIso,
    diaElegido: dia,
    onElegirDia: setDia,
    diaPrograma: props.diaPrograma,
    fase: null,
    titulos: {},
    eventosPrendidos: false,
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
async function montarCuerpo(props: { hoyIso: string; diaPrograma: number | null; habits?: HabitItem[] }) {
  const cuenta = `calendario-${++numeroDeCuenta}`;
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Cuerpo, { habits: [], ...props, cuenta }));
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPedidos.length = 0;
  mockCargar.mockReset();
  onRegistrar.mockReset();
  onMarcar.mockReset();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

/* ---------------------------------------------------------------------------------------------------------------
 * 1 · DOMINGO
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 1 · DOMINGO (hoyIso = dom 1/11)', () => {
  beforeEach(() => jest.setSystemTime(new Date('2026-11-01T15:00:00Z'))); // domingo 10:00 en Lima

  it('DOMINGO: la fila es lunes 26 … domingo 1 (SU semana), el domingo viene elegido y es el título', async () => {
    await montarCuerpo({ hoyIso: '2026-11-01', diaPrograma: 40, habits: [habito('a', '06:00')] });
    expect(rotulosDeLaSemana()).toEqual([
      'Lunes 26', 'Martes 27', 'Miércoles 28', 'Jueves 29', 'Viernes 30', 'Sábado 31', 'Domingo 1, hoy',
    ]);
    expect(diaElegidoEnLaFila()).toBe('Domingo 1, hoy');
    expect(titulo()).toBe('Domingo 1');
    // La semana que viene NO se ofrece el domingo (a diferencia de la fila de Planificar): no hay un «Lunes 2».
    expect(rotulosDeLaSemana()).not.toContain('Lunes 2');
    expect(rotulosDeLaSemana()).not.toContain('Lunes 2, hoy');
  });

  it('DOMINGO: abrir Training el domingo no pide ningún día al servidor', async () => {
    await montarCuerpo({ hoyIso: '2026-11-01', diaPrograma: 40 });
    expect(pedidosDeDias()).toEqual([]);
    expect(pedidosDelPlan()).toEqual([]);
  });

  it('DOMINGO: lunes a sábado son días anteriores: cada uno se lee del servidor UNA vez, y nunca se toca nada que "venga"', async () => {
    await montarCuerpo({ hoyIso: '2026-11-01', diaPrograma: 40 });
    const dias = ['Lunes 26', 'Martes 27', 'Miércoles 28', 'Jueves 29', 'Viernes 30', 'Sábado 31'];
    for (const rotulo of dias) await tocarDia(rotulo);
    for (const rotulo of dias) await tocarDia(rotulo); // segunda vuelta: ya están en memoria
    expect(pedidosDeDias()).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
    expect(textos()).not.toContain('Es tu planificación'); // eso es de los días que vienen: el domingo no tiene
    // El servidor devolvió [] para esos días: dice que no hubo hábitos, y no pidió lo planificado.
    expect(textos()).toContain('Ese día no tuviste hábitos registrados.');
    expect(pedidosDelPlan()).toEqual([]);
  });

  it('DOMINGO: tocar el domingo (hoy) desde otro día vuelve a la lista de hoy sin pedir nada', async () => {
    await montarCuerpo({ hoyIso: '2026-11-01', diaPrograma: 40, habits: [habito('a', '06:00')] });
    await tocarDia('Sábado 31');
    const antes = mockPedidos.length;
    await tocarDia('Domingo 1, hoy');
    expect(titulo()).toBe('Domingo 1');
    expect(diaElegidoEnLaFila()).toBe('Domingo 1, hoy');
    expect(mockPedidos.length).toBe(antes);
    expect(textos()).toContain('Hábito a');
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 2 · LUNES
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 2 · LUNES (hoyIso = lun 2/11)', () => {
  beforeEach(() => jest.setSystemTime(new Date('2026-11-02T11:00:00Z'))); // lunes 06:00 en Lima

  it('LUNES: la fila es lunes 2 … domingo 8, el lunes viene elegido y no queda nada de la semana anterior', async () => {
    await montarCuerpo({ hoyIso: '2026-11-02', diaPrograma: 40, habits: [habito('a', '06:00')] });
    expect(rotulosDeLaSemana()).toEqual([
      'Lunes 2, hoy', 'Martes 3', 'Miércoles 4', 'Jueves 5', 'Viernes 6', 'Sábado 7', 'Domingo 8',
    ]);
    expect(diaElegidoEnLaFila()).toBe('Lunes 2, hoy');
    expect(titulo()).toBe('Lunes 2');
    expect(rotulosDeLaSemana().some(r => r.startsWith('Domingo 1'))).toBe(false);
  });

  it('LUNES: tocar martes a domingo muestra lo PLANIFICADO y NO pide ningún día al servidor (no hay días cerrados)', async () => {
    await montarCuerpo({ hoyIso: '2026-11-02', diaPrograma: 40 });
    for (const rotulo of ['Martes 3', 'Miércoles 4', 'Jueves 5', 'Viernes 6', 'Sábado 7', 'Domingo 8']) {
      await tocarDia(rotulo);
      expect(textos()).toContain('Es tu planificación. Para cambiar una hora, toca el engranaje.');
    }
    expect(pedidosDeDias()).toEqual([]);
    // Lo planificado (horas por día y acciones agendadas) se pide la primera vez, una sola vez cada cosa.
    expect(pedidosDelPlan().filter(p => p.ruta.includes('/habit-preferences'))).toHaveLength(1);
    expect(pedidosDelPlan().filter(p => p.ruta.includes('/rocks/upcoming'))).toHaveLength(1);
    expect(mockPedidos.every(p => p.metodo === 'GET')).toBe(true);
  });

  it('LUNES: ni siquiera con el Día 1 lejano ningún día de la fila se lee del servidor, y el lunes sigue siendo hoy', async () => {
    await montarCuerpo({ hoyIso: '2026-11-02', diaPrograma: 200 });
    for (const rotulo of ['Martes 3', 'Lunes 2, hoy', 'Domingo 8', 'Lunes 2, hoy']) await tocarDia(rotulo);
    expect(pedidosDeDias()).toEqual([]);
    expect(titulo()).toBe('Lunes 2');
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 4 · DÍA 1 A MITAD DE SEMANA
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 4 · el Día 1 cae a mitad de semana (hoy = vie 30/10, Día 3 → Día 1 = mié 28/10)', () => {
  beforeEach(() => jest.setSystemTime(new Date('2026-10-30T15:00:00Z')));

  it('PROGRAMA: lunes y martes dicen «Tu programa empezó después de este día.», sin lista ni pedidos', async () => {
    await montarCuerpo({ hoyIso: '2026-10-30', diaPrograma: 3, habits: [habito('a', '06:00')] });
    for (const rotulo of ['Lunes 26', 'Martes 27']) {
      await tocarDia(rotulo);
      expect(textos()).toContain('Tu programa empezó después de este día.');
      expect(textos()).not.toContain('Hábito a');
      expect(textos()).not.toContain('Así lo planificaste');
    }
    expect(pedidosDeDias()).toEqual([]);
  });

  it('PROGRAMA: el miércoles (el Día 1 mismo) y el jueves sí se leen, y ya no dicen «empezó después»', async () => {
    await montarCuerpo({ hoyIso: '2026-10-30', diaPrograma: 3 });
    await tocarDia('Lunes 26');
    await tocarDia('Miércoles 28');
    expect(textos()).not.toContain('Tu programa empezó después de este día.');
    await tocarDia('Jueves 29');
    expect(pedidosDeDias()).toEqual(['2026-10-28', '2026-10-29']);
  });

  it('PROGRAMA: un día que viene (sábado) no se ve afectado: es lo planificado', async () => {
    await montarCuerpo({ hoyIso: '2026-10-30', diaPrograma: 3 });
    await tocarDia('Sábado 31');
    expect(textos()).toContain('Es tu planificación. Para cambiar una hora, toca el engranaje.');
    expect(textos()).not.toContain('Tu programa empezó después de este día.');
  });

  it('PROGRAMA: mientras no se sabe el día del programa (null) no se inventa «empezó después» ni se pide nada', async () => {
    await montarCuerpo({ hoyIso: '2026-10-30', diaPrograma: null });
    await tocarDia('Lunes 26');
    expect(textos()).not.toContain('Tu programa empezó después de este día.');
    expect(pedidosDeDias()).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 5 · RELOJ DEL TELÉFONO DISTINTO AL DEL SERVIDOR
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 5 · el reloj del teléfono no manda', () => {
  it('RELOJ: el teléfono dice domingo 1/11 22:30 y el servidor lunes 2/11: la semana y «hoy» son los del servidor', async () => {
    jest.setSystemTime(new Date('2026-11-02T03:30:00Z')); // dom 1/11, 22:30 en Lima
    expect(fechaEnZona(Date.now(), zonaDelTelefono())).toBe('2026-11-01');
    await montarCuerpo({ hoyIso: '2026-11-02', diaPrograma: 40, habits: [habito('a', '06:00')] });
    expect(rotulosDeLaSemana()).toEqual([
      'Lunes 2, hoy', 'Martes 3', 'Miércoles 4', 'Jueves 5', 'Viernes 6', 'Sábado 7', 'Domingo 8',
    ]);
    expect(titulo()).toBe('Lunes 2');
    expect(diaElegidoEnLaFila()).toBe('Lunes 2, hoy');
    // Nada se pide por la fecha del teléfono: hoy es lunes, así que el domingo 1 ni existe en la fila.
    await tocarDia('Martes 3');
    expect(pedidosDeDias()).toEqual([]);
  });

  it('RELOJ: el teléfono ya en martes 3/11 y el servidor todavía en lunes 2/11: la fila sigue siendo la del lunes', async () => {
    jest.setSystemTime(new Date('2026-11-03T15:00:00Z')); // martes 10:00 en Lima
    await montarCuerpo({ hoyIso: '2026-11-02', diaPrograma: 40 });
    expect(rotulosDeLaSemana()[0]).toBe('Lunes 2, hoy');
    expect(diaElegidoEnLaFila()).toBe('Lunes 2, hoy');
    expect(titulo()).toBe('Lunes 2');
  });

  it('RELOJ (documentado): «Te toca ahora» y «Se te pasó la hora» sí usan los minutos del reloj del TELÉFONO', async () => {
    // El servidor dice lunes; el teléfono marca 22:30 (del domingo). Los minutos de «ahora» salen del teléfono:
    // con 22:30, el hábito de las 06:00 del lunes del servidor aparece como pasado de hora y el de las 22:00 «toca ahora».
    jest.setSystemTime(new Date('2026-11-02T03:30:00Z'));
    await montarCuerpo({
      hoyIso: '2026-11-02',
      diaPrograma: 40,
      habits: [habito('temprano', '06:00'), habito('tarde', '22:00')],
    });
    // «Te toca ahora» ya no se escribe en la fila (pedido del dueño, 29/10): lo oye el lector de pantalla.
    const etiquetas = raiz!.root.findAll(n => typeof n.props.accessibilityLabel === 'string').map(n => n.props.accessibilityLabel as string);
    expect(etiquetas.some(e => e.includes('Te toca ahora'))).toBe(true);
    // Lo atrasado: la sección lo dice una vez a la vista y cada fila lo dice al lector (29/10).
    expect(etiquetas.some(e => e.includes('Hábito temprano') && e.includes('todavía puedes cumplir tu compromiso hoy'))).toBe(true);
    expect(textos()).not.toContain('Todavía puedes cumplir tu compromiso hoy');
    expect(textos()).not.toContain('Te toca ahora');
    expect(textos()).toContain('Se te pasó la hora');
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * 3 · CRUCE DE MEDIANOCHE con la app abierta (useTraining + useActualizacionDelDia + TrainingPorHora de verdad)
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 3 · CRUCE DE MEDIANOCHE domingo 23:59 → lunes 00:00 con la app abierta', () => {
  /** El servidor: el día de Lima (UTC−5) que corre en el instante del reloj, que cierra a la medianoche siguiente. */
  const servidorDeLima = (): DatosEntrenamiento => {
    const ahora = Date.now();
    const fechaLocal = fechaEnZona(ahora, 'America/Lima');
    const [a, m, d] = fechaLocal.split('-').map(Number);
    const cierre = Date.UTC(a, m - 1, d + 1, 5, 0, 0); // 00:00 de Lima = 05:00Z
    return {
      tracks: [],
      catalogo: [],
      planHabits: [],
      rocas: [],
      rocasConEvidencia: new Set(),
      contexto: {
        fechaLocal,
        zonaHoraria: 'America/Lima',
        cierraEn: new Date(cierre).toISOString(),
        ahoraServidor: new Date(ahora).toISOString(),
        recibidoEn: ahora,
        recibidoMonotono: performance.now(),
      },
    };
  };

  /** Los hábitos "de hoy" tal como los entregaría `useTraining` (los de ayer no se ofrecen mientras se recarga). */
  const HABITOS = [habito('con-guia', '06:00', { guia }), habito('otro', '07:00')];

  let ultimoOnRegistrar: jest.Mock<(h: HabitItem) => void>;

  /**
   * Lo mismo que hace `TrainingScreen` con lo que le llega de `useTraining`: `hoyIso = fechaDeHoy ?? hoy del teléfono`,
   * el día elegido que vuelve a hoy cuando cambia `hoyIso`, y `habits` vacío mientras recarga.
   */
  function PantallaDeMedianoche({ cuenta }: { cuenta: string }) {
    const t = useTraining(true);
    const [dia, setDia] = React.useState<string | null>(null);
    const hoyIso = t.fechaDeHoy ?? fechaEnZona(Date.now(), zonaDelTelefono());
    React.useEffect(() => { setDia(null); }, [hoyIso]);
    return React.createElement(TrainingPorHora, {
      activa: true,
      estado: t.loading ? 'cargando' : t.error !== null ? 'error' : 'listo',
      mensajeDeError: t.error,
      onReintentar: () => undefined,
      cuentaId: cuenta,
      habits: t.loading ? [] : HABITOS,
      planHabits: [],
      hoyIso,
      diaElegido: dia,
      onElegirDia: setDia,
      diaPrograma: 40,
      fase: null,
      titulos: {},
      eventosPrendidos: false,
      confirmacion: null,
      onConfirmacionTerminada: () => undefined,
      aperturaPedida: null,
      onAperturaAtendida: () => undefined,
      onRegistrar: ultimoOnRegistrar,
      onMarcar,
      onAbrirEvento: () => undefined,
    });
  }

  async function montarLaPantalla(relojDelTelefono: string) {
    jest.setSystemTime(new Date(relojDelTelefono));
    mockCargar.mockImplementation(async () => servidorDeLima());
    ultimoOnRegistrar = jest.fn<(h: HabitItem) => void>();
    const cuenta = `medianoche-${++numeroDeCuenta}`;
    await act(async () => { raiz = TestRenderer.create(React.createElement(PantallaDeMedianoche, { cuenta })); });
  }
  const avanzar = async (ms: number) => {
    await act(async () => { jest.advanceTimersByTime(ms); });
    await act(async () => { /* deja que se resuelva la relectura */ });
  };

  it('MEDIANOCHE: a las 23:59:30 del domingo la fila es la del domingo; al llegar las 00:00:00 pasa a la semana NUEVA', async () => {
    await montarLaPantalla('2026-11-02T04:59:30Z'); // dom 1/11, 23:59:30 en Lima
    expect(titulo()).toBe('Domingo 1');
    expect(rotulosDeLaSemana()[0]).toBe('Lunes 26');
    expect(rotulosDeLaSemana()[6]).toBe('Domingo 1, hoy');

    await avanzar(29_999); // 23:59:59.999: todavía domingo
    expect(titulo()).toBe('Domingo 1');
    expect(rotulosDeLaSemana()[6]).toBe('Domingo 1, hoy');

    await avanzar(1); // 00:00:00.000: lunes
    expect(mockCargar.mock.calls.length).toBeGreaterThanOrEqual(2); // se releyó el día
    expect(rotulosDeLaSemana()).toEqual([
      'Lunes 2, hoy', 'Martes 3', 'Miércoles 4', 'Jueves 5', 'Viernes 6', 'Sábado 7', 'Domingo 8',
    ]);
    expect(titulo()).toBe('Lunes 2');
    expect(diaElegidoEnLaFila()).toBe('Lunes 2, hoy');
  });

  it('MEDIANOCHE: si se estaba mirando el sábado, el día elegido pasa a hoy (lunes) y no queda el sábado de la semana vieja', async () => {
    await montarLaPantalla('2026-11-02T04:59:30Z');
    await tocarDia('Sábado 31');
    expect(titulo()).toBe('Sábado 31');
    expect(pedidosDeDias()).toEqual(['2026-10-31']);

    await avanzar(30_000);
    expect(titulo()).toBe('Lunes 2');
    expect(diaElegidoEnLaFila()).toBe('Lunes 2, hoy');
    expect(rotulosDeLaSemana().some(r => r.startsWith('Sábado 31'))).toBe(false);
    // Nada más se pidió al servidor por cruzar la medianoche: el lunes no tiene días que leer.
    expect(pedidosDeDias()).toEqual(['2026-10-31']);
  });

  it('MEDIANOCHE: una hoja abierta del domingo se cierra al pasar al lunes y no abre ningún registro pendiente', async () => {
    await montarLaPantalla('2026-11-02T04:59:30Z');
    await tocarFila('Hábito con-guia');
    expect(hoja().props.visible).toBe(true);

    // La persona toca «Tomar foto» en la hoja del domingo: la hoja empieza a irse y el registro quedaría pendiente
    // hasta que termine de bajar (`alTerminarDeCerrar`) ... pero antes pasa la medianoche.
    const item = hoja().props.item as ItemDelDia;
    act(() => { hoja().props.onAccion(item, accionDeLaHoja(item)); });
    expect(hoja().props.visible).toBe(false);
    expect(ultimoOnRegistrar).not.toHaveBeenCalled();

    await avanzar(30_000); // 00:00:00 del lunes
    expect(titulo()).toBe('Lunes 2');

    // Cuando la hoja del domingo termina de irse, NO se abre la cámara de un hábito de ayer.
    act(() => { hoja().props.alTerminarDeCerrar?.(); });
    expect(ultimoOnRegistrar).not.toHaveBeenCalled();
    expect(onMarcar).not.toHaveBeenCalled();
  });

  it('MEDIANOCHE: (control) sin cruzar la medianoche, ese mismo registro pendiente SÍ se abre cuando la hoja se va', async () => {
    await montarLaPantalla('2026-11-02T04:59:30Z');
    await tocarFila('Hábito con-guia');
    const item = hoja().props.item as ItemDelDia;
    act(() => { hoja().props.onAccion(item, accionDeLaHoja(item)); });
    act(() => { hoja().props.alTerminarDeCerrar?.(); });
    expect(ultimoOnRegistrar).toHaveBeenCalledTimes(1);
    expect(ultimoOnRegistrar.mock.calls[0][0]).toMatchObject({ id: 'con-guia' });
  });

  it('MEDIANOCHE: una hoja abierta (sin elegir nada) también se cierra al pasar al lunes', async () => {
    await montarLaPantalla('2026-11-02T04:59:30Z');
    await tocarFila('Hábito con-guia');
    expect(hoja().props.visible).toBe(true);
    await avanzar(30_000);
    expect(hoja().props.visible).toBe(false);
  });

  it('MEDIANOCHE: mientras se relee el día (cargando) no se ofrecen los hábitos de ayer ni se abre nada', async () => {
    await montarLaPantalla('2026-11-02T04:59:30Z');
    expect(textos()).toContain('Hábito con-guia');
    // La relectura queda colgada: la persona ve el esqueleto del lunes, no la lista del domingo.
    mockCargar.mockImplementation(() => new Promise<DatosEntrenamiento>(() => undefined));
    await avanzar(30_000);
    expect(titulo()).toBe('Lunes 2');
    expect(textos()).not.toContain('Hábito con-guia');
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Cargando tu entrenamiento').length).toBeGreaterThan(0);
  });

  /**
   * BUG CONOCIDO (no se arregla acá: es `TrainingPorHora.tsx`, `useAhora(30_000)`): los minutos de «ahora» se refrescan cada
   * 30 s desde que se montó la pantalla, no al cambiar de día. Si la medianoche cae entre dos refrescos, durante hasta 30 s
   * del lunes la lista se arma con las 23:59 del domingo (`minutosDeAhora` = 1439): todo lo que tenga otro ítem después
   * (el de las 06:00, con el de las 07:00) sale en «Se te pasó la hora» a las 00:00:05 del lunes.
   * Arreglado (useAhora con el día de hoy como llave): ahora es un `it` normal.
   */
  it('CORREGIDO: a las 00:00:05 del lunes el hábito de las 06:00 no debe estar «Se te pasó la hora» (el reloj de ahora queda en 23:59)', async () => {
    await montarLaPantalla('2026-11-02T04:59:40Z'); // el refresco de «ahora» cae a las 00:00:10
    await avanzar(20_000); // 00:00:00: ya es lunes
    await avanzar(5_000); // 00:00:05, antes del próximo refresco de «ahora»
    expect(titulo()).toBe('Lunes 2');
    expect(textos()).toContain('Hábito con-guia');
    expect(textos()).not.toContain('Se te pasó la hora');
  });

  it('MEDIANOCHE: (control del bug de arriba) pasado el siguiente refresco de «ahora», el lunes ya se ve bien', async () => {
    await montarLaPantalla('2026-11-02T04:59:40Z');
    await avanzar(31_000); // 00:00:11: ya hubo un refresco de «ahora» (00:00:10)
    expect(titulo()).toBe('Lunes 2');
    expect(textos()).toContain('Hábito con-guia');
    expect(textos()).not.toContain('Se te pasó la hora');
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * Volver del engranaje con un día elegido (hallazgo del E2E en el emulador, 2026-10-29)
 * ------------------------------------------------------------------------------------------------------------- */
describe('volver del engranaje con un día que no es hoy elegido', () => {
  beforeEach(() => jest.setSystemTime(new Date('2026-10-29T20:00:00Z'))); // jueves 15:00 en Lima

  it('al volver pide de nuevo lo planificado: el cuerpo se monta sin su memoria y el día elegido sigue siendo el viernes', async () => {
    const cuenta = `calendario-${++numeroDeCuenta}`;
    const props = { hoyIso: '2026-10-29', diaPrograma: 20, habits: [], cuenta };
    await act(async () => { raiz = TestRenderer.create(React.createElement(Cuerpo, props)); });
    await tocarDia('Viernes 30');
    expect(pedidosDelPlan().filter(p => p.ruta.includes('/habit-preferences'))).toHaveLength(1);

    // Se abre el engranaje (planificar la hora de Gimnasio) y se vuelve a Training: el viernes sigue elegido.
    await act(async () => { raiz!.update(React.createElement(Cuerpo, { ...props, mostrar: false })); });
    await act(async () => { raiz!.update(React.createElement(Cuerpo, { ...props, mostrar: true })); });
    expect(diaElegidoEnLaFila()).toBe('Viernes 30');
    expect(pedidosDelPlan().filter(p => p.ruta.includes('/habit-preferences'))).toHaveLength(2);
    expect(pedidosDelPlan().filter(p => p.ruta.includes('/rocks/upcoming'))).toHaveLength(2);
  });

  it('con HOY elegido no pide nada de lo planificado al volver', async () => {
    const cuenta = `calendario-${++numeroDeCuenta}`;
    const props = { hoyIso: '2026-10-29', diaPrograma: 20, habits: [], cuenta };
    await act(async () => { raiz = TestRenderer.create(React.createElement(Cuerpo, props)); });
    await act(async () => { raiz!.update(React.createElement(Cuerpo, { ...props, mostrar: false })); });
    await act(async () => { raiz!.update(React.createElement(Cuerpo, { ...props, mostrar: true })); });
    expect(pedidosDelPlan()).toEqual([]);
  });
});
