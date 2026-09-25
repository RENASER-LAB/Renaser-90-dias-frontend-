import { describe, expect, it } from '@jest/globals';

import type { DetalleDelSemaforo, DiaDelSemaforo, SemaforoDeHoy } from '../../types/semaforo.types';
import {
  comoAbrirElSemaforoDelGrupo,
  diasParaLaTarjeta,
  entradaDelResumenVisible,
  hayQuePedirMiSemaforo,
  quienAbreElResumenPorGrupos,
  seOcultaLaSeccion,
} from '../entradasDelSemaforo';
import { VIGENTE, type PosicionSemanal } from '../semanasDelSemaforo';

/**
 * Cuándo aparece cada entrada al semáforo y qué abre cada aviso. Son las condiciones que viven en
 * Hoy —pestaña protegida— y en «Mi grupo»; acá se prueban sin montar ninguna de las dos.
 */

const dia = (fecha: string): DiaDelSemaforo => ({
  fecha, estado: 'MEDIDO', porcentaje: 80, color: 'VERDE', habitos: null, objetivos: null,
});

const deHoy = (dias: DiaDelSemaforo[] | null): SemaforoDeHoy => ({
  color: 'VERDE', etiqueta: 'Al día', porcentaje: 80, diasConDatos: 7, pausado: false, dias,
});

const detalle = (dias: DiaDelSemaforo[]): DetalleDelSemaforo => ({
  aplica: true, obligatorio: true, zona: 'America/Lima', pausa: null, semanas: [], calculadoEn: null,
  vigente: { desde: '2026-09-18', hasta: '2026-09-24', porcentaje: 80, color: 'VERDE', etiqueta: null, diasConDatos: 7, cerrada: false, dias },
});

const semana: PosicionSemanal = { modo: 'semana', semanaHasta: '2026-09-18' };

describe('la tarjeta del semáforo propio en Hoy', () => {
  it('con los días de `/home`, usa esos y no hace falta `/me/semaforo`', () => {
    const conDias = deHoy([dia('2026-09-18')]);
    expect(diasParaLaTarjeta(conDias, detalle([dia('2026-09-01')]))).toEqual([dia('2026-09-18')]);
    expect(hayQuePedirMiSemaforo(conDias, false)).toBe(false);
  });

  it('sin los días de `/home`, como antes: las barras salen del detalle', () => {
    const sinDias = deHoy(null);
    expect(hayQuePedirMiSemaforo(sinDias, false)).toBe(true);
    expect(diasParaLaTarjeta(sinDias, detalle([dia('2026-09-01')]))).toEqual([dia('2026-09-01')]);
    expect(diasParaLaTarjeta(sinDias, null)).toBeNull();
  });

  it('una lista vacía de `/home` vino: se respeta y no se pide de nuevo', () => {
    expect(hayQuePedirMiSemaforo(deHoy([]), false)).toBe(false);
    expect(diasParaLaTarjeta(deHoy([]), detalle([dia('2026-09-01')]))).toEqual([]);
  });

  it('con el detalle abierto siempre se pide: los desgloses y las semanas solo vienen ahí', () => {
    expect(hayQuePedirMiSemaforo(deHoy([dia('2026-09-18')]), true)).toBe(true);
    expect(hayQuePedirMiSemaforo(null, true)).toBe(true);
  });

  it('quien no se mide no paga ninguna petición', () => {
    expect(hayQuePedirMiSemaforo(null, false)).toBe(false);
    expect(hayQuePedirMiSemaforo(undefined, false)).toBe(false);
  });
});

describe('una sección metida en otra pantalla (el grupo del mentor)', () => {
  it('desaparece con 404 o 403 en la ventana vigente', () => {
    expect(seOcultaLaSeccion({ posicion: VIGENTE, fallo: 'no_disponible' })).toBe(true);
    expect(seOcultaLaSeccion({ posicion: VIGENTE, fallo: 'sin_permiso' })).toBe(true);
  });

  it('un problema pasajero no la esconde: se dice y se reintenta', () => {
    expect(seOcultaLaSeccion({ posicion: VIGENTE, fallo: 'sin_red' })).toBe(false);
    expect(seOcultaLaSeccion({ posicion: VIGENTE, fallo: 'error' })).toBe(false);
    expect(seOcultaLaSeccion({ posicion: VIGENTE, fallo: null })).toBe(false);
  });

  /* Si se escondiera acá, se irían también las flechas para volver. */
  it('mirando una semana vieja no desaparece', () => {
    expect(seOcultaLaSeccion({ posicion: semana, fallo: 'sin_permiso' })).toBe(false);
  });
});

describe('la tarjeta del líder de mentores en Hoy', () => {
  it('no aparece mientras la primera lectura no respondió', () => {
    expect(entradaDelResumenVisible({ posicion: VIGENTE, datos: null, fallo: null })).toBe(false);
  });

  it('aparece cuando el servidor respondió', () => {
    expect(entradaDelResumenVisible({ posicion: VIGENTE, datos: {}, fallo: null })).toBe(true);
  });

  it('con 404 (sin desplegar) o 403 no aparece: Hoy queda como estaba', () => {
    expect(entradaDelResumenVisible({ posicion: VIGENTE, datos: null, fallo: 'no_disponible' })).toBe(false);
    expect(entradaDelResumenVisible({ posicion: VIGENTE, datos: null, fallo: 'sin_permiso' })).toBe(false);
  });

  it('con un fallo pasajero aparece: adentro se puede reintentar', () => {
    expect(entradaDelResumenVisible({ posicion: VIGENTE, datos: null, fallo: 'sin_red' })).toBe(true);
    expect(entradaDelResumenVisible({ posicion: VIGENTE, datos: null, fallo: 'error' })).toBe(true);
  });

  it('mirando otra semana (cargando) no desaparece', () => {
    expect(entradaDelResumenVisible({ posicion: semana, datos: null, fallo: null })).toBe(true);
  });
});

describe('qué abre el aviso `/semaforo/grupos`', () => {
  it('el líder de mentores, su pantalla', () => {
    expect(quienAbreElResumenPorGrupos({ esLider: true, administrar: false, cargandoCapacidades: true })).toBe('lider');
  });

  it('administración y alquimista, la vista de Administración', () => {
    expect(quienAbreElResumenPorGrupos({ esLider: false, administrar: true, cargandoCapacidades: false })).toBe(
      'administracion',
    );
  });

  it('mientras no se sabe si administra, espera (la capacidad la dice el servidor)', () => {
    expect(quienAbreElResumenPorGrupos({ esLider: false, administrar: false, cargandoCapacidades: true })).toBe('esperar');
  });

  it('a cualquier otro rol no le abre nada', () => {
    expect(quienAbreElResumenPorGrupos({ esLider: false, administrar: false, cargandoCapacidades: false })).toBe('nadie');
  });
});

describe('qué abre el aviso `/mentor/groups/{g}/semaforo`', () => {
  it('el grupo que acompaña: el grupo con el semáforo a la vista', () => {
    expect(comoAbrirElSemaforoDelGrupo('g-1', 'g-1')).toBe('seccion');
  });

  it('un grupo que ya no acompaña: el grupo y nada más', () => {
    expect(comoAbrirElSemaforoDelGrupo('g-viejo', 'g-1')).toBe('grupo');
  });
});
