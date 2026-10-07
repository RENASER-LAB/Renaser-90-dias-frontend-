/**
 * El color vigente compartido (fénix de Hoy y del botón de SER): reutiliza lo que Hoy ya leyó, pide solo al volver al
 * frente tras ≥ 15 min o después de cumplir un hábito, una petición a la vez, y nada para quien no se mide.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AppState } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { avisarHabitoCumplido } from '../../../habits/eventos/habitoCumplido';
import type { ColorSemaforo } from '../../types/semaforo.types';
import { crearAlmacenDelSemaforoVigente, UMBRAL_DE_REFRESCO_MS } from '../semaforoVigente';
import { tieneSemaforoPropio, useMantenerSemaforoVigente } from '../useSemaforoVigente';

jest.mock('../../api/semaforoApi', () => ({ obtenerMiSemaforo: jest.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function almacenDePrueba(respuesta: () => Promise<ColorSemaforo | null>) {
  let ahora = 1_000_000;
  const leer = jest.fn(respuesta);
  const almacen = crearAlmacenDelSemaforoVigente(leer, () => ahora);
  return { almacen, leer, pasar: (ms: number) => { ahora += ms; } };
}

describe('crearAlmacenDelSemaforoVigente', () => {
  it('lo que publica Hoy no dispara ninguna petición', () => {
    const { almacen, leer } = almacenDePrueba(async () => 'VERDE');
    almacen.habilitar(true);
    almacen.publicar('ROJO');
    expect(almacen.color()).toBe('ROJO');
    expect(leer).not.toHaveBeenCalled();
  });

  it('al volver al frente pide solo si pasaron 15 minutos desde la última lectura', async () => {
    const { almacen, leer, pasar } = almacenDePrueba(async () => 'AMARILLO');
    almacen.habilitar(true);
    almacen.publicar('VERDE');
    pasar(UMBRAL_DE_REFRESCO_MS - 1);
    await almacen.alVolverAlFrente();
    expect(leer).not.toHaveBeenCalled();
    pasar(1);
    await almacen.alVolverAlFrente();
    expect(leer).toHaveBeenCalledTimes(1);
    expect(almacen.color()).toBe('AMARILLO');
  });

  it('después de cumplir un hábito vuelve a leer, una sola petición aunque lleguen dos avisos', async () => {
    let soltar!: (c: ColorSemaforo) => void;
    const { almacen, leer } = almacenDePrueba(() => new Promise(r => { soltar = r; }));
    almacen.habilitar(true);
    const a = almacen.trasCumplirUnHabito();
    const b = almacen.trasCumplirUnHabito();
    soltar('VERDE');
    await Promise.all([a, b]);
    expect(leer).toHaveBeenCalledTimes(1);
    expect(almacen.color()).toBe('VERDE');
  });

  it('si la lectura falla queda sin dato (el fénix sale neutral)', async () => {
    const { almacen } = almacenDePrueba(async () => { throw new Error('sin red'); });
    almacen.habilitar(true);
    almacen.publicar('VERDE');
    await almacen.trasCumplirUnHabito();
    expect(almacen.color()).toBeNull();
  });

  it('deshabilitado (quien no se mide) no pide nunca', async () => {
    const { almacen, leer } = almacenDePrueba(async () => 'VERDE');
    await almacen.alVolverAlFrente();
    await almacen.trasCumplirUnHabito();
    expect(leer).not.toHaveBeenCalled();
  });

  it('avisa a quien escucha solo cuando el color cambia', () => {
    const { almacen } = almacenDePrueba(async () => null);
    const aviso = jest.fn();
    const quitar = almacen.suscribir(aviso);
    almacen.publicar('ROJO');
    almacen.publicar('ROJO');
    expect(aviso).toHaveBeenCalledTimes(1);
    quitar();
  });
});

describe('useMantenerSemaforoVigente', () => {
  function montar(rol: string, almacen: ReturnType<typeof almacenDePrueba>['almacen']) {
    const oyentes: Array<(e: string) => void> = [];
    const espia = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: (e: string) => void) => {
      oyentes.push(fn);
      return { remove: jest.fn() };
    }) as never);
    function Prueba() {
      useMantenerSemaforoVigente(rol, 'u1', almacen);
      return null;
    }
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(React.createElement(Prueba));
    });
    return { oyentes, raiz, espia };
  }

  it('el aprendiz: refresca al volver al frente y tras cumplir un hábito', async () => {
    const { almacen, leer } = almacenDePrueba(async () => 'VERDE');
    const { oyentes, raiz, espia } = montar('TRAINEE', almacen);
    await act(async () => {
      oyentes.forEach(fn => fn('active'));
    });
    expect(leer).toHaveBeenCalledTimes(1);
    await act(async () => {
      avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 });
    });
    expect(leer).toHaveBeenCalledTimes(2);
    act(() => raiz.unmount());
    espia.mockRestore();
  });

  // E-576: el personal que hace su programa personal tiene semáforo; el almacén se mantiene igual que para el aprendiz.
  it.each(['ADMIN', 'ALCHEMIST', 'MENTOR', 'MENTOR_LEAD'])('%s: también refresca tras cumplir un hábito', async rol => {
    const { almacen, leer } = almacenDePrueba(async () => 'ROJO');
    const { raiz, espia } = montar(rol, almacen);
    await act(async () => {
      avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 });
    });
    expect(leer).toHaveBeenCalled();
    act(() => raiz.unmount());
    espia.mockRestore();
  });

  it('los roles con semáforo propio, en los dos idiomas', () => {
    expect(tieneSemaforoPropio('trainee')).toBe(true);
    expect(tieneSemaforoPropio('APRENDIZ')).toBe(true);
    expect(tieneSemaforoPropio(null)).toBe(false);
    expect(tieneSemaforoPropio('MENTOR')).toBe(false);
  });
});
