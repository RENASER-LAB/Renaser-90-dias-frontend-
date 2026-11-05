import { describe, expect, it } from '@jest/globals';
import type { PuntoGps } from '../../types/carrera.types';
import { distanciaM, puntoDestino } from '../geo';
import {
  activoMs,
  alLatido,
  alPasos,
  alPunto,
  crearCarrera,
  esMuyCorta,
  indiceDelMejorKm,
  pausar,
  retomarTrasReabrir,
  ritmoActualSegPorKm,
  seguir,
  tramosDe,
} from '../motorDeCarrera';

const ORIGEN = { lat: -12.0464, lng: -77.0428 };
const T0 = Date.UTC(2026, 10, 5, 11, 0, 0);

function nueva(conPasos = false, pausaAutomatica = true) {
  return crearCarrera({ carreraId: 'c-1', cuentaId: 'cuenta', ahora: T0, pesoKg: 70, conPasos, pausaAutomatica });
}

/** Una caminata en línea recta hacia el este: `segundos` puntos, uno por segundo, a `ms` m/s. */
function caminata(segundos: number, ms: number, desde = ORIGEN, t0 = T0 + 1000, precision = 5): PuntoGps[] {
  return Array.from({ length: segundos }, (_, i) => {
    const p = puntoDestino(desde, 90, ms * i);
    return { ...p, t: t0 + i * 1000, precision, velocidad: ms };
  });
}

function aplicar(e: ReturnType<typeof nueva>, puntos: PuntoGps[]) {
  return puntos.reduce((s, p) => alPunto(s, p).estado, e);
}

describe('motor de la carrera: distancia con el GPS filtrado', () => {
  // spec 042 FR-030
  it('suma la distancia haversine entre los puntos aceptados (≈ 300 m en 100 s a 3 m/s)', () => {
    const e = aplicar(nueva(), caminata(101, 3));
    expect(e.distanciaM).toBeGreaterThan(285);
    expect(e.distanciaM).toBeLessThan(305);
  });

  // spec 042 FR-030
  it('descarta los puntos con precisión peor que 20 m', () => {
    const e = nueva();
    const r = alPunto(e, { ...ORIGEN, t: T0 + 1000, precision: 35 });
    expect(r.descartado).toBe('precision');
    expect(r.estado.ruta).toHaveLength(0);
  });

  // spec 042 FR-030
  it('descarta un salto que implicaría más de 25 km/h desde el último punto aceptado', () => {
    const e = aplicar(nueva(), caminata(20, 3));
    const ultimo = e.ultimoCrudo!;
    const lejos = puntoDestino(ultimo, 90, 200); // 200 m en 1 s
    const r = alPunto(e, { ...lejos, t: ultimo.t + 1000, precision: 5 });
    expect(r.descartado).toBe('salto');
    expect(r.estado.distanciaM).toBe(e.distanciaM);
  });

  // spec 042 FR-033, SC-006
  it('parado 60 s con el GPS que oscila ±10 m y sin pasos, la distancia no sube más de 5 m', () => {
    let e = nueva(true);
    for (let i = 0; i < 60; i++) {
      const rumbo = (i * 137) % 360;
      const p = puntoDestino(ORIGEN, rumbo, 10 * Math.sin(i));
      e = alPunto(e, { ...p, t: T0 + 1000 + i * 1000, precision: 8, velocidad: 0 }).estado;
    }
    expect(e.distanciaM).toBeLessThanOrEqual(5);
  });

  // spec 042 FR-036
  it('sin sensor de pasos, igual cuenta lo que se camina con el GPS', () => {
    const e = aplicar(nueva(false), caminata(61, 1.4));
    expect(e.distanciaM).toBeGreaterThan(70);
  });
});

describe('los km oficiales son los del GPS', () => {
  // spec 042 FR-034
  it('los pasos solos (sin GPS que se mueva) no suman distancia: solo mueven al avatar', () => {
    let e = aplicar(nueva(true), caminata(5, 0));
    const antes = e.distanciaM;
    const ultimo = e.ultimoCrudo!;
    for (let i = 1; i <= 5; i++) {
      e = alPasos(e, 2, ultimo.t + i * 1000);
      e = alPunto(e, { ...ultimo, t: ultimo.t + i * 1000, precision: 5, velocidad: 0 }).estado;
    }
    expect(e.pasos).toBe(10);
    expect(e.distanciaM).toBe(antes);
  });
});

describe('motor de la carrera: huecos sin señal', () => {
  // spec 042 FR-035
  it('un hueco de menos de 60 s con pasos rellena con pasos × zancada y lo anota como metros sin GPS', () => {
    let e = aplicar(nueva(true), caminata(31, 1.4));
    const antes = e.distanciaM;
    const ultimo = e.ultimoCrudo!;
    // 30 s sin GPS y 60 pasos; la persona aparece 20 m más allá (el GPS se cortó y midió una recta corta).
    e = alPasos(e, 60, ultimo.t + 15_000);
    const despues = puntoDestino(ultimo, 90, 20);
    e = alPunto(e, { ...despues, t: ultimo.t + 30_000, precision: 5 }).estado;
    expect(e.distanciaM - antes).toBeGreaterThanOrEqual(44);
    expect(e.metrosSinGps).toBeGreaterThan(20);
  });

  // spec 042 FR-035
  it('un hueco de 60 s o más no suma', () => {
    let e = aplicar(nueva(true), caminata(31, 1.4));
    const antes = e.distanciaM;
    const ultimo = e.ultimoCrudo!;
    e = alPasos(e, 100, ultimo.t + 30_000);
    const despues = puntoDestino(ultimo, 90, 90);
    e = alPunto(e, { ...despues, t: ultimo.t + 70_000, precision: 5 }).estado;
    expect(e.distanciaM).toBe(antes);
  });
});

describe('motor de la carrera: tiempo, pausas y retomar', () => {
  // spec 042 FR-012
  it('en pausa el tiempo activo se detiene y no se suman metros', () => {
    let e = aplicar(nueva(), caminata(31, 3));
    e = pausar(e, T0 + 31_000);
    const tiempo = activoMs(e, T0 + 31_000);
    const metros = e.distanciaM;
    e = aplicar(e, caminata(30, 3, puntoDestino(ORIGEN, 90, 100), T0 + 32_000));
    expect(activoMs(e, T0 + 62_000)).toBe(tiempo);
    expect(e.distanciaM).toBe(metros);
  });

  // spec 042 FR-012
  it('al seguir no se suma lo caminado durante la pausa', () => {
    let e = aplicar(nueva(), caminata(31, 3));
    e = pausar(e, T0 + 31_000);
    const metros = e.distanciaM;
    e = seguir(e, T0 + 100_000);
    const lejos = puntoDestino(ORIGEN, 90, 500);
    e = aplicar(e, caminata(11, 3, lejos, T0 + 100_000));
    expect(e.distanciaM - metros).toBeLessThan(35);
  });

  // spec 042 FR-010
  it('la pausa automática pausa tras 10 s quieto y sigue sola al dar pasos', () => {
    let e = aplicar(nueva(true), caminata(20, 3));
    const fin = e.ultimoCrudo!;
    for (let i = 1; i <= 25; i++) e = alPunto(e, { ...fin, t: fin.t + i * 1000, precision: 5, velocidad: 0 }).estado;
    e = alLatido(e, fin.t + 26_000);
    expect(e.fase).toBe('pausa');
    expect(e.pausaAutomatica).toBe(true);
    e = alPasos(e, 2, fin.t + 30_000);
    expect(e.fase).toBe('corriendo');
  });

  // spec 042 FR-006, SC-003
  it('al reabrir tras morir la app, el tiempo sin latidos no cuenta y la carrera queda en pausa con su distancia', () => {
    let e = aplicar(nueva(), caminata(61, 3));
    const distancia = e.distanciaM;
    const ultimoLatido = e.ultimoLatidoMs;
    const { estado, estuvoMuerta } = retomarTrasReabrir(e, ultimoLatido + 10 * 60_000);
    expect(estuvoMuerta).toBe(true);
    expect(estado.fase).toBe('pausa');
    expect(estado.distanciaM).toBe(distancia);
    expect(activoMs(estado, ultimoLatido + 10 * 60_000)).toBeLessThanOrEqual(ultimoLatido - T0);
  });

  it('al reabrir enseguida (el servicio siguió vivo) no cambia nada', () => {
    const e = aplicar(nueva(), caminata(11, 3));
    expect(retomarTrasReabrir(e, e.ultimoLatidoMs + 3000).estuvoMuerta).toBe(false);
  });
});

describe('motor de la carrera: tramos, ritmo y calorías', () => {
  // spec 042 FR-009
  it('un tramo por km completo y el último parcial; el mejor km es el más rápido', () => {
    let e = aplicar(nueva(), caminata(400, 3)); // ~1,2 km a 3 m/s
    e = aplicar(e, caminata(200, 4, e.ultimoCrudo!, e.ultimoCrudo!.t + 1000)); // más rápido
    const tramos = tramosDe(e, e.ultimoCrudo!.t);
    expect(tramos[0]).toMatchObject({ km: 1, parcial: false });
    expect(tramos[tramos.length - 1].parcial).toBe(true);
    expect(indiceDelMejorKm(tramos)).not.toBeNull();
  });

  // spec 042 FR-008
  it('el ritmo actual sale de los últimos 30 s', () => {
    const e = aplicar(nueva(), caminata(61, 3));
    const ritmo = ritmoActualSegPorKm(e, e.ultimoCrudo!.t)!;
    expect(ritmo).toBeGreaterThan(300);
    expect(ritmo).toBeLessThan(370); // 3 m/s = 5:33 min/km
  });

  // spec 042 FR-015
  it('las calorías crecen con el tiempo activo y el peso', () => {
    const e = aplicar(nueva(), caminata(301, 3));
    expect(e.caloriasKcal).toBeGreaterThan(20);
    expect(e.caloriasKcal).toBeLessThan(80);
  });

  it('una carrera de menos de 100 m o de menos de 1 minuto es muy corta (no se envía)', () => {
    const e = aplicar(nueva(), caminata(30, 3));
    expect(esMuyCorta(e, e.ultimoCrudo!.t)).toBe(true);
    const larga = aplicar(nueva(), caminata(70, 3));
    expect(esMuyCorta(larga, larga.ultimoCrudo!.t)).toBe(false);
  });

  it('la distancia del motor coincide con la geometría (control)', () => {
    expect(distanciaM(ORIGEN, puntoDestino(ORIGEN, 90, 1000))).toBeCloseTo(1000, 0);
  });
});
