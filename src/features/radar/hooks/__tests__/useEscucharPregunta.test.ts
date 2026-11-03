import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Escuchar las preguntas del Código Renaser (spec 030, FR-010 y FR-011): una voz a la vez, desde el paquete de la app, y se
 * detiene al terminar, al tocar de nuevo, al abrir el micrófono y al salir. Nunca lanza.
 */

const mockEventos: { actual: ((e: { didJustFinish: boolean }) => void) | null } = { actual: null };
const mockReproductor = {
  play: jest.fn(),
  pause: jest.fn(),
  replace: jest.fn(),
  remove: jest.fn(),
  addListener: jest.fn((_nombre: string, manejador: (e: { didJustFinish: boolean }) => void) => {
    mockEventos.actual = manejador;
    return { remove: mockBajaDelListener };
  }),
};
const mockBajaDelListener = jest.fn();
const mockCrear = jest.fn((_fuente: unknown) => mockReproductor);
jest.mock('expo-audio', () => ({ createAudioPlayer: (fuente: unknown) => mockCrear(fuente) }));

import { VOZ_DE_LA_PREGUNTA } from '../../config/vozDelRadar';
import { useEscucharPregunta, type EscucharPregunta } from '../useEscucharPregunta';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let escuchar!: EscucharPregunta;
function Sonda() {
  escuchar = useEscucharPregunta();
  return null;
}
function montar(): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(Sonda));
  });
  return r;
}

beforeEach(() => {
  mockEventos.actual = null;
  for (const f of [mockReproductor.play, mockReproductor.pause, mockReproductor.replace, mockReproductor.remove, mockBajaDelListener, mockCrear]) {
    f.mockClear();
  }
  mockReproductor.play.mockImplementation(() => undefined);
});

describe('escuchar la pregunta', () => {
  it('no crea ningún reproductor hasta el primer toque (el formulario se monta en varios lugares)', () => {
    montar();
    expect(mockCrear).not.toHaveBeenCalled();
    expect(escuchar.leyendo).toBeNull();
  });

  it('el primer toque lee la voz de ESA pregunta, desde el paquete de la app', () => {
    montar();
    act(() => escuchar.alternar('whatAmIFeeling'));

    expect(mockReproductor.replace).toHaveBeenCalledWith(VOZ_DE_LA_PREGUNTA.whatAmIFeeling);
    expect(mockReproductor.play).toHaveBeenCalledTimes(1);
    expect(escuchar.leyendo).toBe('whatAmIFeeling');
  });

  it('tocar la misma otra vez la detiene', () => {
    montar();
    act(() => escuchar.alternar('whatAmIFeeling'));
    act(() => escuchar.alternar('whatAmIFeeling'));

    expect(mockReproductor.pause).toHaveBeenCalled();
    expect(escuchar.leyendo).toBeNull();
    expect(mockReproductor.play).toHaveBeenCalledTimes(1);
  });

  it('pasar a otra pregunta corta la primera y lee la segunda: nunca suenan dos', () => {
    montar();
    act(() => escuchar.alternar('whatAmIDoing'));
    act(() => escuchar.alternar('whatAmIAvoiding'));

    expect(mockCrear).toHaveBeenCalledTimes(1);
    expect(mockReproductor.replace).toHaveBeenLastCalledWith(VOZ_DE_LA_PREGUNTA.whatAmIAvoiding);
    expect(escuchar.leyendo).toBe('whatAmIAvoiding');
  });

  it('al terminar de leer el botón vuelve a «Escuchar»', () => {
    montar();
    act(() => escuchar.alternar('whatAmIThinking'));
    act(() => mockEventos.actual?.({ didJustFinish: true }));

    expect(escuchar.leyendo).toBeNull();
  });

  it('un aviso de estado que no es el final no la detiene', () => {
    montar();
    act(() => escuchar.alternar('whatAmIThinking'));
    act(() => mockEventos.actual?.({ didJustFinish: false }));

    expect(escuchar.leyendo).toBe('whatAmIThinking');
  });

  it('«detener» la corta (al abrir el micrófono o al registrar)', () => {
    montar();
    act(() => escuchar.alternar('whatAmIDoing'));
    act(() => escuchar.detener());

    expect(mockReproductor.pause).toHaveBeenCalled();
    expect(escuchar.leyendo).toBeNull();
  });

  it('«detener» sin nada sonando no hace nada ni crea el reproductor', () => {
    montar();
    act(() => escuchar.detener());
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('al salir del formulario libera el reproductor', () => {
    const r = montar();
    act(() => escuchar.alternar('whatAmIDoing'));
    act(() => r.unmount());

    expect(mockBajaDelListener).toHaveBeenCalled();
    expect(mockReproductor.remove).toHaveBeenCalled();
  });

  it('si el audio no se puede reproducir no lanza ni deja el botón «activo»', () => {
    mockReproductor.play.mockImplementation(() => {
      throw new Error('sin salida de audio');
    });
    montar();

    expect(() => act(() => escuchar.alternar('whatAmIDoing'))).not.toThrow();
    expect(escuchar.leyendo).toBeNull();
  });
});
