import { describe, expect, it } from '@jest/globals';
import type { PuntoGps } from '../../types/carrera.types';
import { puntoDestino } from '../geo';
import { alPunto, crearCarrera, seguir } from '../motorDeCarrera';

const ORIGEN = { lat: -12.0464, lng: -77.0428 };
const T0 = Date.UTC(2026, 10, 7, 11, 0, 0);

function nueva() {
  return crearCarrera({ carreraId: 'c-1', cuentaId: 'cuenta', ahora: T0, pesoKg: 70, conPasos: false, pausaAutomatica: true });
}

function ruta(segundos: number, ms: number, desde = ORIGEN, t0 = T0 + 1000): PuntoGps[] {
  return Array.from({ length: segundos }, (_, i) => ({ ...puntoDestino(desde, 90, ms * i), t: t0 + i * 1000, precision: 5, velocidad: ms }));
}

const aplicar = (e: ReturnType<typeof nueva>, ps: PuntoGps[]) => ps.reduce((s, p) => alPunto(s, p).estado, e);

describe('un salto del GPS no bloquea los puntos siguientes', () => {
  // spec 042 FR-030
  it('un primer fix viejo y lejano seguido de una ruta coherente a 3 m/s termina sumando distancia y sale de la pausa automática', () => {
    const lejano: PuntoGps = { ...puntoDestino(ORIGEN, 0, 5_000), t: T0, precision: 5, velocidad: 0 };
    let e = alPunto(nueva(), lejano).estado;
    const camino = ruta(60, 3);
    e = aplicar(e, camino);
    // La ruta real son ~177 m; el salto de 5 km no entra.
    expect(e.distanciaM).toBeGreaterThan(120);
    expect(e.distanciaM).toBeLessThan(180);
    expect(e.pausaAutomatica).toBe(false);
    expect(e.fase).toBe('corriendo');
  });

  // spec 042 FR-030
  it('un valor atípico aislado se descarta, no mueve el ancla y no suma distancia', () => {
    let e = aplicar(nueva(), ruta(20, 3));
    const antes = e.distanciaM;
    const ancla = e.ultimoCrudo!;
    const raro: PuntoGps = { ...puntoDestino(ancla, 0, 800), t: ancla.t + 1000, precision: 5, velocidad: 3 };
    const r = alPunto(e, raro);
    expect(r.descartado).toBe('salto');
    expect(r.estado.ultimoCrudo).toBe(ancla);
    // El siguiente punto normal sigue midiéndose contra el ancla y se acepta.
    const siguiente: PuntoGps = { ...puntoDestino(ancla, 90, 3), t: ancla.t + 2000, precision: 5, velocidad: 3 };
    e = alPunto(r.estado, siguiente).estado;
    expect(e.ultimoCrudo).toBe(siguiente);
    expect(e.distanciaM - antes).toBeLessThan(10);
  });

  // spec 042 FR-030
  it('un salto durante la pausa automática reancla y la carrera sigue al moverse, sin sumar el salto', () => {
    let e = aplicar(nueva(), ruta(15, 3));
    // Quieta 15 s hasta que entra la pausa automática.
    const fin = e.ultimoCrudo!;
    const quieta = Array.from({ length: 15 }, (_, i): PuntoGps => ({ lat: fin.lat, lng: fin.lng, t: fin.t + (i + 1) * 1000, precision: 5, velocidad: 0 }));
    e = aplicar(e, quieta);
    expect(e.pausaAutomatica).toBe(true);
    const distancia = e.distanciaM;
    // El teléfono reaparece 600 m más allá y se mueve a 3 m/s.
    const t0 = quieta[quieta.length - 1].t + 1000;
    const lejos = puntoDestino(fin, 90, 600);
    e = aplicar(e, ruta(20, 3, lejos, t0));
    expect(e.pausaAutomatica).toBe(false);
    expect(e.fase).toBe('corriendo');
    expect(e.distanciaM).toBeGreaterThan(distancia);
    expect(e.distanciaM - distancia).toBeLessThan(80);
  });

  // spec 042 FR-030
  it('un estado guardado sin los campos nuevos sigue funcionando', () => {
    const guardado = JSON.parse(JSON.stringify(nueva()));
    expect(guardado.saltoCandidato).toBeUndefined();
    const e = aplicar(guardado, ruta(10, 3));
    expect(e.distanciaM).toBeGreaterThan(20);
    const s = seguir(e, e.ultimoLatidoMs + 1000);
    expect(s.ultimoCrudo).toBeNull();
  });
});
