/** Los km de un día en las fichas del acompañamiento (spec 037, D-310): quién los midió, la fuente y «Por revisar». */
import { describe, expect, it } from '@jest/globals';

import { dichoDeLaMedicion, medicionDeLaFichaDe, textosDeLaMedicion } from '../medicionDeLaFicha';

const NBSP = ' ';

const automatica = {
  valor: 5.9,
  origen: 'HEALTH_CONNECT',
  pasos: 7840,
  fuente: 'Galaxy Watch',
  dispositivo: 'RELOJ',
  leidaEn: '2026-11-04T22:10:00Z',
  porRevisar: false,
};

describe('medicionDeLaFichaDe', () => {
  it('lee lo que manda el servidor', () => {
    expect(medicionDeLaFichaDe(automatica)).toEqual(automatica);
  });

  it('una captura solo trae el número y el origen', () => {
    expect(medicionDeLaFichaDe({ valor: 3, origen: 'MANUAL' })).toEqual({
      valor: 3,
      origen: 'MANUAL',
      pasos: null,
      fuente: null,
      dispositivo: null,
      leidaEn: null,
      porRevisar: false,
    });
  });

  it('un valor roto o ausente no dibuja nada y no rompe la ficha', () => {
    expect(medicionDeLaFichaDe(null)).toBeNull();
    expect(medicionDeLaFichaDe(undefined)).toBeNull();
    expect(medicionDeLaFichaDe({ valor: 'cinco', origen: 'MANUAL' })).toBeNull();
    expect(medicionDeLaFichaDe('x')).toBeNull();
  });
});

describe('textosDeLaMedicion', () => {
  it('el reloj: km, quién, pasos y distancia, fuente y hora de lectura (maqueta 4.1)', () => {
    const t = textosDeLaMedicion(medicionDeLaFichaDe(automatica)!);
    expect(t.principal).toBe(`5,9${NBSP}km · Medido por el reloj`);
    expect(t.detalle).toBe(`Pasos 7${NBSP}840 · Distancia 5,9${NBSP}km`);
    expect(t.fuente).toMatch(/^Galaxy Watch · leído a las \d{2}:\d{2}$/);
    expect(t.porRevisar).toBe(false);
  });

  it('el teléfono y «una app» cuando no se sabe', () => {
    expect(textosDeLaMedicion(medicionDeLaFichaDe({ ...automatica, dispositivo: 'TELEFONO' })!).principal).toContain('Medido por el teléfono');
    expect(textosDeLaMedicion(medicionDeLaFichaDe({ ...automatica, dispositivo: 'OTRO' })!).principal).toContain('Medido por una app');
  });

  it('la captura dice «Captura de la persona» y nada más', () => {
    const t = textosDeLaMedicion(medicionDeLaFichaDe({ valor: 3, origen: 'MANUAL' })!);
    expect(t.principal).toBe(`3${NBSP}km · Captura de la persona`);
    expect(t.detalle).toBeNull();
    expect(t.fuente).toBeNull();
  });

  it('un reloj que da solo la distancia no inventa los pasos', () => {
    expect(textosDeLaMedicion(medicionDeLaFichaDe({ ...automatica, pasos: null })!).detalle).toBe(`Distancia 5,9${NBSP}km`);
  });

  it('lo dudoso queda marcado «Por revisar», también para el lector de pantalla', () => {
    const dudosa = medicionDeLaFichaDe({ ...automatica, valor: 12.4, porRevisar: true })!;
    expect(textosDeLaMedicion(dudosa).porRevisar).toBe(true);
    expect(dichoDeLaMedicion(dudosa)).toContain('Por revisar');
    expect(dichoDeLaMedicion(medicionDeLaFichaDe(automatica)!)).not.toContain('Por revisar');
  });
});
