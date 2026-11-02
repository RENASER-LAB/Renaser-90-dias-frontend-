import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

const mockConsultar = jest.fn<() => Promise<unknown>>();
const mockActivar = jest.fn<(input?: { startDate?: string }) => Promise<unknown>>();
const mockCapacidades = jest.fn<() => Promise<unknown>>();

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion() {}, logro() {}, toque() {} } }));
jest.mock('../../../services/http/apiClient', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(estado: number, message: string) { super(message); this.status = estado; }
  },
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));
jest.mock('../../onboarding/api/onboardingApi', () => ({
  consultarActivacionPrograma: () => mockConsultar(),
  activarPrograma: (input?: { startDate?: string }) => mockActivar(input),
}));
jest.mock('../../mentor/api/mentorApi', () => ({ capacidadesDePrograma: () => mockCapacidades() }));

import { ApiError } from '../../../services/http/apiClient';
import { ActivarProgramaScreen } from '../../onboarding/screens/ActivarProgramaScreen';
import { EntradaAlProgramaPropio } from '../components/EntradaAlProgramaPropio';
import { useArranqueDelPrograma } from '../hooks/useArranqueDelPrograma';
import { useProgramaPersonal } from '../../mentor/hooks/useProgramaPersonal';
import { avisarDiaUnoElegido, escucharDiaUnoElegido } from '../events/avisoDiaUnoElegido';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* Spec 036: el servidor ofrece UNA fecha, mañana. El reloj de la prueba es el sábado 10 de octubre en Lima, así que mañana es el domingo 11. */
const FECHAS = ['2026-10-11'];
let raiz: ReactTestRenderer | null = null;
const decir = (n: ReactTestInstance) => [n.props.children].flat().join('');
const textos = () => raiz!.root.findAll(n => n.type === Text).map(decir);

async function montar(elemento: React.ReactElement) {
  await act(async () => { raiz = TestRenderer.create(elemento); });
}

async function tocar(texto: string) {
  const candidatos = raiz!.root.findAll(n => typeof n.props.onPress === 'function'
    && n.findAll(m => m.type === Text && decir(m) === texto).length > 0);
  const candidato = candidatos[candidatos.length - 1];
  if (!candidato) throw new Error(`No está «${texto}»: ${textos().join(' | ')}`);
  await act(async () => { await candidato.props.onPress(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['setTimeout', 'setImmediate', 'nextTick', 'queueMicrotask'] });
  jest.setSystemTime(new Date('2026-10-10T15:00:00-05:00'));
  mockCapacidades.mockResolvedValue({ canStartProgram: false });
  mockConsultar.mockResolvedValue({ activated: false, validStartDates: FECHAS, startDate: null });
  mockActivar.mockResolvedValue({});
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
});

describe('Día 1 de una cuenta anterior que ya terminó el onboarding', () => {
  it.each(['recarga', 'otra cuenta'])('la invitación anterior no aparece ni un render durante %s', async cambio => {
    const lecturas: Array<{ puedeActivar: boolean; visible: boolean; cargando: boolean }> = [];
    function Lectura({ usuario }: { usuario: string }) {
      const programa = useProgramaPersonal(true, usuario);
      lecturas.push({ puedeActivar: programa.puedeActivar, visible: programa.visible, cargando: programa.cargando });
      return null;
    }
    mockCapacidades.mockResolvedValue({ canStartProgram: true });
    await montar(React.createElement(Lectura, { usuario: 'anterior' }));
    expect(lecturas[lecturas.length - 1].visible).toBe(true);
    mockCapacidades.mockReturnValue(new Promise(() => {}));
    lecturas.length = 0;
    await act(async () => {
      if (cambio === 'recarga') avisarDiaUnoElegido();
      else raiz!.update(React.createElement(Lectura, { usuario: 'actual' }));
    });
    expect(lecturas.length).toBeGreaterThan(0);
    expect(lecturas.every(lectura => !lectura.puedeActivar && !lectura.visible && lectura.cargando)).toBe(true);
  });

  it('una consulta tardía de otra cuenta no reemplaza el estado de la cuenta actual', async () => {
    let resolverAnterior!: (value: unknown) => void;
    mockConsultar.mockReturnValueOnce(new Promise(resolve => { resolverAnterior = resolve; }));
    function Lectura({ usuario }: { usuario: string }) {
      return React.createElement(Text, null, useArranqueDelPrograma(true, 0, usuario).estado);
    }
    await montar(React.createElement(Lectura, { usuario: 'anterior' }));
    expect(textos()).toEqual(['CARGANDO']);
    await act(async () => { raiz!.update(React.createElement(Lectura, { usuario: 'actual' })); });
    expect(textos()).toEqual(['PENDIENTE_ELEGIR']);
    await act(async () => { resolverAnterior({ activated: true, validStartDates: [], startDate: FECHAS[0] }); });
    expect(textos()).toEqual(['PENDIENTE_ELEGIR']);
  });

  it.each(['hoy', 'yo'] as const)('un fallo al consultar no es un programa iniciado: %s permite reintentar y luego empezar', async lugar => {
    mockConsultar.mockRejectedValueOnce(new Error('sin conexión'));
    await montar(React.createElement(EntradaAlProgramaPropio,
      { lugar, activo: false, usuarioId: 'aprendiz', inscrito: true, diaPrograma: 0 }));

    expect(textos()).toContain('No pudimos comprobar tu programa');
    expect(mockActivar).not.toHaveBeenCalled();
    await tocar('Reintentar');
    expect(textos()).toContain('Todavía no empezaste tu programa');
    await tocar('Empezar mañana');
    expect(textos()).toContain('Tu programa empieza mañana');
    expect(mockActivar).not.toHaveBeenCalled();
  });

  it.each(['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', null])(
    'una cuenta activada (%s) no vuelve a empezar aunque su contador aún diga 0', async startDate => {
      mockConsultar.mockResolvedValue({ activated: true, validStartDates: [], startDate });
      await montar(React.createElement(EntradaAlProgramaPropio,
        { lugar: 'hoy', activo: false, usuarioId: 'aprendiz', inscrito: true, diaPrograma: 0 }));
      expect(textos()).not.toContain('Empezar mañana');
      expect(mockActivar).not.toHaveBeenCalled();
    },
  );
});

/* Fuera del onboarding (el personal desde Hoy, Plan, Yo, Training o Mi Radar, y las cuentas anteriores sin Día 1) la pantalla trae `alVolver` y
   «Entendido» es lo que activa: nada se activa solo. */
const fueraDelOnboarding = (alActivar: () => void) =>
  React.createElement(ActivarProgramaScreen, { onActivated: alActivar, alVolver: jest.fn() });

describe('la pantalla «Tu programa empieza mañana» recupera errores sin asignar una fecha por su cuenta', () => {
  it('muestra la fecha de mañana, el plazo y un solo botón, sin lista de fechas', async () => {
    await montar(fueraDelOnboarding(jest.fn()));
    expect(textos()).toEqual(expect.arrayContaining(['Tu programa empieza mañana', 'Domingo 11 de octubre', 'Son tus 90 días.', 'Entendido']));
    expect(textos().some(t => /elige|elegir|confirmar mi/i.test(t))).toBe(false);
    // Fuera del onboarding nada se activa solo: hace falta el toque de «Entendido» (para el personal el programa es opcional).
    expect(mockActivar).not.toHaveBeenCalled();
    expect(textos()).not.toContain('Preparando tu programa…');
  });

  it('si falla la carga de la fecha, se puede volver a cargar sin reiniciar la app', async () => {
    const alActivar = jest.fn();
    mockConsultar.mockRejectedValueOnce(new Error('sin conexión'));
    await montar(fueraDelOnboarding(alActivar));
    expect(textos()).toContain('No pudimos cargar tu fecha de inicio. Revisa tu conexión.');
    await tocar('Reintentar');
    expect(textos()).toContain('Domingo 11 de octubre');
    expect(mockActivar).not.toHaveBeenCalled();
    expect(alActivar).not.toHaveBeenCalled();
  });

  it('si pasó la medianoche (400), vuelve a consultar, avisa y activa solo con la fecha nueva que se vio', async () => {
    const alActivar = jest.fn();
    await montar(fueraDelOnboarding(alActivar));
    mockActivar.mockRejectedValueOnce(new ApiError(400, 'El programa empieza siempre mañana'));
    mockConsultar.mockResolvedValue({ activated: false, validStartDates: ['2026-10-12'], startDate: null });
    await tocar('Entendido');

    expect(textos()).not.toContain('Domingo 11 de octubre');
    expect(textos()).toContain('Lunes 12 de octubre');
    expect(textos()).toContain('Pasó la medianoche y tu fecha cambió. Mira la nueva.');
    expect(mockActivar).toHaveBeenCalledTimes(1);
    expect(mockActivar).toHaveBeenLastCalledWith({ startDate: '2026-10-11' });
    expect(alActivar).not.toHaveBeenCalled();
    await tocar('Entendido');
    expect(mockActivar).toHaveBeenLastCalledWith({ startDate: '2026-10-12' });
    expect(alActivar).toHaveBeenCalledTimes(1);
  });

  it('si otro dispositivo ya activó, un 409 relee el estado y sale sin sobrescribirlo', async () => {
    const alActivar = jest.fn();
    await montar(fueraDelOnboarding(alActivar));
    mockActivar.mockRejectedValueOnce(new ApiError(409, 'ya activado'));
    mockConsultar.mockResolvedValue({ activated: true, validStartDates: [], startDate: FECHAS[0] });
    await tocar('Entendido');
    expect(alActivar).toHaveBeenCalledTimes(1);
    expect(mockActivar).toHaveBeenCalledTimes(1);
  });

  it('un fallo de red al confirmar deja el mismo botón para reintentar con la misma fecha', async () => {
    const alActivar = jest.fn();
    await montar(fueraDelOnboarding(alActivar));
    mockActivar.mockRejectedValueOnce(new Error('respuesta perdida'));
    await tocar('Entendido');
    expect(alActivar).not.toHaveBeenCalled();
    expect(textos()).toContain('No pudimos activar tu programa. Revisa tu conexión e inténtalo de nuevo.');
    await tocar('Entendido');
    expect(mockActivar.mock.calls.map(([input]) => input.startDate)).toEqual([FECHAS[0], FECHAS[0]]);
    expect(alActivar).toHaveBeenCalledTimes(1);
  });

  it('contra un servidor anterior que ofrece tres fechas, activa con la primera (mañana)', async () => {
    mockConsultar.mockResolvedValue({ activated: false, validStartDates: ['2026-10-11', '2026-10-12', '2026-10-13'], startDate: null });
    const alActivar = jest.fn();
    await montar(fueraDelOnboarding(alActivar));
    expect(textos()).toContain('Domingo 11 de octubre');
    expect(textos()).not.toContain('Lunes 12 de octubre');
    await tocar('Entendido');
    expect(mockActivar).toHaveBeenLastCalledWith({ startDate: '2026-10-11' });
  });
});

/* Ajuste del dueño del 2026-11-02 (spec 036): «Firma, y al día siguiente ya es su día número 1». En el onboarding la pantalla activa SOLA al montarse. */
describe('en el onboarding, al firmar, el programa se activa solo al llegar a «Tu programa empieza mañana»', () => {
  const respuesta = (startDate: string) => ({
    traineeProfileId: 'u-1', programDay: 0, programActivatedAt: '2026-10-10T20:00:00Z', startDate, expectedGraduationDate: '2027-01-08',
  });
  const enElOnboarding = (alActivar: () => void) => React.createElement(ActivarProgramaScreen, { onActivated: alActivar, activarAlMontar: true });
  /* Un botón dorado deshabilitado: su Pressable lo declara. */
  const deshabilitado = (texto: string) => raiz!.root
    .findAll(n => n.props.accessibilityRole === 'button' && n.findAll(m => m.type === Text && decir(m) === texto).length > 0)
    .some(n => n.props.accessibilityState?.disabled === true);

  beforeEach(() => {
    mockActivar.mockResolvedValue(respuesta('2026-10-11'));
  });

  it('activa una sola vez, sin toque y sin fecha; «Entendido» solo continúa a la app', async () => {
    const alActivar = jest.fn();
    await montar(enElOnboarding(alActivar));

    expect(mockActivar).toHaveBeenCalledTimes(1);
    expect(mockActivar).toHaveBeenCalledWith(undefined); // sin fecha: el servidor pone mañana
    expect(mockConsultar).not.toHaveBeenCalled();
    expect(textos()).toEqual(expect.arrayContaining(['Tu programa empieza mañana', 'Domingo 11 de octubre', 'Son tus 90 días.', 'Entendido']));
    expect(textos()).not.toContain('Preparando tu programa…');
    expect(alActivar).not.toHaveBeenCalled();

    await tocar('Entendido');
    await tocar('Entendido'); // un doble toque no entra dos veces
    expect(alActivar).toHaveBeenCalledTimes(1);
    expect(mockActivar).toHaveBeenCalledTimes(1);
  });

  it('mientras el servidor responde dice «Preparando tu programa…», no muestra ninguna fecha y «Entendido» no se puede tocar', async () => {
    let responder!: (valor: unknown) => void;
    mockActivar.mockReturnValueOnce(new Promise(resolve => { responder = resolve; }));
    await montar(enElOnboarding(jest.fn()));

    expect(textos()).toContain('Preparando tu programa…');
    expect(textos().some(t => /de octubre/.test(t))).toBe(false);
    expect(textos()).not.toContain('Son tus 90 días.');
    expect(deshabilitado('Entendido')).toBe(true);

    await act(async () => { responder(respuesta('2026-10-11')); });
    expect(textos()).not.toContain('Preparando tu programa…');
    expect(textos()).toEqual(expect.arrayContaining(['Domingo 11 de octubre', 'Son tus 90 días.']));
    expect(deshabilitado('Entendido')).toBe(false);
  });

  it('la fecha que se muestra es la que respondió el servidor, y no cambia después', async () => {
    mockActivar.mockResolvedValue(respuesta('2026-10-12')); // la zona de la persona ya va un día adelante
    await montar(enElOnboarding(jest.fn()));
    expect(textos()).toContain('Lunes 12 de octubre');
    expect(textos()).not.toContain('Domingo 11 de octubre');
  });

  it('un doble montaje no manda dos pedidos (dos pantallas a la vez, o StrictMode)', async () => {
    await montar(React.createElement(React.Fragment, null,
      React.createElement(React.StrictMode, null, enElOnboarding(jest.fn())),
      enElOnboarding(jest.fn())));
    expect(mockActivar).toHaveBeenCalledTimes(1);
    expect(textos().filter(t => t === 'Domingo 11 de octubre')).toHaveLength(2);
  });

  it('un montaje que se repite mientras el pedido sigue en vuelo reutiliza ese mismo pedido', async () => {
    let responder!: (valor: unknown) => void;
    mockActivar.mockReturnValueOnce(new Promise(resolve => { responder = resolve; }));
    await montar(enElOnboarding(jest.fn()));
    act(() => raiz?.unmount());
    await montar(enElOnboarding(jest.fn()));
    expect(mockActivar).toHaveBeenCalledTimes(1);
    expect(textos()).toContain('Preparando tu programa…');
    await act(async () => { responder(respuesta('2026-10-11')); });
    expect(textos()).toContain('Domingo 11 de octubre');
  });

  it('si la persona vuelve a abrir la app con los Términos firmados, la pantalla activa otra vez y el servidor lo da por bueno (200)', async () => {
    await montar(enElOnboarding(jest.fn()));
    act(() => raiz?.unmount());
    await montar(enElOnboarding(jest.fn()));
    expect(mockActivar).toHaveBeenCalledTimes(2);
    expect(textos()).toContain('Domingo 11 de octubre');
  });

  it('un fallo de red muestra el mensaje de siempre y «Reintentar», que vuelve a pedir', async () => {
    const alActivar = jest.fn();
    mockActivar.mockRejectedValueOnce(new Error('sin conexión'));
    await montar(enElOnboarding(alActivar));

    expect(textos()).toContain('No pudimos activar tu programa. Revisa tu conexión e inténtalo de nuevo.');
    expect(textos()).toContain('Reintentar');
    expect(textos()).not.toContain('Entendido');
    expect(textos().some(t => /de octubre/.test(t))).toBe(false);
    expect(alActivar).not.toHaveBeenCalled();

    await tocar('Reintentar');
    expect(mockActivar).toHaveBeenCalledTimes(2);
    expect(textos()).toContain('Domingo 11 de octubre');
    expect(textos()).not.toContain('No pudimos activar tu programa. Revisa tu conexión e inténtalo de nuevo.');
    expect(textos()).toContain('Entendido');
    expect(alActivar).not.toHaveBeenCalled();
  });

  it('un servidor anterior a la 036, que exige la fecha (400 sin ella), se activa con la primera que ofrece', async () => {
    mockActivar
      .mockRejectedValueOnce(new ApiError(400, 'startDate es obligatoria'))
      .mockResolvedValueOnce(respuesta('2026-10-11'));
    mockConsultar.mockResolvedValue({ activated: false, validStartDates: ['2026-10-11', '2026-10-12', '2026-10-13'], startDate: null });
    await montar(enElOnboarding(jest.fn()));

    expect(mockActivar.mock.calls).toEqual([[undefined], [{ startDate: '2026-10-11' }]]);
    expect(textos()).toContain('Domingo 11 de octubre');
  });

  it('si ya activó y su Día 1 ya llegó (cerró la app sin tocar «Entendido»), sigue directo a la app sin decir «mañana»', async () => {
    const alActivar = jest.fn();
    mockActivar.mockResolvedValue(respuesta('2026-10-09'));
    await montar(enElOnboarding(alActivar));
    expect(alActivar).toHaveBeenCalledTimes(1);
    expect(textos().some(t => /de octubre/.test(t))).toBe(false);
  });

  it('avisa a las pantallas que muestran el programa para que lo relean', async () => {
    const oyente = jest.fn();
    const dejar = escucharDiaUnoElegido(oyente);
    await montar(enElOnboarding(jest.fn()));
    dejar();
    expect(oyente).toHaveBeenCalledTimes(1);
  });
});

describe('desde Hoy, Plan, Yo, Training o Mi Radar el personal sigue necesitando el toque', () => {
  it('abrir «Tu programa empieza mañana» no activa nada hasta tocar «Entendido»', async () => {
    const alActivar = jest.fn();
    await montar(fueraDelOnboarding(alActivar));
    expect(mockActivar).not.toHaveBeenCalled();
    expect(alActivar).not.toHaveBeenCalled();
    mockActivar.mockResolvedValue({ startDate: '2026-10-11' });
    await tocar('Entendido');
    expect(mockActivar).toHaveBeenCalledTimes(1);
    expect(mockActivar).toHaveBeenCalledWith({ startDate: '2026-10-11' });
    expect(alActivar).toHaveBeenCalledTimes(1);
  });
});
