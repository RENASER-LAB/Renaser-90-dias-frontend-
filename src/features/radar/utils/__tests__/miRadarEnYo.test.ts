import { describe, expect, it } from '@jest/globals';

import { miRadarDePrueba } from '../../__tests__/fixturasDeMiRadar';
import type { LecturaDeMiRadar } from '../../hooks/useConfigDeMiRadar';
import {
  DETALLE_DE_LA_FILA_SIN_PROGRAMA,
  hayQueAveriguarMiRadar,
  hayQueCerrarLaPantallaDeMiRadar,
  miRadarEnMarcha,
  seDibujaLaPantallaDeMiRadar,
  veLaFilaDeMiRadar,
} from '../miRadarEnYo';

/**
 * Cuándo Yo ofrece Mi Radar y cuándo dibuja su pantalla (spec 019). La fila del personal sin programa aparece SOLO cuando el servidor
 * confirmó el motivo (403 `PROGRAMA_NO_ACTIVADO`); para el aprendiz y para quien ya va por su programa, Yo no cambia.
 */

const LISTA: LecturaDeMiRadar = { estado: 'lista', config: miRadarDePrueba(false) };
const PENDIENTE: LecturaDeMiRadar = { estado: 'pendiente' };
const SIN_PROGRAMA: LecturaDeMiRadar = { estado: 'sin-programa' };
const SUSPENDIDA: LecturaDeMiRadar = { estado: 'bloqueada', motivo: 'suspendida' };
const SIN_PERMISO: LecturaDeMiRadar = { estado: 'bloqueada', motivo: 'sin-permiso' };
const FALLO: LecturaDeMiRadar = { estado: 'fallo' };
const NO_DISPONIBLE: LecturaDeMiRadar = { estado: 'no-disponible' };

describe('la fila «Mi Radar» de Yo', () => {
  it('quien ya lo tiene en marcha (día 8 o más y el servidor respondió) la ve, como siempre', () => {
    for (const dia of [8, 9, 40, 90]) {
      expect(veLaFilaDeMiRadar(LISTA, dia)).toBe(true);
      expect(miRadarEnMarcha(LISTA, dia)).toBe(true);
    }
  });

  it('el aprendiz o quien ya va por su programa, antes del día 8: sin fila (aunque el servidor ya haya respondido)', () => {
    for (const dia of [0, 1, 4, 7, null, undefined]) {
      expect(veLaFilaDeMiRadar(LISTA, dia)).toBe(false);
      expect(veLaFilaDeMiRadar(PENDIENTE, dia)).toBe(false);
    }
  });

  it('el personal sin programa activado: la fila aparece cuando el servidor lo confirmó, con cualquier día', () => {
    for (const dia of [0, 3, null, undefined]) {
      expect(veLaFilaDeMiRadar(SIN_PROGRAMA, dia)).toBe(true);
      expect(miRadarEnMarcha(SIN_PROGRAMA, dia)).toBe(false);
    }
    expect(DETALLE_DE_LA_FILA_SIN_PROGRAMA).toBe('Primero elige tu Día 1');
  });

  it('mientras el servidor no lo confirma NO hay fila: ni pendiente, ni un backend anterior (404 o 403 sin motivo), ni un fallo', () => {
    for (const lectura of [PENDIENTE, NO_DISPONIBLE, FALLO]) {
      for (const dia of [0, 3, 12, null]) expect(veLaFilaDeMiRadar(lectura, dia)).toBe(false);
    }
  });

  it('la cuenta suspendida o sin permiso no ve la fila: Yo no cambia para quien ya tiene programa', () => {
    for (const lectura of [SUSPENDIDA, SIN_PERMISO]) {
      for (const dia of [0, 3, 12, null]) expect(veLaFilaDeMiRadar(lectura, dia)).toBe(false);
    }
  });
});

describe('a quién se le pregunta al servidor antes del día 8', () => {
  it('al personal sin fila de programa y al que tiene la fila sin Día 1', () => {
    expect(hayQueAveriguarMiRadar({ puedeIniciarPrograma: true, diaUnoSinElegir: false })).toBe(true);
    expect(hayQueAveriguarMiRadar({ puedeIniciarPrograma: false, diaUnoSinElegir: true })).toBe(true);
  });

  it('a nadie más: aprendices y quien ya va por su programa no piden nada', () => {
    expect(hayQueAveriguarMiRadar({ puedeIniciarPrograma: false, diaUnoSinElegir: false })).toBe(false);
  });
});

describe('la pantalla abierta', () => {
  const base = { abierta: true, diaPrograma: 12, desdeLaFilaSinPrograma: false };

  it('cerrada no se dibuja ni hay que cerrarla', () => {
    expect(seDibujaLaPantallaDeMiRadar({ ...base, abierta: false, lectura: LISTA })).toBe(false);
    expect(hayQueCerrarLaPantallaDeMiRadar({ ...base, abierta: false, lectura: NO_DISPONIBLE })).toBe(false);
  });

  it('con Mi Radar a la vista se dibuja y no se cierra', () => {
    expect(seDibujaLaPantallaDeMiRadar({ ...base, lectura: LISTA })).toBe(true);
    expect(hayQueCerrarLaPantallaDeMiRadar({ ...base, lectura: LISTA })).toBe(false);
  });

  it('desde la fila del personal sin programa se dibuja con el motivo, mientras carga tras elegir el Día 1 y cuando dice cuándo empieza', () => {
    for (const lectura of [SIN_PROGRAMA, PENDIENTE, LISTA, FALLO]) {
      const estado = { abierta: true, lectura, diaPrograma: 0, desdeLaFilaSinPrograma: true };
      expect(seDibujaLaPantallaDeMiRadar(estado)).toBe(true);
      expect(hayQueCerrarLaPantallaDeMiRadar(estado)).toBe(false);
    }
  });

  it('desde la fila, si el servidor dice que ya no lo ofrece (backend anterior), se cierra', () => {
    const estado = { abierta: true, lectura: NO_DISPONIBLE, diaPrograma: 0, desdeLaFilaSinPrograma: true };
    expect(hayQueCerrarLaPantallaDeMiRadar(estado)).toBe(true);
  });

  it('un aviso viejo en alguien que está antes del día 8 (y no viene de la fila) no deja la pantalla abierta', () => {
    for (const dia of [0, 3, 7]) {
      const estado = { abierta: true, lectura: PENDIENTE, diaPrograma: dia, desdeLaFilaSinPrograma: false };
      expect(hayQueCerrarLaPantallaDeMiRadar(estado)).toBe(true);
      expect(seDibujaLaPantallaDeMiRadar(estado)).toBe(false);
    }
  });

  it('un aviso desde el día 8 espera mientras se lee (no se dibuja ni se cierra)', () => {
    expect(seDibujaLaPantallaDeMiRadar({ ...base, lectura: PENDIENTE })).toBe(false);
    expect(hayQueCerrarLaPantallaDeMiRadar({ ...base, lectura: PENDIENTE })).toBe(false);
    // Sin saber el día todavía tampoco se cierra.
    expect(hayQueCerrarLaPantallaDeMiRadar({ ...base, diaPrograma: undefined, lectura: PENDIENTE })).toBe(false);
  });

  it('un aviso desde el día 8: si el servidor dijo por qué no (suspendida, sin permiso) o no se pudo leer, la pantalla lo explica', () => {
    for (const lectura of [SUSPENDIDA, SIN_PERMISO, FALLO]) {
      expect(seDibujaLaPantallaDeMiRadar({ ...base, lectura })).toBe(true);
      expect(hayQueCerrarLaPantallaDeMiRadar({ ...base, lectura })).toBe(false);
    }
  });

  it('un backend que no lo ofrece cierra la pantalla, venga de donde venga', () => {
    expect(hayQueCerrarLaPantallaDeMiRadar({ ...base, lectura: NO_DISPONIBLE })).toBe(true);
    expect(seDibujaLaPantallaDeMiRadar({ ...base, lectura: NO_DISPONIBLE })).toBe(false);
  });
});
