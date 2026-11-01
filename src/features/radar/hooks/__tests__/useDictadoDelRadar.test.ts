import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Dictar las cuatro respuestas del Código Renaser con UN micrófono (spec 030, FR-004): lo dicho llega a la pregunta que tenía
 * el micrófono, y pasar de una pregunta a otra cierra la primera, ESPERA su texto y recién entonces abre la segunda.
 */

jest.mock('expo-speech-recognition', () =>
  jest.requireActual<typeof import('../../../renasia/hooks/__tests__/vozFalsa')>('../../../renasia/hooks/__tests__/vozFalsa').crearVozFalsa(),
);

import * as Voz from 'expo-speech-recognition';

import type { CampoRadar } from '../../config/configRadar';
import { useDictadoDelRadar, type DictadoDelRadar } from '../useDictadoDelRadar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const modulo = Voz.ExpoSpeechRecognitionModule as unknown as {
  isRecognitionAvailable: jest.Mock;
  requestPermissionsAsync: jest.Mock<() => Promise<{ granted: boolean }>>;
  start: jest.Mock;
  stop: jest.Mock;
  abort: jest.Mock;
};
const emitir = (Voz as unknown as { __emitir: (n: string, e?: Record<string, unknown>) => void }).__emitir;

let dictado!: DictadoDelRadar;
let entregas: [CampoRadar, string][] = [];

function Sonda() {
  dictado = useDictadoDelRadar((campo, texto) => entregas.push([campo, texto]));
  return null;
}

const montadas: ReactTestRenderer[] = [];

function montar(): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(Sonda));
  });
  montadas.push(r);
  return r;
}

const dichos = (transcript: string) => ({ isFinal: true, results: [{ transcript }] });

async function tocar(campo: CampoRadar) {
  await act(async () => {
    dictado.alternar(campo);
    await Promise.resolve();
  });
}

afterEach(() => {
  // Desmontar cierra el micrófono y apaga sus temporizadores: ninguna prueba deja uno corriendo.
  for (const r of montadas.splice(0)) act(() => r.unmount());
});

beforeEach(() => {
  entregas = [];
  modulo.isRecognitionAvailable.mockReturnValue(true);
  modulo.requestPermissionsAsync.mockResolvedValue({ granted: true });
  modulo.start.mockReset();
  modulo.stop.mockReset();
  modulo.abort.mockReset();
});

describe('dictar una pregunta', () => {
  it('tocar el micrófono lo abre en esa pregunta; lo dicho llega a ella al cerrarse', async () => {
    montar();
    await tocar('whatAmIFeeling');
    act(() => emitir('start'));
    expect(dictado.dictandoEn).toBe('whatAmIFeeling');
    expect(modulo.start).toHaveBeenCalledTimes(1);

    act(() => emitir('result', dichos('me siento tranquilo')));
    expect(dictado.parcial).toBe('me siento tranquilo');
    act(() => emitir('end'));

    expect(entregas).toEqual([['whatAmIFeeling', 'me siento tranquilo']]);
    expect(dictado.dictandoEn).toBeNull();
    expect(dictado.parcial).toBe('');
  });

  it('tocar el mismo micrófono otra vez lo cierra, y lo dicho hasta ahí queda en la pregunta', async () => {
    montar();
    await tocar('whatAmIDoing');
    act(() => emitir('start'));
    act(() => emitir('result', dichos('revisando el correo')));

    await tocar('whatAmIDoing');
    expect(modulo.stop).toHaveBeenCalledTimes(1);
    act(() => emitir('end'));

    expect(entregas).toEqual([['whatAmIDoing', 'revisando el correo']]);
    expect(modulo.start).toHaveBeenCalledTimes(1);
  });

  it('un teléfono sin reconocimiento de voz no abre nada', async () => {
    modulo.isRecognitionAvailable.mockReturnValue(false);
    montar();
    expect(dictado.disponible).toBe(false);

    await tocar('whatAmIDoing');
    expect(modulo.start).not.toHaveBeenCalled();
  });
});

describe('pasar de una pregunta a otra (escenario 3: nunca dos micrófonos abiertos)', () => {
  it('cierra el primero, le entrega su texto y recién ENTONCES abre el segundo', async () => {
    montar();
    await tocar('whatAmIDoing');
    act(() => emitir('start'));
    act(() => emitir('result', dichos('estoy en la oficina')));

    await tocar('whatAmIThinking');
    // Todavía no se abrió el segundo: el primero tiene que soltar su texto.
    expect(modulo.stop).toHaveBeenCalledTimes(1);
    expect(modulo.start).toHaveBeenCalledTimes(1);
    expect(entregas).toEqual([]);

    await act(async () => {
      emitir('end');
      await Promise.resolve();
    });

    expect(entregas).toEqual([['whatAmIDoing', 'estoy en la oficina']]);
    expect(modulo.start).toHaveBeenCalledTimes(2);

    act(() => emitir('start'));
    act(() => emitir('result', dichos('en la reunión de mañana')));
    act(() => emitir('end'));
    expect(entregas).toEqual([
      ['whatAmIDoing', 'estoy en la oficina'],
      ['whatAmIThinking', 'en la reunión de mañana'],
    ]);
  });

  it('si cambia de idea y vuelve a tocar la primera mientras se cierra, no se abre la segunda', async () => {
    montar();
    await tocar('whatAmIDoing');
    act(() => emitir('start'));

    await tocar('whatAmIThinking');
    await tocar('whatAmIDoing');
    await act(async () => {
      emitir('end');
      await Promise.resolve();
    });

    expect(modulo.start).toHaveBeenCalledTimes(1);
  });
});

describe('cuando el micrófono falla (User Story 2)', () => {
  it('sin permiso: una línea en la pregunta que se intentaba, que dice cómo activarlo', async () => {
    modulo.requestPermissionsAsync.mockResolvedValue({ granted: false });
    montar();

    await tocar('whatAmIAvoiding');

    expect(dictado.fallo).toEqual({ campo: 'whatAmIAvoiding', mensaje: expect.stringContaining('ajustes del teléfono') });
    expect(dictado.dictandoEn).toBeNull();
  });

  it('sin red: la línea invita a escribir «tu respuesta» y lo dicho antes se entrega', async () => {
    montar();
    await tocar('whatAmIFeeling');
    act(() => emitir('start'));
    act(() => emitir('result', dichos('algo que alcancé a decir')));
    act(() => emitir('error', { error: 'network' }));

    expect(dictado.fallo?.mensaje).toContain('No hay conexión');
    expect(dictado.fallo?.mensaje).toContain('escribe tu respuesta');
    expect(entregas).toEqual([['whatAmIFeeling', 'algo que alcancé a decir']]);
  });

  it('no decir nada (se cierra solo) no muestra ningún aviso', async () => {
    montar();
    await tocar('whatAmIFeeling');
    act(() => emitir('start'));
    act(() => emitir('error', { error: 'no-speech' }));
    act(() => emitir('end'));

    expect(dictado.fallo).toBeNull();
    expect(entregas).toEqual([]);
  });

  it('el aviso se va al tocar otra vez el micrófono', async () => {
    modulo.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });
    montar();
    await tocar('whatAmIDoing');
    expect(dictado.fallo).not.toBeNull();

    await tocar('whatAmIDoing');
    act(() => emitir('start'));
    expect(dictado.fallo).toBeNull();
  });
});

describe('detener', () => {
  it('cierra el micrófono y suelta la pregunta que esperaba', async () => {
    montar();
    await tocar('whatAmIDoing');
    act(() => emitir('start'));
    await tocar('whatAmIThinking');

    act(() => dictado.detener());
    await act(async () => {
      emitir('end');
      await Promise.resolve();
    });

    expect(modulo.start).toHaveBeenCalledTimes(1);
    expect(dictado.dictandoEn).toBeNull();
  });
});
