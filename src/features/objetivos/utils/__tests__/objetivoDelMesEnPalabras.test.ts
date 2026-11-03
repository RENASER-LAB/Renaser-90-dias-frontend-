import { describe, expect, it } from '@jest/globals';

import type { MesDelPlan, PlanMensualDelEje } from '../../api/planMensualApi';
import { MOTIVOS_SIN_CIFRA, cifraEscrita } from '../../api/planMensualApi';
import {
  TEXTO_DEL_MOTIVO,
  TEXTO_SIN_CIFRA,
  objetivoDelMesEnPalabras,
  textoDelBotonDelMes,
} from '../objetivoDelMesEnPalabras';

const mes = (parcial: Partial<MesDelPlan> = {}): MesDelPlan => ({
  numeroMes: 2,
  diaDeCierre: 60,
  enCurso: false,
  estado: 'CON_CIFRA',
  cifra: 79.5,
  paso: null,
  falta: null,
  sube: false,
  motivo: null,
  editado: false,
  titulo: null,
  ...parcial,
});

const plan = (parcial: Partial<PlanMensualDelEje> = {}, meses: MesDelPlan[] = [mes()]): PlanMensualDelEje => ({
  eje: 'CUERPO',
  mesActual: 1,
  unidad: 'kg',
  unidadAdelante: false,
  meses,
  semana: null,
  ...parcial,
});

describe('el objetivo de un mes en palabras', () => {
  it('con cifra propuesta: la escribe con su unidad, dice el día de cierre y que la propone el sistema', () => {
    const o = objetivoDelMesEnPalabras(mes(), plan());
    expect(o).toEqual({ tipo: 'cifra', cifra: '79.5 kg', tuyo: false, yaAlcanzado: false, diaDeCierre: 60, puedeCambiar: true });
    expect(textoDelBotonDelMes(o)).toBe('Cambiar');
  });

  it('con una cifra que escribió la persona: es suya', () => {
    expect(objetivoDelMesEnPalabras(mes({ editado: true }), plan())).toMatchObject({ tipo: 'cifra', tuyo: true });
  });

  it('la moneda va delante y la escala pegada', () => {
    // Los miles se separan con el espacio que ya usa `cifraEscrita` (no se repite acá a mano).
    expect(objetivoDelMesEnPalabras(mes({ cifra: 10000 }), plan({ unidad: 'S/', unidadAdelante: true }))).toMatchObject({
      cifra: cifraEscrita(10000, 'S/', true),
    });
    expect(cifraEscrita(10000, 'S/', true).startsWith('S/ 10')).toBe(true);
    expect(objetivoDelMesEnPalabras(mes({ cifra: 7 }), plan({ unidad: '/10' }))).toMatchObject({ cifra: '7/10' });
  });

  it('un mes ya alcanzado lo dice', () => {
    expect(objetivoDelMesEnPalabras(mes({ estado: 'YA_ALCANZADO' }), plan())).toMatchObject({ tipo: 'cifra', yaAlcanzado: true });
  });

  it('un objetivo solo con título (sin número) muestra el título', () => {
    const o = objetivoDelMesEnPalabras(mes({ estado: 'SOLO_TITULO', cifra: null, titulo: '  Recuperar el hábito de cocinar ', editado: true }), plan());
    expect(o).toEqual({ tipo: 'titulo', texto: 'Recuperar el hábito de cocinar', tuyo: true, diaDeCierre: 60, puedeCambiar: true });
  });

  it.each(MOTIVOS_SIN_CIFRA.map(m => [m]))('sin cifra por %s: una línea con el motivo y la opción de escribirla', motivo => {
    const o = objetivoDelMesEnPalabras(mes({ estado: 'SIN_CIFRA', cifra: null, motivo }), plan());
    expect(o).toEqual({ tipo: 'sin-cifra', texto: TEXTO_DEL_MOTIVO[motivo], diaDeCierre: 60, puedeCambiar: true });
    expect(textoDelBotonDelMes(o)).toBe('Escribir la cifra');
  });

  it('sin cifra y sin motivo: el texto general, sin inventar un número', () => {
    expect(objetivoDelMesEnPalabras(mes({ estado: 'SIN_CIFRA', cifra: null, motivo: null }), plan())).toMatchObject({
      tipo: 'sin-cifra',
      texto: TEXTO_SIN_CIFRA,
    });
  });

  it('todos los motivos tienen su texto, en español de tú', () => {
    for (const motivo of MOTIVOS_SIN_CIFRA) expect(TEXTO_DEL_MOTIVO[motivo].length).toBeGreaterThan(10);
    expect(Object.keys(TEXTO_DEL_MOTIVO).sort()).toEqual([...MOTIVOS_SIN_CIFRA].sort());
  });

  it('sin unidad en el eje no se ofrece escribir la cifra: media meta da 400 en el servidor', () => {
    const sinUnidad = objetivoDelMesEnPalabras(mes({ estado: 'SIN_CIFRA', cifra: null, motivo: 'SIN_TIPO' }), plan({ unidad: '  ' }));
    expect(sinUnidad).toMatchObject({ tipo: 'sin-cifra', puedeCambiar: false });
    expect(textoDelBotonDelMes(sinUnidad)).toBeNull();
  });

  it('sin el plan o sin ese mes todavía no hay nada que decir ni que cambiar', () => {
    expect(objetivoDelMesEnPalabras(undefined, plan())).toEqual({ tipo: 'sin-plan' });
    expect(objetivoDelMesEnPalabras(mes(), undefined)).toEqual({ tipo: 'sin-plan' });
    expect(textoDelBotonDelMes({ tipo: 'sin-plan' })).toBeNull();
  });
});
