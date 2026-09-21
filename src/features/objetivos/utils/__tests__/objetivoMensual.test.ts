import { describe, expect, it } from '@jest/globals';

import type { EntradaDelMes, FormatoCifra, ObjetivoMensual } from '../objetivoMensual';
import {
  cifraDelMes,
  diaDeCierre,
  etiquetaDelMesDelObjetivo,
  mesDelObjetivo,
  notaDelMes,
  objetivoDelMes,
} from '../objetivoMensual';

/** Lo mínimo para no repetir los campos que no importan en cada caso. */
function entrada(parcial: Partial<EntradaDelMes>): EntradaDelMes {
  return { lineaBase: null, valorActual: null, meta: null, mes: 1, magnitud: 'nivel', ...parcial };
}

const KG: FormatoCifra = { unidad: 'kg' };
const SOLES: FormatoCifra = { unidad: 'S/', unidadAdelante: true };

/** El tope del peso, tal como lo arma el Mapa: 4 % del peso de hoy. */
function topeDePeso(pesoDeHoy: number): number {
  return 0.04 * pesoDeHoy;
}

/** Un resultado de cada estado y de cada motivo: las pruebas de texto los recorren todos. */
function todosLosEstados(): ObjetivoMensual[] {
  return [
    objetivoDelMes(entrada({ lineaBase: 82, meta: 75, mes: 1 })),
    objetivoDelMes(entrada({ lineaBase: 82, valorActual: 70, meta: 75, mes: 1 })),
    objetivoDelMes(entrada({ lineaBase: 82, meta: 82, mes: 1 })),
    objetivoDelMes(entrada({ lineaBase: null, meta: 75, mes: 1 })),
    objetivoDelMes(entrada({ lineaBase: 82, meta: 75, magnitud: null })),
    objetivoDelMes(entrada({ lineaBase: 5, meta: 8, magnitud: 'escala' })),
    objetivoDelMes(entrada({ lineaBase: 140, meta: 120, magnitud: 'clinico' })),
    objetivoDelMes(entrada({ lineaBase: 5000, valorActual: 3000, meta: 15000, mes: 3 })),
    objetivoDelMes(entrada({ lineaBase: 82, valorActual: 95, meta: 75, mes: 3, topePorMes: topeDePeso(95) })),
  ];
}

describe('objetivoDelMes · el caso del dueño: 82 → 75 kg en 90 días', () => {
  it('el mes 1 reparte en tres y da los 2,33 kg', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 82, meta: 75, mes: 1, topePorMes: topeDePeso(82) }));
    expect(r.estado).toBe('con_cifra');
    if (r.estado !== 'con_cifra') return;
    expect(r.paso).toBeCloseTo(2.33, 2);
    expect(r.valor).toBeCloseTo(79.67, 2);
    expect(r.falta).toBe(7);
    expect(r.direccion).toBe('baja');
    expect(r.mesesQueQuedan).toBe(3);
    expect(cifraDelMes(r, KG)).toBe('79.7 kg');
    expect(notaDelMes(r, KG)).toBe('Te faltan 7 kg y te quedan 3 meses: 2.33 kg este mes.');
  });

  it('si el mes 1 solo bajó 1 kg, el mes 2 pide lo que falta — no el tercio prometido', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 82, valorActual: 81, meta: 75, mes: 2, topePorMes: topeDePeso(81) }));
    expect(r.estado).toBe('con_cifra');
    if (r.estado !== 'con_cifra') return;
    // Los tercios del primer día habrían pedido 77,33. Lo que falta (6 kg) en los 2 meses que
    // quedan son 3 kg, y eso es lo honesto: lo que no se hizo no desaparece, se redistribuye.
    expect(r.valor).toBe(78);
    expect(r.paso).toBe(3);
    expect(r.mesesQueQuedan).toBe(2);
  });

  it('el último mes pide lo que quede, si es alcanzable', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 82, valorActual: 76, meta: 75, mes: 3, topePorMes: topeDePeso(76) }));
    expect(r.estado).toBe('con_cifra');
    if (r.estado !== 'con_cifra') return;
    expect(r.valor).toBe(75);
    expect(r.paso).toBe(1);
    expect(r.mesesQueQuedan).toBe(1);
  });

  it('sin medición todavía, el valor real es la línea base', () => {
    const conMedicion = objetivoDelMes(entrada({ lineaBase: 82, valorActual: 82, meta: 75, mes: 1 }));
    const sinMedicion = objetivoDelMes(entrada({ lineaBase: 82, valorActual: null, meta: 75, mes: 1 }));
    expect(sinMedicion).toEqual(conMedicion);
  });
});

describe('objetivoDelMes · metas que suben', () => {
  it('reparte igual hacia arriba', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 5000, meta: 15000, mes: 1 }));
    expect(r.estado).toBe('con_cifra');
    if (r.estado !== 'con_cifra') return;
    expect(r.direccion).toBe('sube');
    expect(r.valor).toBeCloseTo(8333.33, 2);
    expect(r.paso).toBeCloseTo(3333.33, 2);
    expect(cifraDelMes(r, SOLES)).toBe('S/ 8\u00a0333');
  });

  it('una meta acumulada muestra el tramo del mes, no el total corrido', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 0, valorActual: 2000, meta: 9000, mes: 2, magnitud: 'acumulado' }));
    expect(r.estado).toBe('con_cifra');
    if (r.estado !== 'con_cifra') return;
    expect(r.lectura).toBe('acumulado');
    expect(r.paso).toBe(3500);
    // El nivel se calcula igual, por si la pantalla quiere mostrar el total corrido.
    expect(r.valor).toBe(5500);
    expect(cifraDelMes(r, SOLES)).toBe('S/ 3\u00a0500');
    expect(notaDelMes(r, SOLES)).toBe('Te faltan S/ 7\u00a0000 y te quedan 2 meses: S/ 3\u00a0500 este mes.');
  });
});

describe('objetivoDelMes · bordes', () => {
  it('ya alcanzado: llegar antes no pide otro tramo, pide sostener', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 82, valorActual: 74, meta: 75, mes: 2 }));
    expect(r).toEqual({ estado: 'ya_alcanzado', mes: 2, mesesQueQuedan: 2, direccion: 'baja', valor: 75 });
    expect(cifraDelMes(r, KG)).toBe('75 kg');
    expect(notaDelMes(r, KG)).toBe('Ya llegaste a tu meta del Día 90. Este mes se trata de sostener 75 kg.');
  });

  it('clavar la meta exacta también es haber llegado', () => {
    expect(objetivoDelMes(entrada({ lineaBase: 5000, valorActual: 15000, meta: 15000, mes: 1 })).estado)
      .toBe('ya_alcanzado');
  });

  it('va al revés: se pide más, mientras el ritmo siga siendo real', () => {
    // Medidas: nadie impone un tope físico, así que manda el tope relativo (3× el plan).
    const r = objetivoDelMes(entrada({ lineaBase: 90, valorActual: 92, meta: 83, mes: 2 }));
    expect(r.estado).toBe('con_cifra');
    if (r.estado !== 'con_cifra') return;
    expect(r.falta).toBe(9);
    expect(r.paso).toBe(4.5);
    expect(r.valor).toBe(87.5);
  });

  it('línea base igual a la meta: no hay recorrido que repartir', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 75, meta: 75, mes: 1 }));
    expect(r).toEqual({ estado: 'sin_cifra', mes: 1, mesesQueQuedan: 3, motivo: 'sin_recorrido' });
  });

  it('sin línea base o sin meta no se inventa nada', () => {
    expect(objetivoDelMes(entrada({ lineaBase: null, meta: 75 })).estado).toBe('sin_cifra');
    expect(objetivoDelMes(entrada({ lineaBase: 82, meta: null })).estado).toBe('sin_cifra');
    const r = objetivoDelMes(entrada({ lineaBase: 82, meta: null }));
    if (r.estado === 'sin_cifra') expect(r.motivo).toBe('sin_datos');
  });

  it('un número que no es número se trata como ausente', () => {
    const r = objetivoDelMes(entrada({ lineaBase: Number.NaN, meta: 75 }));
    if (r.estado === 'sin_cifra') expect(r.motivo).toBe('sin_datos');
    const conActualRoto = objetivoDelMes(entrada({ lineaBase: 82, valorActual: Number.NaN, meta: 75, mes: 1 }));
    expect(conActualRoto.estado).toBe('con_cifra');
  });

  it('todavía sin elegir qué se mide: sin_tipo, que no es lo mismo que faltar números', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 82, meta: 75, magnitud: null }));
    if (r.estado !== 'sin_cifra') throw new Error('debía quedarse sin cifra');
    expect(r.motivo).toBe('sin_tipo');
  });

  it('el mes se acota: 0 es el 1, 7 es el 3 y un mes que no es número es el 1', () => {
    expect(objetivoDelMes(entrada({ lineaBase: 82, meta: 75, mes: 0 })).mes).toBe(1);
    expect(objetivoDelMes(entrada({ lineaBase: 82, meta: 75, mes: 7 })).mes).toBe(3);
    expect(objetivoDelMes(entrada({ lineaBase: 82, meta: 75, mes: Number.NaN })).mes).toBe(1);
  });
});

describe('objetivoDelMes · lo que NO se proyecta', () => {
  it('una escala del 1 al 10 no se entrega en cuotas', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 5, meta: 8, mes: 1, magnitud: 'escala' }));
    if (r.estado !== 'sin_cifra') throw new Error('una escala no debía dar cifra');
    expect(r.motivo).toBe('escala_subjetiva');
    expect(cifraDelMes(r, KG)).toBeNull();
  });

  it('una condición clínica tampoco: el ritmo lo pone quien atiende', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 140, meta: 120, mes: 1, magnitud: 'clinico' }));
    if (r.estado !== 'sin_cifra') throw new Error('lo clínico no debía dar cifra');
    expect(r.motivo).toBe('acompanamiento_clinico');
  });
});

describe('objetivoDelMes · el tope de cordura', () => {
  it('el caso que pidió el dueño: 7 kg en el último mes no se muestran', () => {
    // Dos meses sin mover la aguja. 7 kg en 30 días son 8,5 % del peso: no se muestra el número.
    const r = objetivoDelMes(entrada({ lineaBase: 82, valorActual: 82, meta: 75, mes: 3, topePorMes: topeDePeso(82) }));
    if (r.estado !== 'sin_cifra') throw new Error('7 kg en un mes no debían mostrarse');
    expect(r.motivo).toBe('ritmo_no_saludable');
    expect(cifraDelMes(r, KG)).toBeNull();
    expect(notaDelMes(r, KG)).toBe(
      'Lo que haría falta este mes es más rápido de lo que se puede cambiar con salud. Replantea la meta o date más plazo.'
    );
  });

  it('y el caso extremo del que se quejó: 20 kg en un mes, menos todavía', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 82, valorActual: 95, meta: 75, mes: 3, topePorMes: topeDePeso(95) }));
    if (r.estado !== 'sin_cifra') throw new Error('20 kg en un mes no debían mostrarse');
    expect(r.motivo).toBe('ritmo_no_saludable');
  });

  it('pero 2,5 kg en el último mes sí se muestran, aunque superen el plan original', () => {
    // 82 → 80 era el plan (0,67 kg por mes). Estar en 82,5 a un mes del final exige 2,5 kg, que es
    // 3,7× el plan… y sigue estando dentro de lo sano (3,3 kg). En peso manda la realidad, no el
    // plan: apagar acá la cifra sería un falso positivo contra alguien que todavía puede llegar.
    const r = objetivoDelMes(entrada({ lineaBase: 82, valorActual: 82.5, meta: 80, mes: 3, topePorMes: topeDePeso(82.5) }));
    expect(r.estado).toBe('con_cifra');
    if (r.estado !== 'con_cifra') return;
    expect(r.valor).toBe(80);
  });

  it('el tope relativo tolera hasta 3× el ritmo planeado, y ahí muestra', () => {
    // Nunca arrancó: el mes 3 pide los 10 000 enteros, que son exactamente 3× el plan mensual.
    const r = objetivoDelMes(entrada({ lineaBase: 5000, valorActual: 5000, meta: 15000, mes: 3 }));
    expect(r.estado).toBe('con_cifra');
    if (r.estado !== 'con_cifra') return;
    expect(r.valor).toBe(15000);
  });

  it('pasado el 3×, no hay cifra: sería pedir en un mes más que todo el plan de 90 días', () => {
    // Facturaba 5 000, se propuso 15 000 y hoy está en 3 000: 12 000 en un mes contra un plan de
    // 10 000 en noventa días.
    const r = objetivoDelMes(entrada({ lineaBase: 5000, valorActual: 3000, meta: 15000, mes: 3 }));
    if (r.estado !== 'sin_cifra') throw new Error('12 000 en un mes no debían mostrarse');
    expect(r.motivo).toBe('fuera_de_alcance');
    expect(notaDelMes(r, SOLES)).toContain('Conviene replantearla');
  });

  it('el mes 1 nunca dispara el tope relativo: el plan es su propio ritmo', () => {
    // Incluso una meta disparatada de origen da 1,0× el primer mes. Discutir la meta es trabajo del
    // Mapa (§4.3); acá el trabajo es no mentir sobre el ritmo. Queda anotado como límite conocido.
    const r = objetivoDelMes(entrada({ lineaBase: 5000, meta: 500000, mes: 1 }));
    expect(r.estado).toBe('con_cifra');
  });

  it('un tope absoluto en 0 o negativo no apaga todo: se ignora y manda el relativo', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 82, meta: 75, mes: 1, topePorMes: 0 }));
    expect(r.estado).toBe('con_cifra');
  });
});

describe('mesDelObjetivo', () => {
  it('cuenta de treinta en treinta: 30 cierra el 1, 60 el 2 y 90 el 3', () => {
    expect(mesDelObjetivo(1)).toBe(1);
    expect(mesDelObjetivo(30)).toBe(1);
    expect(mesDelObjetivo(31)).toBe(2);
    expect(mesDelObjetivo(60)).toBe(2);
    expect(mesDelObjetivo(61)).toBe(3);
    expect(mesDelObjetivo(90)).toBe(3);
  });

  it('no es el mes del plan semanal: el día 57 todavía es el mes 2', () => {
    // `mesDe` de periodoDelPrograma, que cuenta bloques de cuatro semanas, diría 3.
    expect(mesDelObjetivo(57)).toBe(2);
  });

  it('el día 0 es el mes 1 y pasado el 90 se queda en el 3', () => {
    expect(mesDelObjetivo(0)).toBe(1);
    expect(mesDelObjetivo(-5)).toBe(1);
    expect(mesDelObjetivo(120)).toBe(3);
    expect(mesDelObjetivo(Number.NaN)).toBe(1);
  });

  it('cada mes sabe el día en que cierra', () => {
    expect(diaDeCierre(1)).toBe(30);
    expect(diaDeCierre(2)).toBe(60);
    expect(diaDeCierre(3)).toBe(90);
    expect(diaDeCierre(9)).toBe(90);
    expect(etiquetaDelMesDelObjetivo(2)).toBe('Mes 2 · cierra el Día 60');
  });
});

describe('cómo se escribe', () => {
  it('la unidad física va detrás y la moneda delante', () => {
    const peso = objetivoDelMes(entrada({ lineaBase: 82, meta: 75, mes: 1 }));
    const plata = objetivoDelMes(entrada({ lineaBase: 5000, meta: 15000, mes: 1 }));
    expect(cifraDelMes(peso, KG)).toBe('79.7 kg');
    expect(cifraDelMes(plata, SOLES)).toBe('S/ 8\u00a0333');
  });

  it('el periodo se pega al final cuando la cifra es una tasa', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 5000, meta: 15000, mes: 3, valorActual: 12000 }));
    expect(cifraDelMes(r, { ...SOLES, periodo: 'mensuales' })).toBe('S/ 15\u00a0000 mensuales');
  });

  it('sin unidad, la cifra es solo el número', () => {
    const r = objetivoDelMes(entrada({ lineaBase: 10, meta: 40, mes: 1 }));
    expect(cifraDelMes(r, { unidad: '  ' })).toBe('20');
  });

  it('nunca se queda sin explicación, tenga cifra o no', () => {
    const casos = todosLosEstados();
    for (const caso of casos) {
      expect(notaDelMes(caso, KG).length).toBeGreaterThan(20);
    }
  });

  it('habla de tú, como toda la app: nada de voseo', () => {
    const casos = todosLosEstados();
    const VOSEO = /\b(tenés|podés|querés|debés|vos|replanteá|elegí|definí|mirá|andá|dale)\b/i;
    for (const caso of casos) {
      expect(notaDelMes(caso, KG)).not.toMatch(VOSEO);
    }
  });

  it('el mes 1 solo, sin plural equivocado cuando queda uno', () => {
    const ultimo = objetivoDelMes(entrada({ lineaBase: 82, valorActual: 76, meta: 75, mes: 3 }));
    expect(notaDelMes(ultimo, KG)).toContain('te queda 1 mes');
    const primero = objetivoDelMes(entrada({ lineaBase: 82, meta: 75, mes: 1 }));
    expect(notaDelMes(primero, KG)).toContain('te quedan 3 meses');
  });
});
