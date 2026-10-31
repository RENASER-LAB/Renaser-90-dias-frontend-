/**
 * Las lecturas del arranque guiado se pisan (issue #50): el sondeo de 8 s, el regreso de segundo plano (la cámara) y el
 * aviso de «publicó» pueden dejar dos en vuelo. La que llega última no siempre es la que arrancó última: una respuesta
 * vieja no puede deshacer lo que dijo la nueva (antes un fallo tardío dejaba el paso en «ninguno» después de un «publicar»
 * bueno, y el siguiente éxito lo volvía a «publicar»: la guía saltaba sola).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

type Resolver<T> = { promesa: Promise<T>; resolver: (v: T) => void; rechazar: (e: unknown) => void };
function diferida<T>(): Resolver<T> {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const promesa = new Promise<T>((ok, mal) => {
    resolver = ok;
    rechazar = mal;
  });
  return { promesa, resolver, rechazar };
}

const mockObtenerEstado = jest.fn<() => Promise<{ pactSignedAt: string | null }>>();
const mockActivacion = jest.fn<() => Promise<{ activated: boolean }>>();
const mockContar = jest.fn<() => Promise<number>>();

jest.mock('../../onboarding/api/onboardingApi', () => ({
  obtenerEstado: () => mockObtenerEstado(),
  consultarActivacionPrograma: () => mockActivacion(),
}));
jest.mock('../../community/api/wallApi', () => ({ contarMisPublicaciones: () => mockContar() }));

import { useArranqueGuiado } from '../hooks/useArranqueGuiado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Valor = ReturnType<typeof useArranqueGuiado>;
let raiz: ReactTestRenderer | null = null;
let valor!: Valor;

function Arnes() {
  valor = useArranqueGuiado(true);
  return null;
}

/** Monta el hook con las lecturas iniciales ya resueltas (sin Pacto, Día 1 elegido y `publicaciones` posts). */
async function montar(publicaciones = 0) {
  mockObtenerEstado.mockResolvedValue({ pactSignedAt: null });
  mockActivacion.mockResolvedValue({ activated: true });
  mockContar.mockResolvedValue(publicaciones);
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Arnes));
  });
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
  mockObtenerEstado.mockReset();
  mockActivacion.mockReset();
  mockContar.mockReset();
});

describe('qué paso dice la lectura', () => {
  it('sin posts publicados: publicar el primero', async () => {
    await montar(0);
    expect(valor.estado).toEqual({ paso: 'PUBLICAR_PRIMER_POST' });
  });

  it('con un post y sin Pacto: firmar el Pacto', async () => {
    await montar(1);
    expect(valor.estado).toEqual({ paso: 'FIRMAR_PACTO' });
  });
});

describe('una respuesta vieja no deshace la nueva', () => {
  it('un fallo tardío de la lectura anterior no apaga el paso que dijo la nueva', async () => {
    await montar(0);
    const lenta = diferida<{ pactSignedAt: string | null }>();
    mockObtenerEstado.mockReturnValueOnce(lenta.promesa);
    let primera!: Promise<void>;
    act(() => {
      primera = valor.revisar();
    });
    // La segunda lectura arranca después, responde enseguida y dice «publicar».
    mockObtenerEstado.mockResolvedValueOnce({ pactSignedAt: null });
    await act(async () => {
      await valor.revisar();
    });
    expect(valor.estado).toEqual({ paso: 'PUBLICAR_PRIMER_POST' });

    // La primera falla ahora (red que despierta tarde): no puede pisar a la segunda.
    await act(async () => {
      lenta.rechazar(new Error('Network request failed'));
      await primera;
    });
    expect(valor.estado).toEqual({ paso: 'PUBLICAR_PRIMER_POST' });
  });

  it('un éxito tardío de la lectura anterior no revive el paso que la nueva apagó', async () => {
    await montar(0);
    const lenta = diferida<{ pactSignedAt: string | null }>();
    mockObtenerEstado.mockReturnValueOnce(lenta.promesa);
    let primera!: Promise<void>;
    act(() => {
      primera = valor.revisar();
    });
    mockObtenerEstado.mockRejectedValueOnce(new Error('Network request failed'));
    await act(async () => {
      await valor.revisar();
    });
    expect(valor.estado).toEqual({ paso: 'NINGUNO' });

    await act(async () => {
      lenta.resolver({ pactSignedAt: null });
      await primera;
    });
    expect(valor.estado).toEqual({ paso: 'NINGUNO' });
  });

  it('firmar el Pacto cierra el arranque aunque una lectura que ya salió todavía diga «firmar»', async () => {
    await montar(1);
    const lenta = diferida<{ pactSignedAt: string | null }>();
    mockObtenerEstado.mockReturnValueOnce(lenta.promesa);
    let enVuelo!: Promise<void>;
    act(() => {
      enVuelo = valor.revisar();
    });
    act(() => valor.marcarPactoFirmado());
    expect(valor.estado).toEqual({ paso: 'NINGUNO' });

    await act(async () => {
      lenta.resolver({ pactSignedAt: null });
      await enVuelo;
    });
    expect(valor.estado).toEqual({ paso: 'NINGUNO' });
  });
});
