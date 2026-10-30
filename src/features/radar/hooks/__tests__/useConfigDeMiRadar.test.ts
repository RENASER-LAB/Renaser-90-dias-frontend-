import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La lectura de Mi Radar (spec 019): un 403 ya no se lee como «no hay Mi Radar» en silencio cuando trae un motivo (`codigo` del
 * cuerpo): sin programa activado (el personal sin Día 1), cuenta suspendida o sin permiso. Un 404 es un backend anterior, y **un 403 sin
 * motivo (un backend anterior a la 019) se lee como siempre: «no hay Mi Radar»**. La red y los 5xx son un fallo que no se interpreta.
 * Antes del día 8 no se lee sola: solo cuando alguien lo pide (`solicitar`, `reiniciar`). Y al volver a leer no queda a la vista el
 * motivo anterior.
 */

const mockObtenerMiRadar = jest.fn<() => Promise<unknown>>();
jest.mock('../../api/radarApi', () => ({
  obtenerMiRadar: () => mockObtenerMiRadar(),
  guardarMiRadar: jest.fn(),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { avisarDiaUnoElegido } from '../../../programa/events/avisoDiaUnoElegido';
import { miRadarDePrueba } from '../../__tests__/fixturasDeMiRadar';
import { useConfigDeMiRadar, lecturaDeUnError, type LecturaDeMiRadar } from '../useConfigDeMiRadar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
const visto = { actual: undefined as unknown as ReturnType<typeof useConfigDeMiRadar> };
/** Cada estado que se dibujó, en orden: lo que la pantalla habría llegado a mostrar. */
const dibujado: string[] = [];
function Sonda({ dia, usuario }: { dia: number | null; usuario: string | null }) {
  visto.actual = useConfigDeMiRadar(dia, usuario);
  dibujado.push(visto.actual.lectura.estado);
  return null;
}
async function vaciar() {
  await act(async () => {
    await new Promise<void>(r => setImmediate(r));
  });
}
function dibujar(dia: number | null, usuario: string | null) {
  return React.createElement(Sonda, { dia, usuario });
}
async function montar(dia: number | null, usuario: string | null = 'u1') {
  act(() => {
    raiz = TestRenderer.create(dibujar(dia, usuario));
  });
  await vaciar();
}
async function actualizar(dia: number | null, usuario: string | null) {
  act(() => raiz?.update(dibujar(dia, usuario)));
  await vaciar();
}

const prohibido = (codigo: string | null, mensaje = 'No autorizado') =>
  new ApiError(403, mensaje, codigo === null ? { message: mensaje } : { message: mensaje, codigo });

beforeEach(() => {
  mockObtenerMiRadar.mockReset();
  dibujado.length = 0;
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('qué dice un error de lectura', () => {
  it('404: un backend anterior; 403 con motivo conocido: sin programa, suspendida o sin permiso', () => {
    expect(lecturaDeUnError(new ApiError(404, 'no hay'))).toEqual({ estado: 'no-disponible' });
    expect(lecturaDeUnError(prohibido('PROGRAMA_NO_ACTIVADO', 'Mi Radar empieza en tu día 8. Primero elige tu Día 1.'))).toEqual({ estado: 'sin-programa' });
    expect(lecturaDeUnError(prohibido('CUENTA_SUSPENDIDA', 'Cuenta suspendida'))).toEqual({ estado: 'bloqueada', motivo: 'suspendida' });
    expect(lecturaDeUnError(prohibido('SIN_PERMISO'))).toEqual({ estado: 'bloqueada', motivo: 'sin-permiso' });
  });

  it('un 403 SIN motivo se lee como hoy —«no hay Mi Radar», en silencio—, igual que uno con un motivo que esta app no conoce', () => {
    expect(lecturaDeUnError(prohibido(null, 'El Codigo Renaser es exclusivo de aprendices'))).toEqual({ estado: 'no-disponible' });
    expect(lecturaDeUnError(prohibido(null, 'Cuenta suspendida'))).toEqual({ estado: 'no-disponible' });
    expect(lecturaDeUnError(prohibido('UN_MOTIVO_DEL_FUTURO'))).toEqual({ estado: 'no-disponible' });
    // Un cuerpo que no es un objeto (HTML de un proxy, vacío) tampoco inventa nada.
    expect(lecturaDeUnError(new ApiError(403, 'x', '<html>'))).toEqual({ estado: 'no-disponible' });
    expect(lecturaDeUnError(new ApiError(403, 'x'))).toEqual({ estado: 'no-disponible' });
  });

  it('la red y los 5xx no se interpretan (son un fallo); lo que no es un ApiError tampoco', () => {
    expect(lecturaDeUnError(new ApiError(500, 'boom'))).toBeNull();
    expect(lecturaDeUnError(new ApiError(503, 'caído'))).toBeNull();
    expect(lecturaDeUnError(new ApiError(0, 'sin red'))).toBeNull();
    expect(lecturaDeUnError(new Error('x'))).toBeNull();
  });
});

describe('desde el día 8 se lee sola', () => {
  const casos: Array<[string, unknown, LecturaDeMiRadar]> = [
    ['200: la lista', miRadarDePrueba(true), { estado: 'lista', config: miRadarDePrueba(true) }],
    ['403 PROGRAMA_NO_ACTIVADO: sin programa', prohibido('PROGRAMA_NO_ACTIVADO'), { estado: 'sin-programa' }],
    ['403 CUENTA_SUSPENDIDA: bloqueada por suspensión', prohibido('CUENTA_SUSPENDIDA', 'Cuenta suspendida'), { estado: 'bloqueada', motivo: 'suspendida' }],
    ['403 SIN_PERMISO: bloqueada por permiso', prohibido('SIN_PERMISO'), { estado: 'bloqueada', motivo: 'sin-permiso' }],
    ['403 sin motivo (backend anterior): como hoy, no hay Mi Radar', prohibido(null), { estado: 'no-disponible' }],
    ['404: backend anterior', new ApiError(404, 'no hay'), { estado: 'no-disponible' }],
    ['5xx: un fallo', new ApiError(503, 'caído'), { estado: 'fallo' }],
    ['sin red: un fallo', new ApiError(0, 'sin red'), { estado: 'fallo' }],
  ];

  it.each(casos)('%s', async (_nombre, respuesta, esperada) => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    if (respuesta instanceof Error) mockObtenerMiRadar.mockRejectedValue(respuesta);
    else mockObtenerMiRadar.mockResolvedValue(respuesta);
    await montar(10);
    expect(visto.actual.lectura).toEqual(esperada);
    aviso.mockRestore();
  });

  it('mientras llega la respuesta está «pendiente»: ni un motivo ni «lista» por adelantado', async () => {
    mockObtenerMiRadar.mockReturnValue(new Promise(() => undefined));
    await montar(10);
    expect(dibujado).toEqual(['pendiente']);
  });

  it('un fallo no borra lo que ya se sabía: una lectura buena sobrevive a una red caída', async () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockObtenerMiRadar.mockResolvedValueOnce(miRadarDePrueba(true));
    await montar(10);
    mockObtenerMiRadar.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    act(() => visto.actual.recargar());
    await vaciar();
    expect(visto.actual.lectura.estado).toBe('lista');
    aviso.mockRestore();
  });

  it('un motivo del servidor tampoco se borra por una red caída al releer', async () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockObtenerMiRadar.mockRejectedValueOnce(prohibido('PROGRAMA_NO_ACTIVADO'));
    await montar(10);
    mockObtenerMiRadar.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    act(() => visto.actual.recargar());
    await vaciar();
    expect(visto.actual.lectura).toEqual({ estado: 'sin-programa' });
    aviso.mockRestore();
  });
});

describe('antes del día 8 no se lee sola', () => {
  it.each([0, 3, 7, null])('el día %s: no se pide nada mientras nadie lo pida', async dia => {
    mockObtenerMiRadar.mockResolvedValue(miRadarDePrueba(true));
    await montar(dia);
    expect(mockObtenerMiRadar).not.toHaveBeenCalled();
    expect(visto.actual.lectura).toEqual({ estado: 'pendiente' });
  });

  it('`solicitar` lo lee: el personal sin Día 1 recibe «sin programa»', async () => {
    mockObtenerMiRadar.mockRejectedValue(prohibido('PROGRAMA_NO_ACTIVADO'));
    await montar(0);
    act(() => visto.actual.solicitar());
    await vaciar();
    expect(mockObtenerMiRadar).toHaveBeenCalledTimes(1);
    expect(visto.actual.lectura).toEqual({ estado: 'sin-programa' });
  });

  it('`solicitar` es de una sola vez: pedirlo otra vez no vuelve a leer ni vacía lo que ya se sabe', async () => {
    mockObtenerMiRadar.mockRejectedValue(prohibido('PROGRAMA_NO_ACTIVADO'));
    await montar(0);
    act(() => visto.actual.solicitar());
    await vaciar();
    dibujado.length = 0;
    act(() => visto.actual.solicitar());
    act(() => visto.actual.solicitar());
    await vaciar();
    expect(mockObtenerMiRadar).toHaveBeenCalledTimes(1);
    expect(dibujado).not.toContain('pendiente');
    expect(visto.actual.lectura).toEqual({ estado: 'sin-programa' });
  });

  it('un backend anterior (403 sin motivo) deja «no hay Mi Radar»: la fila de Yo no aparece', async () => {
    mockObtenerMiRadar.mockRejectedValue(prohibido(null, 'El Codigo Renaser es exclusivo de aprendices'));
    await montar(0);
    act(() => visto.actual.solicitar());
    await vaciar();
    expect(visto.actual.lectura).toEqual({ estado: 'no-disponible' });
  });

  it('sin sesión no se pide nada, ni siquiera si se solicita', async () => {
    await montar(10, null);
    act(() => visto.actual.solicitar());
    act(() => visto.actual.reiniciar());
    await vaciar();
    expect(mockObtenerMiRadar).not.toHaveBeenCalled();
  });

  it('lo pedido por una cuenta no vale para la que entra después', async () => {
    mockObtenerMiRadar.mockRejectedValue(prohibido('PROGRAMA_NO_ACTIVADO'));
    await montar(0, 'u1');
    act(() => visto.actual.solicitar());
    await vaciar();
    expect(mockObtenerMiRadar).toHaveBeenCalledTimes(1);
    expect(visto.actual.lectura.estado).toBe('sin-programa');

    await actualizar(0, 'u2');
    // La otra cuenta no ve el motivo de la anterior y nadie pidió leer para ella.
    expect(visto.actual.lectura).toEqual({ estado: 'pendiente' });
    expect(mockObtenerMiRadar).toHaveBeenCalledTimes(1);
  });

  it('al llegar al día 8 con la app abierta se relee lo que se sabía, sin vaciarlo', async () => {
    mockObtenerMiRadar.mockResolvedValueOnce(miRadarDePrueba(false));
    await montar(0);
    act(() => visto.actual.solicitar());
    await vaciar();
    expect(visto.actual.lectura.estado).toBe('lista');

    dibujado.length = 0;
    mockObtenerMiRadar.mockResolvedValueOnce(miRadarDePrueba(true));
    await actualizar(8, 'u1');
    expect(mockObtenerMiRadar).toHaveBeenCalledTimes(2);
    expect(dibujado).not.toContain('pendiente');
    expect(visto.actual.lectura).toEqual({ estado: 'lista', config: miRadarDePrueba(true) });
  });
});

describe('volver a leer no deja a la vista el motivo anterior', () => {
  it('`reiniciar` (al volver de elegir el Día 1): de «sin programa» pasa por «pendiente» y recién después llega lo nuevo', async () => {
    mockObtenerMiRadar.mockRejectedValueOnce(prohibido('PROGRAMA_NO_ACTIVADO'));
    await montar(0);
    act(() => visto.actual.solicitar());
    await vaciar();
    expect(visto.actual.lectura.estado).toBe('sin-programa');

    dibujado.length = 0;
    let resolver!: (m: unknown) => void;
    mockObtenerMiRadar.mockReturnValueOnce(new Promise(r => (resolver = r)));
    act(() => visto.actual.reiniciar());
    // Mientras llega la respuesta: «pendiente», nunca «sin programa» otra vez.
    expect(dibujado).not.toContain('sin-programa');
    expect(visto.actual.lectura.estado).toBe('pendiente');
    await act(async () => resolver(miRadarDePrueba(false)));
    await vaciar();
    expect(visto.actual.lectura.estado).toBe('lista');
    expect(dibujado).not.toContain('sin-programa');
  });

  it('lo mismo con un fallo: «Reintentar» muestra la carga y no el fallo de antes', async () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockObtenerMiRadar.mockRejectedValueOnce(new ApiError(500, 'boom'));
    await montar(10);
    expect(visto.actual.lectura.estado).toBe('fallo');
    mockObtenerMiRadar.mockReturnValueOnce(new Promise(() => undefined));
    act(() => visto.actual.reiniciar());
    expect(visto.actual.lectura.estado).toBe('pendiente');
    aviso.mockRestore();
  });

  it('`recargar` (al abrir la pantalla) es en silencio: el motivo que ya se veía no vuelve a «pendiente»', async () => {
    mockObtenerMiRadar.mockRejectedValue(prohibido('PROGRAMA_NO_ACTIVADO'));
    await montar(0);
    act(() => visto.actual.solicitar());
    await vaciar();
    dibujado.length = 0;
    act(() => visto.actual.recargar());
    await vaciar();
    expect(mockObtenerMiRadar).toHaveBeenCalledTimes(2);
    expect(dibujado).not.toContain('pendiente');
    expect(visto.actual.lectura).toEqual({ estado: 'sin-programa' });
  });

  it('una lectura buena se relee en silencio también con `reiniciar`: no vuelve a «pendiente»', async () => {
    mockObtenerMiRadar.mockResolvedValue(miRadarDePrueba(true));
    await montar(10);
    dibujado.length = 0;
    act(() => visto.actual.reiniciar());
    await vaciar();
    expect(dibujado).not.toContain('pendiente');
  });

  it('una respuesta vieja no pisa a la nueva (se reinicia con una lectura todavía en vuelo)', async () => {
    let resolverVieja!: (m: unknown) => void;
    mockObtenerMiRadar.mockReturnValueOnce(new Promise(r => (resolverVieja = r)));
    await montar(10);
    mockObtenerMiRadar.mockResolvedValueOnce(miRadarDePrueba(true));
    act(() => visto.actual.reiniciar());
    await vaciar();
    expect(visto.actual.lectura).toEqual({ estado: 'lista', config: miRadarDePrueba(true) });
    // La vieja llega tarde, con otra cosa: se descarta.
    await act(async () => resolverVieja(miRadarDePrueba(false)));
    await vaciar();
    expect(visto.actual.lectura).toEqual({ estado: 'lista', config: miRadarDePrueba(true) });
  });
});

describe('elegir el Día 1 (en cualquier lugar de la app) invalida «sin programa»', () => {
  it('si ya se miraba Mi Radar: el motivo se olvida, se relee y llega la lectura nueva', async () => {
    mockObtenerMiRadar.mockRejectedValueOnce(prohibido('PROGRAMA_NO_ACTIVADO'));
    await montar(0);
    act(() => visto.actual.solicitar());
    await vaciar();
    expect(visto.actual.lectura.estado).toBe('sin-programa');

    dibujado.length = 0;
    mockObtenerMiRadar.mockResolvedValueOnce(miRadarDePrueba(false));
    await act(async () => {
      avisarDiaUnoElegido();
    });
    await vaciar();
    expect(mockObtenerMiRadar).toHaveBeenCalledTimes(2);
    expect(dibujado).not.toContain('sin-programa');
    expect(visto.actual.lectura.estado).toBe('lista');
  });

  it('si nadie lo había pedido (un aprendiz eligiendo su Día 1 en el onboarding) no se lee nada', async () => {
    await montar(0);
    await act(async () => {
      avisarDiaUnoElegido();
    });
    await vaciar();
    expect(mockObtenerMiRadar).not.toHaveBeenCalled();
    expect(visto.actual.lectura.estado).toBe('pendiente');
  });
});
