import { describe, expect, it } from '@jest/globals';

import type { PuntoGps } from '../../types/carrera.types';
import { distanciaM, puntoDestino } from '../geo';
import {
  EDAD_MAXIMA_DE_LA_LECTURA_MS,
  LECTURAS_PARA_PROMEDIAR,
  lecturaBuena,
  lecturaFresca,
  PRECISION_BUENA_M,
  promedioDeLecturas,
  puntoDelMapa,
  radioDelCirculoM,
  RADIO_MAXIMO_DEL_CIRCULO_M,
  sumarLectura,
  VENTANA_DEL_PROMEDIO_MS,
} from '../lecturaDelMapa';
import { PRECISION_MAXIMA_M, VELOCIDAD_CAMINANDO_MS } from '../motorDeCarrera';
import { precisionDelPunto } from '../textosDeLaCarrera';

/**
 * #236 (spec 042, lectura buena, promedio quieto y círculo): «estoy en mi casa y me pone al frente o en otra casa». Bajo techo el GPS salta decenas de metros; el
 * mapa dibuja a la persona en el promedio de las últimas lecturas cuando está quieta y en la lectura real cuando se mueve.
 */

const CASA = { lat: -12.1219, lng: -77.0312 };
const T0 = 1_800_000_000_000;
const lectura = (dx: number, dy: number, precision: number | null, seg: number, extra: Partial<PuntoGps> = {}): PuntoGps => {
  const p = puntoDestino(puntoDestino(CASA, 90, dx), 0, dy);
  return { lat: p.lat, lng: p.lng, t: T0 + seg * 1000, precision, ...extra };
};
const sumar = (lecturas: PuntoGps[]): PuntoGps[] => lecturas.reduce<PuntoGps[]>((acc, l) => sumarLectura(acc, l), []);

describe('la lectura buena de antes de arrancar', () => {
  // spec 042 FR-053
  it('es buena con 15 m o menos de precisión; sin precisión, o con más, no', () => {
    expect(PRECISION_BUENA_M).toBe(15);
    expect(lecturaBuena(lectura(0, 0, 15, 0))).toBe(true);
    expect(lecturaBuena(lectura(0, 0, 9, 0))).toBe(true);
    expect(lecturaBuena(lectura(0, 0, 15.5, 0))).toBe(false);
    expect(lecturaBuena(lectura(0, 0, 40, 0))).toBe(false);
    expect(lecturaBuena(lectura(0, 0, null, 0))).toBe(false);
    expect(lecturaBuena(lectura(0, 0, 0, 0))).toBe(false);
  });

  // spec 042 FR-053
  it('una lectura de hace más de 5 s no es fresca (iPhone entrega primero la última guardada)', () => {
    const ahora = T0 + 60_000;
    expect(lecturaFresca({ ...lectura(0, 0, 10, 0), t: ahora - EDAD_MAXIMA_DE_LA_LECTURA_MS }, ahora)).toBe(true);
    expect(lecturaFresca({ ...lectura(0, 0, 10, 0), t: ahora - EDAD_MAXIMA_DE_LA_LECTURA_MS - 1 }, ahora)).toBe(false);
    expect(lecturaFresca({ ...lectura(0, 0, 10, 0), t: ahora - 600_000 }, ahora)).toBe(false);
  });

  // spec 042 FR-057
  it('el motor sigue aceptando hasta 20 m: lo de 15 m es solo para el mapa', () => {
    expect(PRECISION_MAXIMA_M).toBe(20);
    expect(PRECISION_BUENA_M).toBeLessThan(PRECISION_MAXIMA_M);
  });
});

describe('el promedio de la persona quieta', () => {
  // spec 042 FR-054
  it('pesa cada lectura por 1 / precisión²: la de 5 m pesa 16 veces más que la de 20 m', () => {
    const buena = lectura(0, 0, 5, 0);
    const mala = lectura(20, 0, 20, 1);
    const p = promedioDeLecturas([buena, mala])!;
    // 1/25 contra 1/400: el promedio queda a 20 × (1/400) / (1/25 + 1/400) = 20 / 17 ≈ 1,18 m de la buena.
    expect(distanciaM(p.pos, buena)).toBeCloseTo(20 / 17, 1);
    expect(p.precisionM).toBe(5);
  });

  // spec 042 FR-054
  it('con la persona quieta, el punto deja de saltar de casa en casa: el promedio queda cerca de la verdad', () => {
    // La verdad es CASA. El GPS bajo techo oscila ±15 m alrededor, con 15 a 25 m de precisión.
    const lecturas = [
      lectura(12, 3, 18, 0),
      lectura(-14, -5, 20, 1),
      lectura(6, 14, 16, 2),
      lectura(-9, -12, 22, 3),
      lectura(15, -4, 25, 4),
      lectura(-12, 9, 19, 5),
      lectura(3, -15, 17, 6),
      lectura(-4, 12, 21, 7),
    ];
    const acumuladas = sumar(lecturas);
    expect(acumuladas).toHaveLength(lecturas.length);
    const promedio = promedioDeLecturas(acumuladas)!;
    const peorLectura = Math.max(...lecturas.map(l => distanciaM(CASA, l)));
    expect(peorLectura).toBeGreaterThan(14);
    expect(distanciaM(CASA, promedio.pos)).toBeLessThan(5);
    // El punto dibujado con la última lectura sola habría estado a más de 10 m.
    expect(distanciaM(CASA, lecturas[lecturas.length - 1])).toBeGreaterThan(10);
  });

  // spec 042 FR-054
  it('desde 3 lecturas juntas el punto ya es un promedio', () => {
    expect(LECTURAS_PARA_PROMEDIAR).toBe(3);
    expect(sumar([lectura(0, 0, 10, 0), lectura(1, 1, 10, 1)])).toHaveLength(2);
    expect(sumar([lectura(0, 0, 10, 0), lectura(1, 1, 10, 1), lectura(2, 0, 10, 2)])).toHaveLength(LECTURAS_PARA_PROMEDIAR);
  });

  // spec 042 FR-054
  it('una lectura suelta de otra casa, dentro de su propio error, casi no mueve el punto', () => {
    const quieta = sumar([lectura(0, 0, 8, 0), lectura(1, 0, 8, 1), lectura(0, 1, 8, 2), lectura(1, 1, 8, 3)]);
    const antes = promedioDeLecturas(quieta)!.pos;
    // 40 m con 30 m de precisión: cabe en su error (40 < 25 + 30), no es que la persona se haya movido.
    const conLaRara = sumarLectura(quieta, lectura(40, 0, 30, 4));
    expect(conLaRara).toHaveLength(5);
    expect(distanciaM(antes, promedioDeLecturas(conLaRara)!.pos)).toBeLessThan(1);
  });

  // spec 042 FR-054
  it('al moverse, el punto sigue a la lectura real: una lectura precisa lejos reinicia el promedio', () => {
    const quieta = sumar([lectura(0, 0, 8, 0), lectura(1, 0, 8, 1), lectura(0, 1, 8, 2)]);
    const nueva = lectura(60, 0, 6, 3);
    const despues = sumarLectura(quieta, nueva);
    expect(despues).toEqual([nueva]);
    expect(distanciaM(promedioDeLecturas(despues)!.pos, nueva)).toBeLessThan(0.01);
  });

  // spec 042 FR-054
  it('al moverse con velocidad de caminata en dos lecturas seguidas, también reinicia (aunque la distancia sea corta)', () => {
    const v = VELOCIDAD_CAMINANDO_MS + 0.4;
    const quieta = sumar([lectura(0, 0, 8, 0, { velocidad: 0 }), lectura(0, 1, 8, 1, { velocidad: 0 }), lectura(1, 1, 8, 2, { velocidad: 0 })]);
    // Una sola lectura rápida entre quietas puede ser ruido: no reinicia.
    const unaSuelta = sumarLectura(quieta, lectura(2, 2, 8, 3, { velocidad: v }));
    expect(unaSuelta).toHaveLength(4);
    // Dos seguidas ya es caminar.
    const dosSeguidas = sumarLectura(unaSuelta, lectura(3, 3, 8, 4, { velocidad: v }));
    expect(dosSeguidas).toHaveLength(1);
    expect(dosSeguidas[0].t).toBe(T0 + 4000);
  });

  // spec 042 FR-054
  it('solo entran las lecturas de los últimos 15 s', () => {
    expect(VENTANA_DEL_PROMEDIO_MS).toBe(15_000);
    const lecturas = sumar([lectura(0, 0, 10, 0), lectura(1, 0, 10, 5), lectura(0, 1, 10, 10), lectura(1, 1, 10, 20)]);
    // A los 20 s, la de 0 s ya salió (20 − 0 > 15); la de 5 s sigue (15 justos).
    expect(lecturas.map(l => l.t - T0)).toEqual([5000, 10_000, 20_000]);
  });

  // spec 042 FR-054
  it('la precisión que se muestra es la mejor de las lecturas, no la del cálculo estadístico', () => {
    const p = promedioDeLecturas(sumar([lectura(0, 0, 12, 0), lectura(1, 0, 18, 1), lectura(0, 1, 25, 2)]))!;
    expect(p.precisionM).toBe(12);
    expect(promedioDeLecturas([lectura(0, 0, null, 0)])!.precisionM).toBeNull();
  });
});

describe('el punto donde se dibuja a la persona', () => {
  const motor = { lat: CASA.lat + 0.0002, lng: CASA.lng };
  const promedio = { lat: CASA.lat, lng: CASA.lng };

  // spec 042 FR-054
  it('sin punto del motor, el centro de vista; con él, el del motor mientras la persona se mueve', () => {
    expect(puntoDelMapa({ posicion: null, centroDeVista: promedio, precisionM: 12, promediado: false, quieta: true }).centro).toBe(promedio);
    expect(puntoDelMapa({ posicion: motor, centroDeVista: promedio, precisionM: 12, promediado: true, quieta: false }).centro).toBe(motor);
    expect(puntoDelMapa({ posicion: motor, centroDeVista: null, precisionM: null, promediado: false, quieta: true }).centro).toBe(motor);
    expect(puntoDelMapa({ posicion: null, centroDeVista: null, precisionM: null, promediado: false, quieta: true }).centro).toBeNull();
  });

  // spec 042 FR-054
  it('quieta y con varias lecturas promediadas, el promedio gana sobre el primer punto suelto del motor', () => {
    const e = { posicion: motor, centroDeVista: promedio, precisionM: 12, promediado: true, quieta: true };
    expect(puntoDelMapa(e).centro).toBe(promedio);
    // Quieta pero con una sola lectura (todavía no hay promedio): el del motor.
    expect(puntoDelMapa({ ...e, promediado: false }).centro).toBe(motor);
  });
});

describe('el círculo de precisión', () => {
  // spec 042 FR-055
  it('su radio es la precisión en metros, con un mínimo de 1 m y un tope para que no tape el mapa', () => {
    expect(radioDelCirculoM(18)).toBe(18);
    expect(radioDelCirculoM(0.2)).toBe(1);
    expect(radioDelCirculoM(500)).toBe(RADIO_MAXIMO_DEL_CIRCULO_M);
  });

  // spec 042 FR-055
  it('la precisión se dice en palabras para el lector de pantalla, en metros enteros', () => {
    expect(precisionDelPunto(18.4)).toEqual({ visible: 'Precisión de 18 m', accesible: 'Precisión de 18 metros' });
    expect(precisionDelPunto(1).accesible).toBe('Precisión de 1 metro');
    expect(precisionDelPunto(0.3).accesible).toBe('Precisión de 1 metro');
  });
});
