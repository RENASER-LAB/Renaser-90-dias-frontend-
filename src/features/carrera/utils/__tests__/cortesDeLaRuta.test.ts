/**
 * Spec 042 (2026-11-07): tras volver a la app durante una carrera el mapa unía con una recta (a través de las casas) el último punto
 * antes del corte con el primero después. El motor ahora marca `corte` en el primer punto de cada segmento nuevo.
 */
import { describe, expect, it } from '@jest/globals';
import type { PuntoGps } from '../../types/carrera.types';
import { puntoDestino } from '../geo';
import { alPunto, crearCarrera, HUECO_LARGO_MS, HUECO_MINIMO_MS, pausar, seguir } from '../motorDeCarrera';

const ORIGEN = { lat: -12.0464, lng: -77.0428 };
const T0 = Date.UTC(2026, 10, 7, 11, 0, 0);

const nueva = () => crearCarrera({ carreraId: 'c-1', cuentaId: 'cuenta', ahora: T0, pesoKg: 70, conPasos: false, pausaAutomatica: false });
const tramo = (n: number, desdeM: number, t0: number): PuntoGps[] =>
  Array.from({ length: n }, (_, i) => ({ ...puntoDestino(ORIGEN, 90, desdeM + 3 * i), t: t0 + i * 1000, precision: 5, velocidad: 3 }));
const aplicar = (e: ReturnType<typeof nueva>, ps: PuntoGps[]) => ps.reduce((s, p) => alPunto(s, p).estado, e);
const cortes = (e: ReturnType<typeof nueva>) => e.ruta.map(p => p.corte ?? null).filter(c => c != null);

describe('el motor marca dónde empieza un segmento nuevo de la ruta', () => {
  // spec 042 FR-037
  it('una carrera continua no tiene cortes', () => {
    expect(cortes(aplicar(nueva(), tramo(30, 0, T0 + 1000)))).toEqual([]);
  });

  // spec 042 FR-037
  it("tras pausar y seguir, el primer punto nuevo lleva corte 'pausa'", () => {
    let e = aplicar(nueva(), tramo(20, 0, T0 + 1000));
    e = seguir(pausar(e, T0 + 25_000), T0 + 60_000);
    e = aplicar(e, tramo(10, 300, T0 + 61_000));
    expect(cortes(e)).toEqual(['pausa']);
  });

  // spec 042 FR-037
  it("tras un hueco largo sin GPS, el primer punto nuevo lleva corte 'pausa'", () => {
    let e = aplicar(nueva(), tramo(20, 0, T0 + 1000));
    e = aplicar(e, tramo(10, 150, T0 + 21_000 + HUECO_LARGO_MS + 5_000));
    expect(cortes(e)).toEqual(['pausa']);
  });

  // spec 042 FR-037
  it("tras un hueco corto (distancia estimada), el primer punto nuevo lleva corte 'hueco'", () => {
    let e = aplicar(nueva(), tramo(20, 0, T0 + 1000));
    e = aplicar(e, tramo(10, 90, T0 + 21_000 + HUECO_MINIMO_MS + 2_000));
    expect(cortes(e)).toEqual(['hueco']);
  });

  // spec 042 FR-030, FR-037
  it("tras reanclar por un salto del GPS, el primer punto del ancla nueva lleva corte 'pausa'", () => {
    let e = aplicar(nueva(), tramo(15, 0, T0 + 1000));
    const lejos = puntoDestino(ORIGEN, 0, 5_000);
    const t1 = T0 + 20_000;
    const sal: PuntoGps[] = Array.from({ length: 5 }, (_, i) => ({ ...puntoDestino(lejos, 90, 3 * i), t: t1 + i * 1000, precision: 5, velocidad: 3 }));
    e = aplicar(e, sal);
    expect(cortes(e)).toContain('pausa');
  });

  // spec 042 FR-037
  it('un estado guardado antes (sin `corte`) se lee como un solo segmento', () => {
    const e = aplicar(nueva(), tramo(20, 0, T0 + 1000));
    expect(e.ruta.every(p => p.corte === undefined)).toBe(true);
  });
});
