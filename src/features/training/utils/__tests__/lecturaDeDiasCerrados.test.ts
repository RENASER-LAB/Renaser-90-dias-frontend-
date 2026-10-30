import { describe, expect, it, jest } from '@jest/globals';
import { ApiError } from '../../../../services/http/apiClient';
import type { TrackDelDiaApi } from '../../../habits/types/habits.types';
import { crearLecturaDeDiasCerrados } from '../lecturaDeDiasCerrados';

const track = (id: string, fecha: string): TrackDelDiaApi => ({ id, fechaEjecucion: fecha } as TrackDelDiaApi);

/** Una lectura de red que se resuelve cuando la prueba lo dice, para ver qué pasa con el pedido en vuelo. */
function redControlada() {
  const pendientes: Array<{ fecha: string; ok: (t: TrackDelDiaApi[] | null) => void; mal: (e: unknown) => void }> = [];
  const leer = jest.fn((fecha: string) => new Promise<TrackDelDiaApi[] | null>((ok, mal) => pendientes.push({ fecha, ok, mal })));
  return { leer, pendientes };
}

describe('La memoria de los días anteriores (condición del dueño: «el endpoint se puede ejecutar 1000 veces»)', () => {
  it('tocar el mismo día varias veces hace UN solo pedido', async () => {
    const leer = jest.fn(async (fecha: string) => [track('a', fecha)]);
    const lectura = crearLecturaDeDiasCerrados(leer);
    lectura.alinear('cuenta-1', '2026-10-26');

    for (let i = 0; i < 25; i++) await lectura.pedir('2026-10-28');

    expect(leer).toHaveBeenCalledTimes(1);
    expect(leer).toHaveBeenCalledWith('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'datos', tracks: [track('a', '2026-10-28')] });
  });

  it('dos toques seguidos comparten el pedido en vuelo', async () => {
    const { leer, pendientes } = redControlada();
    const lectura = crearLecturaDeDiasCerrados(leer);
    lectura.alinear('cuenta-1', '2026-10-26');

    const primero = lectura.pedir('2026-10-28');
    const segundo = lectura.pedir('2026-10-28');
    const tercero = lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'cargando' });
    expect(leer).toHaveBeenCalledTimes(1);

    pendientes[0].ok([track('a', '2026-10-28')]);
    await Promise.all([primero, segundo, tercero]);
    expect(leer).toHaveBeenCalledTimes(1);
    expect(lectura.estadoDe('2026-10-28')?.estado).toBe('datos');
  });

  it('cada fecha se pide una vez', async () => {
    const leer = jest.fn(async (fecha: string) => [track(fecha, fecha)]);
    const lectura = crearLecturaDeDiasCerrados(leer);
    lectura.alinear('cuenta-1', '2026-10-26');
    for (const fecha of ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-27', '2026-10-26', '2026-10-28']) await lectura.pedir(fecha);
    expect(leer).toHaveBeenCalledTimes(3);
  });

  it('un error no se reintenta solo: queda como error hasta que la persona toca «Reintentar»', async () => {
    const leer = jest.fn<(fecha: string) => Promise<TrackDelDiaApi[] | null>>()
      .mockRejectedValueOnce(new ApiError(503, 'sin servicio'))
      .mockResolvedValueOnce([track('a', '2026-10-28')]);
    const lectura = crearLecturaDeDiasCerrados(leer);
    lectura.alinear('cuenta-1', '2026-10-26');

    await lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'error' });
    // Tocar el día otra vez NO vuelve a pedir.
    await lectura.pedir('2026-10-28');
    await lectura.pedir('2026-10-28');
    expect(leer).toHaveBeenCalledTimes(1);

    await lectura.pedir('2026-10-28', { reintentar: true });
    expect(leer).toHaveBeenCalledTimes(2);
    expect(lectura.estadoDe('2026-10-28')?.estado).toBe('datos');
  });

  it('un error de red (no una respuesta del servidor) también es error, no «sin datos»', async () => {
    const lectura = crearLecturaDeDiasCerrados(async () => {
      throw new TypeError('Network request failed');
    });
    lectura.alinear('c', 's');
    await lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'error' });
  });

  it.each([400, 403, 404])('un %s es «sin datos»: definitivo, no se reintenta ni siquiera con el toque', async status => {
    const leer = jest.fn(async () => {
      throw new ApiError(status, 'No hay datos de ese día');
    });
    const lectura = crearLecturaDeDiasCerrados(leer);
    lectura.alinear('c', 's');
    await lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'sin-datos' });
    await lectura.pedir('2026-10-28');
    await lectura.pedir('2026-10-28', { reintentar: true });
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('una respuesta que no calza (null) es «sin datos» y también queda guardada', async () => {
    const leer = jest.fn(async () => null);
    const lectura = crearLecturaDeDiasCerrados(leer);
    lectura.alinear('c', 's');
    await lectura.pedir('2026-10-28');
    await lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'sin-datos' });
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('un día sin registros ([]) son datos, no «sin datos»', async () => {
    const lectura = crearLecturaDeDiasCerrados(async () => []);
    lectura.alinear('c', 's');
    await lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'datos', tracks: [] });
  });

  describe('al cambiar de cuenta o de semana, la memoria se limpia', () => {
    it('otra cuenta vuelve a pedir', async () => {
      const leer = jest.fn(async (fecha: string) => [track('a', fecha)]);
      const lectura = crearLecturaDeDiasCerrados(leer);
      lectura.alinear('cuenta-1', '2026-10-26');
      await lectura.pedir('2026-10-28');
      lectura.alinear('cuenta-1', '2026-10-26'); // lo mismo: no limpia
      await lectura.pedir('2026-10-28');
      expect(leer).toHaveBeenCalledTimes(1);

      lectura.alinear('cuenta-2', '2026-10-26');
      expect(lectura.estadoDe('2026-10-28')).toBeUndefined();
      await lectura.pedir('2026-10-28');
      expect(leer).toHaveBeenCalledTimes(2);
    });

    it('otra semana vuelve a pedir', async () => {
      const leer = jest.fn(async (fecha: string) => [track('a', fecha)]);
      const lectura = crearLecturaDeDiasCerrados(leer);
      lectura.alinear('cuenta-1', '2026-10-26');
      await lectura.pedir('2026-10-28');
      lectura.alinear('cuenta-1', '2026-11-02');
      expect(lectura.estadoDe('2026-10-28')).toBeUndefined();
      await lectura.pedir('2026-11-04');
      expect(leer).toHaveBeenCalledTimes(2);
    });

    it('una respuesta que llega tarde de la cuenta anterior no se guarda en la nueva', async () => {
      const { leer, pendientes } = redControlada();
      const lectura = crearLecturaDeDiasCerrados(leer);
      lectura.alinear('cuenta-1', 's');
      const vieja = lectura.pedir('2026-10-28');
      lectura.alinear('cuenta-2', 's');
      pendientes[0].ok([track('de-la-cuenta-1', '2026-10-28')]);
      await vieja;
      expect(lectura.estadoDe('2026-10-28')).toBeUndefined();
    });
  });

  it('avisa a quien escucha cuando cambia algo, y deja de avisar al darse de baja', async () => {
    const lectura = crearLecturaDeDiasCerrados(async () => []);
    lectura.alinear('c', 's');
    const oyente = jest.fn();
    const baja = lectura.suscribir(oyente);
    await lectura.pedir('2026-10-28');
    expect(oyente).toHaveBeenCalled();
    const llamadas = oyente.mock.calls.length;
    baja();
    await lectura.pedir('2026-10-27');
    expect(oyente.mock.calls.length).toBe(llamadas);
  });

  it('crear la memoria o alinearla NO pide nada', () => {
    const leer = jest.fn(async () => []);
    const lectura = crearLecturaDeDiasCerrados(leer);
    lectura.alinear('c', 's');
    lectura.alinear('c2', 's2');
    expect(leer).not.toHaveBeenCalled();
  });
});
