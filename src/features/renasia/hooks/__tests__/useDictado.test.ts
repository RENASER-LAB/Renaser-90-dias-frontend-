import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El dictado compartido (chat de SER, orbe de Hoy y, desde la spec 030, el Código Renaser). El reconocedor manda sus eventos a
 * TODOS los que escuchan; el hook solo atiende los de la sesión que ÉL abrió. Sin esto, dictar el Código Renaser ponía al orbe
 * «escuchando» y Hoy mostraba «Tú: <lo que dictaste>» (visto leyendo el código el 2026-10-31). Con una sola instancia, todo
 * sigue como siempre.
 */

jest.mock('expo-speech-recognition', () =>
  jest.requireActual<typeof import('./vozFalsa')>('./vozFalsa').crearVozFalsa(),
);

import * as Voz from 'expo-speech-recognition';

import { useDictado, type EstadoDictado } from '../useDictado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const modulo = Voz.ExpoSpeechRecognitionModule as unknown as {
  isRecognitionAvailable: jest.Mock;
  requestPermissionsAsync: jest.Mock<() => Promise<{ granted: boolean }>>;
  start: jest.Mock;
  stop: jest.Mock;
  abort: jest.Mock;
};
const emitir = (Voz as unknown as { __emitir: (n: string, e?: Record<string, unknown>) => void }).__emitir;

const estados: Record<string, EstadoDictado> = {};
const entregado: Record<string, string[]> = {};

function Sonda({ nombre, destino }: { nombre: string; destino?: 'mensaje' | 'respuesta' }) {
  estados[nombre] = useDictado([], texto => (entregado[nombre] ??= []).push(texto), { destino });
  return null;
}

const montadas: ReactTestRenderer[] = [];

function montar(...nombres: string[]): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(React.Fragment, null, ...nombres.map(n => React.createElement(Sonda, { key: n, nombre: n, destino: n === 'radar' ? 'respuesta' : undefined }))),
    );
  });
  montadas.push(r);
  return r;
}

const dichos = (transcript: string, isFinal = true) => ({ isFinal, results: [{ transcript }] });

async function abrir(nombre: string) {
  await act(async () => {
    await estados[nombre].empezar();
  });
  act(() => emitir('start'));
}

afterEach(() => {
  // Desmontar cierra el micrófono y apaga sus temporizadores: ninguna prueba deja uno corriendo.
  for (const r of montadas.splice(0)) act(() => r.unmount());
});

beforeEach(() => {
  for (const k of Object.keys(estados)) delete estados[k];
  for (const k of Object.keys(entregado)) delete entregado[k];
  modulo.isRecognitionAvailable.mockReturnValue(true);
  modulo.requestPermissionsAsync.mockResolvedValue({ granted: true });
  modulo.start.mockReset();
  modulo.stop.mockReset();
  modulo.abort.mockReset();
});

describe('el seguro de sesión propia', () => {
  it('con una sola instancia todo sigue igual: escucha, muestra lo parcial y entrega todo lo dicho al cerrarse', async () => {
    montar('chat');
    await abrir('chat');
    expect(estados.chat.escuchando).toBe(true);

    act(() => emitir('result', dichos('ya tomé agua', false)));
    expect(estados.chat.parcial).toBe('ya tomé agua');
    act(() => emitir('result', dichos('ya tomé agua', true)));
    act(() => emitir('result', dichos('y medité', true)));
    act(() => emitir('end'));

    expect(entregado.chat).toEqual(['ya tomé agua y medité']);
    expect(estados.chat.escuchando).toBe(false);
    expect(estados.chat.parcial).toBe('');
  });

  it('otra instancia NO ve el micrófono de la primera: ni escucha, ni muestra lo dicho, ni entrega, ni muestra errores', async () => {
    montar('radar', 'orbe');
    await abrir('radar');

    act(() => emitir('result', dichos('lo que evito es la llamada', true)));
    act(() => emitir('error', { error: 'network' }));
    act(() => emitir('end'));

    // La sesión del radar es la que se corta y entrega lo que tenía; la otra instancia no se entera de nada.
    expect(entregado.radar).toEqual(['lo que evito es la llamada']);
    expect(estados.orbe.escuchando).toBe(false);
    expect(estados.orbe.parcial).toBe('');
    expect(estados.orbe.error).toBeNull();
    expect(entregado.orbe).toBeUndefined();
  });

  it('lo dicho en el radar llega al radar y solo a él', async () => {
    montar('radar', 'orbe');
    await abrir('radar');
    expect(estados.orbe.escuchando).toBe(false);

    act(() => emitir('result', dichos('me siento cansada', true)));
    expect(estados.orbe.parcial).toBe('');
    act(() => emitir('end'));

    expect(entregado.radar).toEqual(['me siento cansada']);
    expect(entregado.orbe).toBeUndefined();
  });

  it('«detener» cierra solo el micrófono propio: sin sesión no le toca el de otro', async () => {
    montar('radar', 'orbe');
    await abrir('radar');

    act(() => estados.orbe.detener());
    expect(modulo.stop).not.toHaveBeenCalled();

    act(() => estados.radar.detener());
    expect(modulo.stop).toHaveBeenCalledTimes(1);
  });

  it('al desmontarse solo aborta si tenía el micrófono abierto', async () => {
    const r = montar('radar');
    await abrir('radar');
    act(() => r.unmount());
    expect(modulo.abort).toHaveBeenCalledTimes(1);

    modulo.abort.mockClear();
    const sinSesion = montar('orbe');
    act(() => sinSesion.unmount());
    expect(modulo.abort).not.toHaveBeenCalled();
  });

  it('un segundo toque con el micrófono abierto no abre otra sesión', async () => {
    montar('radar');
    await abrir('radar');
    await act(async () => {
      await estados.radar.empezar();
    });
    expect(modulo.start).toHaveBeenCalledTimes(1);
  });

  it('tras el error o el cierre se puede volver a abrir', async () => {
    montar('radar');
    await abrir('radar');
    act(() => emitir('end'));
    await abrir('radar');
    expect(modulo.start).toHaveBeenCalledTimes(2);
  });
});

describe('cuando el micrófono no se puede usar', () => {
  it('sin permiso: una línea que dice cómo activarlo y el micrófono no se abre', async () => {
    modulo.requestPermissionsAsync.mockResolvedValue({ granted: false });
    montar('radar');

    await act(async () => {
      await estados.radar.empezar();
    });

    expect(modulo.start).not.toHaveBeenCalled();
    expect(estados.radar.error).toContain('ajustes del teléfono');
  });

  it('el aviso invita a escribir «tu respuesta» en el Código Renaser y «tu mensaje» en el chat', async () => {
    montar('radar', 'chat');
    await abrir('radar');
    act(() => emitir('error', { error: 'network' }));
    expect(estados.radar.error).toContain('escribe tu respuesta');

    await abrir('chat');
    act(() => emitir('error', { error: 'network' }));
    expect(estados.chat.error).toContain('escribe tu mensaje');
  });

  it('no decir nada no es un error: se cierra solo y no muestra aviso', async () => {
    montar('radar');
    await abrir('radar');
    act(() => emitir('error', { error: 'no-speech' }));
    act(() => emitir('end'));
    expect(estados.radar.error).toBeNull();
    expect(estados.radar.escuchando).toBe(false);
  });

  it('lo dicho antes del error no se tira', async () => {
    montar('radar');
    await abrir('radar');
    act(() => emitir('result', dichos('lo que alcancé a decir', true)));
    act(() => emitir('error', { error: 'network' }));
    expect(entregado.radar).toEqual(['lo que alcancé a decir']);
  });

  it('si el motor no puede abrirse, no queda una sesión fantasma que bloquee el próximo toque', async () => {
    montar('radar');
    modulo.start.mockImplementationOnce(() => {
      throw new Error('motor ocupado');
    });
    await act(async () => {
      await estados.radar.empezar();
    });
    expect(estados.radar.error).not.toBeNull();

    await abrir('radar');
    expect(estados.radar.escuchando).toBe(true);
  });

  it('un teléfono sin reconocimiento de voz no ofrece dictar', () => {
    modulo.isRecognitionAvailable.mockReturnValue(false);
    montar('radar');
    expect(estados.radar.disponible).toBe(false);
  });
});
