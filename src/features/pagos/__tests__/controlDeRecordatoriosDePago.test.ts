import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Los recordatorios de pago (spec 032, «que le salga en Yo los recordatorios»): el encendido, cuándo avisar (3 días antes, 1 día antes, el mismo día, uno o varios)
 * y la hora. Una sola pieza para Yo → Alarmas y para la hoja de «Mi ingreso». Cada cambio guarda y pone las alarmas al día.
 */

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
const mockTacto = { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() };
jest.mock('../../../utils/tacto', () => ({ tacto: mockTacto }));
const mockLocales = { hay: true };
jest.mock('../../habits/notificaciones/recordatoriosDeHabito', () => ({
  get HAY_RECORDATORIOS_LOCALES() {
    return mockLocales.hay;
  },
}));
const mockPonerAlDia = jest.fn<(userId: string, pagos: unknown, opciones?: { preferencias?: unknown; pedirElPermiso?: boolean }) => Promise<string>>();
jest.mock('../notificaciones/alarmasDePagos', () => ({
  ponerAlDiaLosRecordatoriosDePago: (u: string, p: unknown, o?: { preferencias?: unknown; pedirElPermiso?: boolean }) => mockPonerAlDia(u, p, o),
}));
type PropsDeHora = { visible: boolean; horaInicial: string; onConfirmar: (hora: string) => void; onCerrar: () => void };
let mockHora: PropsDeHora | null = null;
jest.mock('../../habits/components/HoraPickerModal', () => ({ HoraPickerModal: (p: PropsDeHora) => { mockHora = p; return null; } }));

import type { PagosDeLaPersona } from '../api/pagosSchemas';
import { ControlDeRecordatoriosDePago } from '../components/ControlDeRecordatoriosDePago';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAGOS: PagosDeLaPersona = {
  modo: 'CON_CRONOGRAMA', moneda: 'PEN',
  cuotas: [{ id: 'a', venceEl: '2026-11-15', monto: 1000, pagada: false, marcadaEn: null, marcadaPor: null }],
  confirmacion: { estado: 'SIN_CONFIRMAR', confirmadaEn: null, nombre: null },
};

const alCambiar = jest.fn();
let raiz: ReactTestRenderer | null = null;
async function montar(): Promise<ReactTestRenderer> {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(ControlDeRecordatoriosDePago, { userId: 'u1', pagos: PAGOS, alCambiar }));
  });
  return raiz!;
}
const textos = (r: ReactTestRenderer): string =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
const casilla = (r: ReactTestRenderer, titulo: string) =>
  r.root.findAll(n => n.props.accessibilityRole === 'checkbox' && String(n.props.accessibilityLabel).startsWith(titulo) && typeof n.props.onPress === 'function')[0];
const marcada = (r: ReactTestRenderer, titulo: string) => casilla(r, titulo).props.accessibilityState.checked;
const interruptor = (r: ReactTestRenderer) => r.root.findAll(n => n.props.accessibilityRole === 'switch' && typeof n.props.onPress === 'function')[0];
const guardado = async () => JSON.parse((await AsyncStorage.getItem('renaser.pagos.preferencias.u1')) ?? 'null');

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPonerAlDia.mockReset().mockResolvedValue('puestas');
  alCambiar.mockReset();
  Object.values(mockTacto).forEach(f => f.mockClear());
  mockLocales.hay = true;
  mockHora = null;
});

describe('lo que se ve', () => {
  it('por defecto, encendido con 3 días antes y el mismo día a las 09:00 (decisión del dueño)', async () => {
    const r = await montar();
    expect(textos(r)).toContain('Recordarme mis cuotas');
    expect(textos(r)).toContain('3 días antes y el mismo día · 09:00');
    expect(marcada(r, '3 días antes')).toBe(true);
    expect(marcada(r, '1 día antes')).toBe(false);
    expect(marcada(r, 'El mismo día')).toBe(true);
    expect(interruptor(r).props.accessibilityState.checked).toBe(true);
  });

  it('cada opción mide 48 o más', async () => {
    const r = await montar();
    for (const titulo of ['3 días antes', '1 día antes', 'El mismo día']) {
      const crudo = casilla(r, titulo).props.style;
      const estilo = Object.assign({}, ...[typeof crudo === 'function' ? crudo({ pressed: false }) : crudo].flat(3).filter(Boolean));
      expect(estilo.minHeight).toBeGreaterThanOrEqual(48);
    }
  });

  it('sin alarmas locales (web, Expo Go) no se dibuja nada', async () => {
    mockLocales.hay = false;
    expect(textos(await montar())).toBe('');
  });
});

describe('cambiar los avisos', () => {
  it('marcar «1 día antes» suma ese aviso (en orden), guarda y pone las alarmas al día pidiendo el permiso', async () => {
    const r = await montar();

    await act(async () => casilla(r, '1 día antes').props.onPress());

    expect((await guardado()).antelaciones).toEqual([3, 1, 0]);
    expect(mockPonerAlDia).toHaveBeenCalledTimes(1);
    expect(mockPonerAlDia.mock.calls[0][1]).toBe(PAGOS);
    expect(mockPonerAlDia.mock.calls[0][2]).toMatchObject({ pedirElPermiso: true, preferencias: { activos: true, antelaciones: [3, 1, 0], hora: '09:00' } });
    expect(marcada(r, '1 día antes')).toBe(true);
    expect(alCambiar).toHaveBeenCalled();
  });

  it('quitar todos los avisos lo dice (no avisaría nada)', async () => {
    const r = await montar();
    await act(async () => casilla(r, '3 días antes').props.onPress());
    await act(async () => casilla(r, 'El mismo día').props.onPress());
    expect(textos(r)).toContain('Elige al menos uno para que el teléfono te avise.');
    expect((await guardado()).antelaciones).toEqual([]);
  });

  it('apagar el interruptor guarda «apagado», pone las alarmas al día SIN pedir el permiso y esconde el resto', async () => {
    const r = await montar();

    await act(async () => interruptor(r).props.onPress());

    expect((await guardado()).activos).toBe(false);
    expect(mockPonerAlDia.mock.calls[0][2]).toMatchObject({ pedirElPermiso: false, preferencias: { activos: false } });
    expect(textos(r)).toContain('Apagados en este teléfono');
    expect(casilla(r, '3 días antes')).toBeUndefined();
  });
});

describe('la hora', () => {
  it('se elige con el selector de hora de la app y se guarda', async () => {
    const r = await montar();
    const cambiarHora = r.root.findAll(n => n.props.accessibilityLabel === 'Cambiar la hora (09:00)' && typeof n.props.onPress === 'function')[0];
    act(() => cambiarHora.props.onPress());
    expect(mockHora?.visible).toBe(true);
    expect(mockHora?.horaInicial).toBe('09:00');

    await act(async () => mockHora?.onConfirmar('18:30'));

    expect((await guardado()).hora).toBe('18:30');
    expect(textos(r)).toContain('3 días antes y el mismo día · 18:30');
    expect(mockPonerAlDia.mock.calls[0][2]).toMatchObject({ preferencias: { hora: '18:30' } });
  });
});

describe('el permiso de avisos', () => {
  it('si el teléfono no lo da, lo dice en vez de quedar prendido y mudo', async () => {
    mockPonerAlDia.mockResolvedValue('sin_permiso');
    const r = await montar();
    await act(async () => casilla(r, '1 día antes').props.onPress());
    expect(textos(r)).toContain('El teléfono no deja que Renaser te avise.');
  });

  it('lo guardado antes se lee al abrir', async () => {
    await AsyncStorage.setItem('renaser.pagos.preferencias.u1', JSON.stringify({ activos: true, antelaciones: [1], hora: '20:00' }));
    const r = await montar();
    expect(textos(r)).toContain('1 día antes · 20:00');
    expect(marcada(r, '3 días antes')).toBe(false);
    expect(marcada(r, '1 día antes')).toBe(true);
  });
});
