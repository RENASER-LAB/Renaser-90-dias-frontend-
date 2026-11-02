import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

const mockConsultar = jest.fn<() => Promise<unknown>>();
const mockActivar = jest.fn<(input: { startDate: string }) => Promise<unknown>>();
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
  activarPrograma: (input: { startDate: string }) => mockActivar(input),
}));
jest.mock('../../mentor/api/mentorApi', () => ({ capacidadesDePrograma: () => mockCapacidades() }));

import { ApiError } from '../../../services/http/apiClient';
import { ActivarProgramaScreen } from '../../onboarding/screens/ActivarProgramaScreen';
import { EntradaAlProgramaPropio } from '../components/EntradaAlProgramaPropio';
import { useArranqueDelPrograma } from '../hooks/useArranqueDelPrograma';
import { useProgramaPersonal } from '../../mentor/hooks/useProgramaPersonal';
import { avisarDiaUnoElegido } from '../events/avisoDiaUnoElegido';

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

describe('la pantalla «Tu programa empieza mañana» recupera errores sin asignar una fecha por su cuenta', () => {
  it('muestra la fecha de mañana, el plazo y un solo botón, sin lista de fechas', async () => {
    await montar(React.createElement(ActivarProgramaScreen, { onActivated: jest.fn() }));
    expect(textos()).toEqual(expect.arrayContaining(['Tu programa empieza mañana', 'Domingo 11 de octubre', 'Son tus 90 días.', 'Entendido']));
    expect(textos().some(t => /elige|elegir|confirmar mi/i.test(t))).toBe(false);
  });

  it('si falla la carga en el onboarding, se puede volver a cargar sin reiniciar la app', async () => {
    const alActivar = jest.fn();
    mockConsultar.mockRejectedValueOnce(new Error('sin conexión'));
    await montar(React.createElement(ActivarProgramaScreen, { onActivated: alActivar }));
    expect(textos()).toContain('No pudimos cargar tu fecha de inicio. Revisa tu conexión.');
    await tocar('Reintentar');
    expect(textos()).toContain('Domingo 11 de octubre');
    expect(mockActivar).not.toHaveBeenCalled();
    expect(alActivar).not.toHaveBeenCalled();
  });

  it('si pasó la medianoche (400), vuelve a consultar, avisa y activa solo con la fecha nueva que se vio', async () => {
    const alActivar = jest.fn();
    await montar(React.createElement(ActivarProgramaScreen, { onActivated: alActivar }));
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
    await montar(React.createElement(ActivarProgramaScreen, { onActivated: alActivar }));
    mockActivar.mockRejectedValueOnce(new ApiError(409, 'ya activado'));
    mockConsultar.mockResolvedValue({ activated: true, validStartDates: [], startDate: FECHAS[0] });
    await tocar('Entendido');
    expect(alActivar).toHaveBeenCalledTimes(1);
    expect(mockActivar).toHaveBeenCalledTimes(1);
  });

  it('un fallo de red al confirmar deja el mismo botón para reintentar con la misma fecha', async () => {
    const alActivar = jest.fn();
    await montar(React.createElement(ActivarProgramaScreen, { onActivated: alActivar }));
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
    await montar(React.createElement(ActivarProgramaScreen, { onActivated: alActivar }));
    expect(textos()).toContain('Domingo 11 de octubre');
    expect(textos()).not.toContain('Lunes 12 de octubre');
    await tocar('Entendido');
    expect(mockActivar).toHaveBeenLastCalledWith({ startDate: '2026-10-11' });
  });
});
