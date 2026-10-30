/**
 * Un aviso del teléfono que abre un hábito (`aperturaDesdeAviso`, spec 002/D-218) sigue funcionando en Training por hora:
 * lo abre como al tocar su fila —su hoja si tiene guía, su registro de siempre si no—, también si se estaba mirando otro día.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { HabitItem } from '../../../../screens/TrainingScreen';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined } }));
jest.mock('../../../../services/http/apiClient', () => ({
  ...(jest.requireActual('../../../../services/http/apiClient') as object),
  apiFetch: async () => [],
}));

import { TrainingPorHora } from '../TrainingPorHora';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HOY = '2026-10-29';
const habito = (id: string, extra: Partial<HabitItem> = {}): HabitItem => ({
  id, habitoId: `h-${id}`, dimension: 'CUERPO', title: `Hábito ${id}`, time: '06:00', tag: 'Innegociable', streak: null,
  done: false, hasEvidence: false, tieneTrackHoy: true, estado: 'PENDIENTE', evidenceRequirement: 'REQUIRED', ...extra,
});
const guia = { secciones: [{ titulo: 'Qué hacer', texto: 'Bebe agua.' }] };

const onRegistrar = jest.fn();
const onAperturaAtendida = jest.fn();
let raiz: ReactTestRenderer | null = null;

function Envoltorio({ apertura, diaInicial = null }: { apertura: { registroId: string; vez: number } | null; diaInicial?: string | null }) {
  const [dia, setDia] = React.useState<string | null>(diaInicial);
  return React.createElement(TrainingPorHora, {
    activa: true, estado: 'listo', mensajeDeError: null, onReintentar: () => undefined, cuentaId: 'cuenta-del-aviso',
    habits: [habito('con-guia', { guia }), habito('sin-guia'), habito('roca-1', { dimension: 'VIDA Y NEGOCIO', habitoId: null, systemKey: null, title: 'Revisar las facturas', time: '20:30' })], planHabits: [], hoyIso: HOY, diaElegido: dia, onElegirDia: setDia,
    diaPrograma: 40, fase: null, titulos: {}, eventosPrendidos: false, confirmacion: null, onConfirmacionTerminada: () => undefined,
    aperturaPedida: apertura, onAperturaAtendida, onRegistrar, onMarcar: () => undefined, onAbrirEvento: () => undefined,
  });
}
const hayModal = () => raiz!.root.findAll(n => (n.type as unknown) === 'Modal' || (n.type as { name?: string }).name === 'Modal').length > 0;
const montar = async (apertura: { registroId: string; vez: number } | null, diaInicial: string | null = null) => {
  await act(async () => { raiz = TestRenderer.create(React.createElement(Envoltorio, { apertura, diaInicial })); });
};

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  onRegistrar.mockReset();
  onAperturaAtendida.mockReset();
});

describe('el aviso del teléfono abre el hábito', () => {
  it('con guía: abre su hoja', async () => {
    await montar({ registroId: 'con-guia', vez: 1 });
    expect(hayModal()).toBe(true);
    expect(onAperturaAtendida).toHaveBeenCalledTimes(1);
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it('sin guía: abre directo su registro de siempre', async () => {
    await montar({ registroId: 'sin-guia', vez: 1 });
    expect(onRegistrar).toHaveBeenCalledTimes(1);
    expect(onRegistrar.mock.calls[0][0]).toMatchObject({ id: 'sin-guia' });
    expect(hayModal()).toBe(false);
  });

  it('un hábito que hoy no está (pausado, no le toca) no abre nada', async () => {
    await montar({ registroId: 'no-esta', vez: 1 });
    expect(hayModal()).toBe(false);
    expect(onRegistrar).not.toHaveBeenCalled();
    expect(onAperturaAtendida).toHaveBeenCalledTimes(1);
  });

  it('el mismo aviso no abre dos veces', async () => {
    await montar({ registroId: 'sin-guia', vez: 7 });
    await act(async () => { raiz!.update(React.createElement(Envoltorio, { apertura: { registroId: 'sin-guia', vez: 7 } })); });
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it('también si se estaba mirando otro día: vuelve a hoy y abre la hoja, que no se cierra por ese cambio de día', async () => {
    await montar({ registroId: 'con-guia', vez: 1 }, '2026-10-31');
    expect(hayModal()).toBe(true);
  });

  it('una acción del día pedida desde Plan con Training ya montado abre su hoja (spec 016)', async () => {
    await montar(null);
    expect(hayModal()).toBe(false);
    await act(async () => { raiz!.update(React.createElement(Envoltorio, { apertura: { registroId: 'roca-1', vez: 3 } })); });
    expect(hayModal()).toBe(true);
    expect(onAperturaAtendida).toHaveBeenCalledTimes(1);
  });
});
