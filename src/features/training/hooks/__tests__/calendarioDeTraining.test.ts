/**
 * El calendario de Training por hora (spec 014), la parte de HOOKS, con fechas fijas:
 *
 * - caso 2 · LUNES — `useDiasCerrados` no guarda nada de la semana anterior cuando `semana` pasa al lunes nuevo, ni de
 *   otra cuenta, ni deja que una respuesta tardía de la semana vieja aparezca en la nueva;
 * - caso 3 · CRUCE DE MEDIANOCHE — `useActualizacionDelDia` (spec 002) relee el día EXACTAMENTE al cierre del día de
 *   la persona (domingo 23:59:59 → lunes 00:00:00), también si la app volvió del segundo plano, y no relee de más.
 *
 * La pantalla montada entera (la fila que cambia de semana, el día elegido, la hoja) está en
 * `components/__tests__/calendarioDeTraining.test.ts`.
 *
 * Calendario de 2026 (jest corre en `America/Lima`, UTC−5): dom 1/11 · lun 2/11. Lima: 23:59:59 del domingo = 04:59:59Z.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import type { ContextoDelDia } from '../../../habits/api/diaDeHabitosApi';
import type { TrackDelDiaApi } from '../../../habits/types/habits.types';
import { useActualizacionDelDia } from '../useActualizacionDelDia';
import { useDiasCerrados } from '../useDiasCerrados';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

/* ---------------------------------------------------------------------------------------------------------------
 * caso 2 · useDiasCerrados al pasar al lunes
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 2 · LUNES: useDiasCerrados no arrastra la semana anterior ni otra cuenta', () => {
  const SEMANA_VIEJA = '2026-10-26'; // el lunes de la semana que termina el domingo 1/11
  const SEMANA_NUEVA = '2026-11-02'; // el lunes nuevo
  const DIAS_VIEJOS = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'];

  const respuesta = (fecha: string): TrackDelDiaApi[] => [{ id: `t-${fecha}`, fechaEjecucion: fecha } as TrackDelDiaApi];
  const leer = jest.fn(async (fecha: string): Promise<TrackDelDiaApi[] | null> => respuesta(fecha));
  let hook!: ReturnType<typeof useDiasCerrados>;

  function Sonda({ cuenta, semana }: { cuenta: string; semana: string }) {
    hook = useDiasCerrados({ cuentaId: cuenta, semana, leer });
    return null;
  }
  const montar = (cuenta = 'cuenta-1', semana = SEMANA_VIEJA) =>
    act(async () => { raiz = TestRenderer.create(React.createElement(Sonda, { cuenta, semana })); });
  const cambiar = (cuenta: string, semana: string) =>
    act(async () => { raiz!.update(React.createElement(Sonda, { cuenta, semana })); });

  beforeEach(() => {
    leer.mockClear();
    leer.mockImplementation(async fecha => respuesta(fecha));
  });
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
  });

  it('LUNES: leída toda la semana del domingo, al llegar el lunes nuevo (otro `semana`) no queda NADA guardado', async () => {
    await montar();
    for (const dia of DIAS_VIEJOS) await act(async () => { await hook.pedir(dia); });
    expect(leer).toHaveBeenCalledTimes(6);
    for (const dia of DIAS_VIEJOS) expect(hook.estadoDe(dia)?.estado).toBe('datos');

    await cambiar('cuenta-1', SEMANA_NUEVA);
    for (const dia of DIAS_VIEJOS) expect(hook.estadoDe(dia)).toBeUndefined();
    // Cambiar de semana limpia, pero NO pide nada por su cuenta: solo el toque pide.
    expect(leer).toHaveBeenCalledTimes(6);
  });

  it('LUNES: y si vuelve a pedir un día de esa fecha, sale un pedido nuevo (no resucita la lectura vieja)', async () => {
    await montar();
    await act(async () => { await hook.pedir('2026-10-28'); });
    await cambiar('cuenta-1', SEMANA_NUEVA);
    await act(async () => { await hook.pedir('2026-10-28'); });
    expect(leer).toHaveBeenCalledTimes(2);
  });

  it('LUNES: otra cuenta (otro cuentaId) con la MISMA semana tampoco hereda nada, ni al volver a la primera', async () => {
    await montar('cuenta-1', SEMANA_VIEJA);
    await act(async () => { await hook.pedir('2026-10-28'); });
    await cambiar('cuenta-2', SEMANA_VIEJA);
    expect(hook.estadoDe('2026-10-28')).toBeUndefined();
    await act(async () => { await hook.pedir('2026-10-29'); });
    await cambiar('cuenta-1', SEMANA_VIEJA);
    expect(hook.estadoDe('2026-10-28')).toBeUndefined();
    expect(hook.estadoDe('2026-10-29')).toBeUndefined();
  });

  it('LUNES: una respuesta que llega TARDE de la semana vieja se descarta y no aparece en la semana nueva', async () => {
    let responder!: (t: TrackDelDiaApi[]) => void;
    leer.mockImplementationOnce(() => new Promise<TrackDelDiaApi[]>(r => { responder = r; }));
    await montar();
    // El domingo a las 23:59 la persona toca el sábado; el pedido sigue en vuelo cuando pasa la medianoche.
    let pedido!: Promise<void>;
    await act(async () => { pedido = hook.pedir('2026-10-31'); });
    expect(hook.estadoDe('2026-10-31')?.estado).toBe('cargando');

    await cambiar('cuenta-1', SEMANA_NUEVA);
    expect(hook.estadoDe('2026-10-31')).toBeUndefined();

    await act(async () => {
      responder(respuesta('2026-10-31'));
      await pedido;
    });
    // La respuesta de la época anterior no se guarda: la memoria nueva sigue vacía.
    expect(hook.estadoDe('2026-10-31')).toBeUndefined();
  });

  it('LUNES: tampoco se queda un error de la semana vieja: el mismo día se vuelve a pedir limpio', async () => {
    leer.mockRejectedValueOnce(new Error('sin red'));
    await montar();
    await act(async () => { await hook.pedir('2026-10-28'); });
    expect(hook.estadoDe('2026-10-28')?.estado).toBe('error');
    await cambiar('cuenta-1', SEMANA_NUEVA);
    expect(hook.estadoDe('2026-10-28')).toBeUndefined();
    await act(async () => { await hook.pedir('2026-10-28'); });
    expect(hook.estadoDe('2026-10-28')?.estado).toBe('datos');
  });

  it('LUNES: dibujar muchas veces con la misma cuenta y semana NO limpia (solo cambiar una de las dos)', async () => {
    await montar();
    await act(async () => { await hook.pedir('2026-10-28'); });
    for (let i = 0; i < 10; i++) await cambiar('cuenta-1', SEMANA_VIEJA);
    expect(hook.estadoDe('2026-10-28')?.estado).toBe('datos');
    expect(leer).toHaveBeenCalledTimes(1);
  });
});

/* ---------------------------------------------------------------------------------------------------------------
 * caso 3 · useActualizacionDelDia al cruzar la medianoche
 * ------------------------------------------------------------------------------------------------------------- */
describe('caso 3 · CRUCE DE MEDIANOCHE: useActualizacionDelDia relee el día exactamente al cierre', () => {
  /** El snapshot de un día de Lima que cierra en `cierraEn`, recibido ahora. */
  const contextoDe = (fechaLocal: string, cierraEn: string): ContextoDelDia => ({
    fechaLocal,
    zonaHoraria: 'America/Lima',
    cierraEn,
    ahoraServidor: new Date(Date.now()).toISOString(),
    recibidoEn: Date.now(),
    recibidoMonotono: performance.now(),
  });
  const CIERRA_EL_DOMINGO = '2026-11-02T05:00:00.000Z'; // lunes 00:00:00 en Lima
  const CIERRA_EL_LUNES = '2026-11-03T05:00:00.000Z';

  const actualizar = jest.fn<(invalidar?: boolean) => Promise<void>>(async () => undefined);

  function Sonda({ activa, contexto }: { activa: boolean; contexto: ContextoDelDia | null }) {
    useActualizacionDelDia({ activa, contexto, actualizar });
    return null;
  }
  const montar = (contexto: ContextoDelDia | null, activa = true) =>
    act(async () => { raiz = TestRenderer.create(React.createElement(Sonda, { activa, contexto })); });
  const poner = (contexto: ContextoDelDia | null, activa = true) =>
    act(async () => { raiz!.update(React.createElement(Sonda, { activa, contexto })); });
  const avanzar = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-02T04:58:30Z')); // domingo 23:58:30 en Lima: faltan 90 s
    actualizar.mockClear();
  });
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('MEDIANOCHE: antes del cierre no relee; al llegar el cierre del domingo relee UNA vez e invalida', async () => {
    await montar(contextoDe('2026-11-01', CIERRA_EL_DOMINGO));
    // Al activarse (foco) relee una vez, como siempre.
    expect(actualizar).toHaveBeenCalledTimes(1);
    actualizar.mockClear();

    await avanzar(89_999); // 23:59:59.999
    expect(actualizar).not.toHaveBeenCalled();

    await avanzar(1); // 00:00:00.000
    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(actualizar).toHaveBeenLastCalledWith(true);
  });

  it('MEDIANOCHE: ya con el día del lunes en la mano, el próximo cierre es el del lunes (no vuelve a releer en cada minuto)', async () => {
    await montar(contextoDe('2026-11-01', CIERRA_EL_DOMINGO));
    actualizar.mockClear();
    await avanzar(90_000); // medianoche: se relee
    expect(actualizar).toHaveBeenCalledTimes(1);

    // La relectura trae el snapshot del lunes: el hook arma el cierre del lunes.
    await poner(contextoDe('2026-11-02', CIERRA_EL_LUNES));
    actualizar.mockClear();
    await avanzar(5 * 60_000); // pasan cinco minutos con el revisor de 60 s corriendo
    expect(actualizar).not.toHaveBeenCalled();
    // El cierre del lunes está a 24 h de la medianoche: hasta 23 h después, ni el temporizador ni el revisor sueltan nada.
    await avanzar(22 * 60 * 60_000);
    expect(actualizar).not.toHaveBeenCalled();
    // Y al llegar el cierre del lunes (24 h después de las 00:00), se relee.
    await avanzar(2 * 60 * 60_000);
    expect(actualizar).toHaveBeenCalled();
    expect(actualizar).toHaveBeenLastCalledWith(true);
  });

  it('MEDIANOCHE: si el snapshot que llega ya está vencido (el día cerró mientras se pedía), relee de inmediato', async () => {
    // El cierre del snapshot es anterior a la hora del servidor con la que se recibió: el día ya no rige.
    const vencido = contextoDe('2026-11-01', '2026-11-02T04:00:00.000Z');
    await montar(vencido);
    actualizar.mockClear();
    await avanzar(0);
    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(actualizar).toHaveBeenLastCalledWith(true);
  });

  it('MEDIANOCHE: volver del segundo plano después de la medianoche relee el día', async () => {
    let cambiarEstado!: (estado: AppStateStatus) => void;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_evento, callback) => {
      cambiarEstado = callback as (estado: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
    await montar(contextoDe('2026-11-01', CIERRA_EL_DOMINGO));
    actualizar.mockClear();
    await act(async () => { cambiarEstado('background'); });
    expect(actualizar).not.toHaveBeenCalled();
    await act(async () => { cambiarEstado('active'); });
    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(actualizar).toHaveBeenLastCalledWith(true);
  });

  it('MEDIANOCHE: con Training fuera de foco (activa = false) no hay temporizador: no relee solo en segundo plano', async () => {
    await montar(contextoDe('2026-11-01', CIERRA_EL_DOMINGO), false);
    await avanzar(10 * 60_000);
    expect(actualizar).not.toHaveBeenCalled();
    // Al enfocarlo otra vez, el primer efecto relee.
    await poner(contextoDe('2026-11-01', CIERRA_EL_DOMINGO), true);
    expect(actualizar).toHaveBeenCalledWith(true);
  });
});
