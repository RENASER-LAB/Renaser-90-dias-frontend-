import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));
const mockAlert = jest.fn<(titulo: string, mensaje?: string, botones?: Array<{ text?: string; style?: string; onPress?: () => void }>) => void>();
jest.mock('../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => (mockAlert as (...x: unknown[]) => void)(...a) } }));
jest.mock('../api/formacionesApi', () => ({
  leerComunidadDeLaFormacionApi: jest.fn(),
  cambiarTipoDeComunidad: jest.fn(),
}));

import { ApiError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import { cambiarTipoDeComunidad, leerComunidadDeLaFormacionApi } from '../api/formacionesApi';
import { leerComunidadDeLaFormacion } from '../api/formacionesSchemas';
import { SeccionComunidadDeLaFormacion } from '../components/SeccionComunidadDeLaFormacion';
import type { ComunidadDeLaFormacion } from '../types/formaciones.types';
import { mensajeDeApagar, textoDeConversaciones, tituloDeApagar } from '../utils/comunidadDeLaFormacion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const leer = leerComunidadDeLaFormacionApi as jest.MockedFunction<typeof leerComunidadDeLaFormacionApi>;
const cambiar = cambiarTipoDeComunidad as jest.MockedFunction<typeof cambiarTipoDeComunidad>;

const comunidad = (cambios: Partial<Record<'GENERAL' | 'GRUPO' | 'SOPORTE' | 'DIRECTO', { prendido?: boolean; conversaciones?: number }>> = {}): ComunidadDeLaFormacion => ({
  formacion: 'DIPLOMADO',
  tipos: (['GENERAL', 'GRUPO', 'SOPORTE', 'DIRECTO'] as const).map(tipo => ({
    tipo,
    prendido: cambios[tipo]?.prendido ?? true,
    conversaciones: cambios[tipo]?.conversaciones ?? 1,
  })),
});

let raiz: ReactTestRenderer | null = null;
const montar = async () => {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(SeccionComunidadDeLaFormacion, { codigo: 'DIPLOMADO' }));
  });
};
const textos = () => raiz!.root.findAll(x => (x.type as unknown) === 'Text').map(x => (Array.isArray(x.props.children) ? x.props.children.join('') : x.props.children));
const interruptores = (): ReactTestInstance[] => raiz!.root.findAll(x => x.props.accessibilityRole === 'switch' && typeof x.props.onPress === 'function');
const interruptor = (nombre: string) => interruptores().find(i => i.props.accessibilityLabel === nombre)!;
const tocar = async (nombre: string) => {
  await act(async () => {
    interruptor(nombre).props.onPress();
  });
};
/** Aprieta un botón del diálogo de confirmación que se abrió con `Alert.alert`. */
const apretarEnElDialogo = async (texto: string) => {
  const botones = mockAlert.mock.calls[mockAlert.mock.calls.length - 1][2] ?? [];
  await act(async () => {
    botones.find(b => b.text === texto)?.onPress?.();
  });
};

beforeEach(() => {
  leer.mockReset();
  cambiar.mockReset();
  mockAlert.mockReset();
  (tacto.logro as jest.Mock).mockReset();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('los textos de apagar', () => {
  it('dicen cuántas conversaciones esconde, en singular o plural, y que nada se borra', () => {
    expect(textoDeConversaciones(1)).toBe('1 conversación');
    expect(textoDeConversaciones(12)).toBe('12 conversaciones');
    expect(mensajeDeApagar(3)).toBe('Esto esconde 3 conversaciones para toda la formación. Los mensajes no se borran y vuelven si lo prendes.');
    expect(mensajeDeApagar(1)).toContain('Esto esconde 1 conversación para toda la formación.');
    expect(mensajeDeApagar(0)).toContain('Hoy no esconde ninguna conversación');
    expect(tituloDeApagar('DIRECTO')).toBe('¿Apagar «Directos»?');
  });
});

describe('la lectura de los tipos de comunidad', () => {
  it('queda en el orden de la app, descarta lo que no conoce y perdona una fila rota', () => {
    const lectura = leerComunidadDeLaFormacion(
      {
        formation: 'DIPLOMADO',
        tipos: [
          { tipo: 'DIRECTO', prendido: false, conversaciones: 4 },
          { tipo: 'NUEVO', prendido: true, conversaciones: 1 },
          { roto: true },
          { tipo: 'GENERAL', prendido: true, conversaciones: 1 },
          { tipo: 'GRUPO', prendido: 'raro', conversaciones: -3 },
        ],
      },
      'DIPLOMADO',
    );
    expect(lectura?.tipos.map(t => t.tipo)).toEqual(['GENERAL', 'GRUPO', 'DIRECTO']);
    expect(lectura?.tipos[1]).toMatchObject({ prendido: true, conversaciones: 0 });
    expect(lectura?.tipos[2]).toMatchObject({ prendido: false, conversaciones: 4 });
    expect(leerComunidadDeLaFormacion('no es un objeto', 'X')).toBeNull();
  });
});

describe('«Comunidad» en el detalle de una formación', () => {
  it('muestra los cuatro tipos con un interruptor cada uno, el nombre y las conversaciones', async () => {
    leer.mockResolvedValue(comunidad({ DIRECTO: { prendido: false, conversaciones: 7 } }));
    await montar();
    expect(textos()).toEqual(
      expect.arrayContaining(['Comunidad', 'Comunidad general', 'Grupo con mentor', 'Soporte', 'Directos', 'Los chats de 1 a 1 · 7 conversaciones']),
    );
    expect(interruptores().map(i => i.props.accessibilityLabel)).toEqual(['Comunidad general', 'Grupo con mentor', 'Soporte', 'Directos']);
    expect(interruptores().map(i => i.props.accessibilityState.checked)).toEqual([true, true, true, false]);
  });

  it('prender guarda al instante, sin confirmación, vuelve a leer y lo dice en línea', async () => {
    leer.mockResolvedValue(comunidad({ DIRECTO: { prendido: false, conversaciones: 7 } }));
    cambiar.mockResolvedValue(undefined);
    await montar();
    leer.mockResolvedValue(comunidad({ DIRECTO: { prendido: true, conversaciones: 7 } }));
    await tocar('Directos');
    expect(mockAlert).not.toHaveBeenCalled();
    expect(cambiar).toHaveBeenCalledWith('DIPLOMADO', 'DIRECTO', true);
    expect(leer).toHaveBeenCalledTimes(2);
    expect(interruptor('Directos').props.accessibilityState.checked).toBe(true);
    expect(textos()).toContain('«Directos» prendido.');
    expect(tacto.logro).toHaveBeenCalledTimes(1);
  });

  it('apagar PIDE confirmación diciendo cuántas conversaciones esconde y no guarda hasta aceptar', async () => {
    leer.mockResolvedValue(comunidad({ DIRECTO: { conversaciones: 7 } }));
    cambiar.mockResolvedValue(undefined);
    await montar();
    await tocar('Directos');
    expect(cambiar).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert.mock.calls[0][0]).toBe('¿Apagar «Directos»?');
    expect(mockAlert.mock.calls[0][1]).toBe('Esto esconde 7 conversaciones para toda la formación. Los mensajes no se borran y vuelven si lo prendes.');
    expect(mockAlert.mock.calls[0][2]?.map(b => b.text)).toEqual(['Cancelar', 'Apagar']);
    expect(mockAlert.mock.calls[0][2]?.find(b => b.text === 'Apagar')?.style).toBe('destructive');

    leer.mockResolvedValue(comunidad({ DIRECTO: { prendido: false, conversaciones: 7 } }));
    await apretarEnElDialogo('Apagar');
    expect(cambiar).toHaveBeenCalledWith('DIPLOMADO', 'DIRECTO', false);
    expect(interruptor('Directos').props.accessibilityState.checked).toBe(false);
    expect(textos()).toContain('«Directos» apagado.');
    expect(tacto.logro).toHaveBeenCalledTimes(1);
  });

  it('cancelar la confirmación no cambia nada', async () => {
    leer.mockResolvedValue(comunidad());
    await montar();
    await tocar('Soporte');
    await apretarEnElDialogo('Cancelar');
    expect(cambiar).not.toHaveBeenCalled();
    expect(interruptor('Soporte').props.accessibilityState.checked).toBe(true);
    expect(tacto.logro).not.toHaveBeenCalled();
  });

  it('si el servidor rechaza el cambio, lo dice en un diálogo y el interruptor queda como estaba', async () => {
    leer.mockResolvedValue(comunidad());
    cambiar.mockRejectedValue(new ApiError(403, 'Solo Administración puede cambiar esto.'));
    await montar();
    await tocar('Directos');
    await apretarEnElDialogo('Apagar');
    expect(mockAlert.mock.calls[1][0]).toBe('No se pudo apagar');
    expect(interruptor('Directos').props.accessibilityState.checked).toBe(true);
    expect(textos()).not.toContain('«Directos» apagado.');
  });

  it('contra un backend anterior (404) la sección no se dibuja', async () => {
    leer.mockRejectedValue(new ApiError(404, 'Not Found'));
    await montar();
    expect(raiz!.toJSON()).toBeNull();
  });

  it('sin red dice qué pasó y ofrece «Reintentar»', async () => {
    leer.mockRejectedValue(new ApiError(0, 'Sin conexión'));
    await montar();
    expect(textos()).toContain('Reintentar');
    leer.mockResolvedValue(comunidad());
    await act(async () => {
      raiz!.root.findAll(x => x.props.accessibilityLabel === 'Reintentar' || x.props.accessibilityRole === 'button')[0].props.onPress();
    });
    expect(interruptores()).toHaveLength(4);
  });
});
