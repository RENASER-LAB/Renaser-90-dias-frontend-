import { describe, expect, it } from '@jest/globals';

import {
  abrirOtra,
  ARRANQUE_DE_OTRA,
  desplazamientoParaVerLaFila,
  MAXIMO_DE_OTRA,
  MINIMO_DE_OTRA,
  minutosParaUnaOtraNueva,
  moverAvisoDeOtra,
  PASO_DE_OTRA,
  sePuedeMover,
  siguienteLibreDeOtra,
} from '../avisoOtra';

/**
 * «Otra» del recordatorio (spec 011): SUMA un aviso nuevo y lo marca, y la fila «− 15 min antes +» mueve SOLO ese aviso
 * de 5 en 5 entre 1 y 60, saltando los que ya existen. Los demás avisos nunca cambian.
 */
const MULTIPLOS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

describe('los topes y el paso', () => {
  it('de 5 en 5, entre 1 y 60, y arranca en 15', () => {
    expect(PASO_DE_OTRA).toBe(5);
    expect(MINIMO_DE_OTRA).toBe(1);
    expect(MAXIMO_DE_OTRA).toBe(60);
    expect(ARRANQUE_DE_OTRA).toBe(15);
  });
});

describe('minutosParaUnaOtraNueva: dónde arranca el aviso nuevo', () => {
  it('15 si está libre', () => {
    expect(minutosParaUnaOtraNueva([])).toBe(15);
    expect(minutosParaUnaOtraNueva([30, 0])).toBe(15);
    expect(minutosParaUnaOtraNueva([10])).toBe(15);
  });

  it('con 15 ya puesto, el siguiente libre hacia arriba: 20', () => {
    expect(minutosParaUnaOtraNueva([15])).toBe(20);
    expect(minutosParaUnaOtraNueva([30, 15, 0])).toBe(20);
  });

  it('salta los ocupados hacia arriba (15 y 20 → 25; 15, 20 y 25 → 30 si está libre)', () => {
    expect(minutosParaUnaOtraNueva([15, 20])).toBe(25);
    expect(minutosParaUnaOtraNueva([15, 20, 25, 30])).toBe(35);
  });

  it('si no queda nada libre hacia arriba, baja desde 15: 10 y después 5', () => {
    const arriba = MULTIPLOS.filter(m => m >= 15);
    expect(minutosParaUnaOtraNueva(arriba)).toBe(10);
    expect(minutosParaUnaOtraNueva([...arriba, 10])).toBe(5);
  });

  it('sin ningún valor libre no hay aviso nuevo', () => {
    expect(minutosParaUnaOtraNueva(MULTIPLOS)).toBeNull();
    expect(minutosParaUnaOtraNueva([...MULTIPLOS, 0, 90, 7])).toBeNull();
  });

  it('un aviso que no es múltiplo de 5 (12) no ocupa ningún lugar', () => {
    expect(minutosParaUnaOtraNueva([12])).toBe(15);
  });
});

describe('abrirOtra: lo que pasa al tocar «Otra»', () => {
  it('sin avisos: suma y marca 15 min antes', () => {
    expect(abrirOtra([])).toEqual({ avisos: [15], minutos: 15 });
  });

  it('con 30 min antes y a la hora marcados SUMA 15 y los demás quedan: [30, 15, 0]', () => {
    expect(abrirOtra([30, 0])).toEqual({ avisos: [30, 15, 0], minutos: 15 });
  });

  it('con un aviso ya marcado (30) no lo cambia: lo conserva y suma 15', () => {
    expect(abrirOtra([30])).toEqual({ avisos: [30, 15], minutos: 15 });
    expect(abrirOtra([10, 45, 30])).toEqual({ avisos: [45, 30, 15, 10], minutos: 15 });
  });

  it('con 15 ya existente arranca en 20 y deja el 15', () => {
    expect(abrirOtra([15])).toEqual({ avisos: [20, 15], minutos: 20 });
    expect(abrirOtra([30, 15, 0])).toEqual({ avisos: [30, 20, 15, 0], minutos: 20 });
  });

  it('mantiene el orden de siempre, de la antelación mayor a la menor', () => {
    expect(abrirOtra([0])).toEqual({ avisos: [15, 0], minutos: 15 });
    expect(abrirOtra([60, 10])).toEqual({ avisos: [60, 15, 10], minutos: 15 });
  });

  it('un aviso viejo fuera de la fila (90) sigue en la lista', () => {
    expect(abrirOtra([90])).toEqual({ avisos: [90, 15], minutos: 15 });
  });

  it('sin ningún valor libre no suma nada', () => {
    expect(abrirOtra(MULTIPLOS)).toBeNull();
  });

  it('no cambia la lista que recibe', () => {
    const avisos = [30, 10];
    abrirOtra(avisos);
    expect(avisos).toEqual([30, 10]);
  });
});

describe('siguienteLibreDeOtra: «+» y «−» de 5 en 5', () => {
  it('suma y resta cinco', () => {
    expect(siguienteLibreDeOtra(15, 1, [15])).toBe(20);
    expect(siguienteLibreDeOtra(15, -1, [15])).toBe(10);
    expect(siguienteLibreDeOtra(55, 1, [55])).toBe(60);
    expect(siguienteLibreDeOtra(10, -1, [10])).toBe(5);
  });

  it('un valor que no es múltiplo de 5 se mueve de 5 en 5 desde ahí', () => {
    expect(siguienteLibreDeOtra(12, 1, [12])).toBe(17);
    expect(siguienteLibreDeOtra(12, -1, [12])).toBe(7);
    expect(siguienteLibreDeOtra(1, 1, [1])).toBe(6);
    expect(siguienteLibreDeOtra(6, -1, [6])).toBe(1);
  });

  it('salta los valores que ya existen: desde 25 con 30 existente, «+» va a 35', () => {
    expect(siguienteLibreDeOtra(25, 1, [30, 25])).toBe(35);
    expect(siguienteLibreDeOtra(25, 1, [35, 30, 25])).toBe(40);
    expect(siguienteLibreDeOtra(20, -1, [20, 15, 10])).toBe(5);
  });

  it('el 0 («a la hora») y los avisos fuera del rango no estorban', () => {
    expect(siguienteLibreDeOtra(5, -1, [5, 0])).toBe(1);
    expect(siguienteLibreDeOtra(55, 1, [90, 55, 0])).toBe(60);
  });

  it('tope en 60: ni «+» lo pasa; un paso que se pasaría cae en 60', () => {
    expect(siguienteLibreDeOtra(60, 1, [60])).toBeNull();
    expect(siguienteLibreDeOtra(58, 1, [58])).toBe(60);
    expect(siguienteLibreDeOtra(57, 1, [57])).toBe(60);
  });

  it('tope en 1: ni «−» lo baja; un paso que se pasaría cae en 1', () => {
    expect(siguienteLibreDeOtra(1, -1, [1])).toBeNull();
    expect(siguienteLibreDeOtra(3, -1, [3])).toBe(1);
    expect(siguienteLibreDeOtra(5, -1, [5])).toBe(1);
  });

  it('sin un valor libre en esa dirección no hay siguiente', () => {
    // 55 con el 60 ocupado: arriba no queda nada.
    expect(siguienteLibreDeOtra(55, 1, [60, 55])).toBeNull();
    // 10 con 5 y 1 ocupados: abajo no queda nada.
    expect(siguienteLibreDeOtra(10, -1, [10, 5, 1])).toBeNull();
    // Pero en la otra dirección sí.
    expect(siguienteLibreDeOtra(55, -1, [60, 55])).toBe(50);
  });

  it('el 1 es un valor libre más: «−» desde 5 llega a 1 si está libre', () => {
    expect(siguienteLibreDeOtra(5, -1, [5])).toBe(1);
  });
});

describe('sePuedeMover: los botones sin valor libre se apagan', () => {
  it('«+» se apaga en 60 y «−» en 1; en el medio, los dos andan', () => {
    expect(sePuedeMover(60, 1, [60])).toBe(false);
    expect(sePuedeMover(60, -1, [60])).toBe(true);
    expect(sePuedeMover(1, -1, [1])).toBe(false);
    expect(sePuedeMover(1, 1, [1])).toBe(true);
    expect(sePuedeMover(15, 1, [15])).toBe(true);
    expect(sePuedeMover(15, -1, [15])).toBe(true);
  });

  it('cerca del tope todavía hay un paso (58 sube a 60, 3 baja a 1)', () => {
    expect(sePuedeMover(58, 1, [58])).toBe(true);
    expect(sePuedeMover(3, -1, [3])).toBe(true);
  });

  it('también se apaga si lo que queda en esa dirección está ocupado', () => {
    expect(sePuedeMover(55, 1, [60, 55])).toBe(false);
    expect(sePuedeMover(55, -1, [60, 55])).toBe(true);
  });
});

describe('moverAvisoDeOtra: cambia SOLO el aviso de «Otra»', () => {
  it('«+» reemplaza el aviso por el siguiente, sin duplicar y en orden', () => {
    expect(moverAvisoDeOtra([15], 15, 1)).toEqual({ avisos: [20], minutos: 20 });
    expect(moverAvisoDeOtra([30, 15, 0], 15, 1)).toEqual({ avisos: [30, 20, 0], minutos: 20 });
  });

  it('«−» reemplaza el aviso por el anterior', () => {
    expect(moverAvisoDeOtra([15], 15, -1)).toEqual({ avisos: [10], minutos: 10 });
    expect(moverAvisoDeOtra([30, 15], 15, -1)).toEqual({ avisos: [30, 10], minutos: 10 });
  });

  it('desde 25 con 30 existente, «+» salta a 35 y el 30 queda como estaba', () => {
    expect(moverAvisoDeOtra([30, 25], 25, 1)).toEqual({ avisos: [35, 30], minutos: 35 });
    expect(moverAvisoDeOtra([35, 30, 25, 0], 25, 1)).toEqual({ avisos: [40, 35, 30, 0], minutos: 40 });
  });

  it('desde 20 con 15 y 10 existentes, «−» salta a 5 y no pisa a ninguno', () => {
    expect(moverAvisoDeOtra([20, 15, 10], 20, -1)).toEqual({ avisos: [15, 10, 5], minutos: 5 });
  });

  it('nunca pisa ni duplica otro aviso: la lista conserva todos los demás', () => {
    for (const sentido of [1, -1] as const) {
      const otros = [45, 30, 20, 10, 0];
      let estado = { avisos: [...otros, 25].sort((a, b) => b - a), minutos: 25 };
      for (let i = 0; i < 20; i += 1) {
        estado = moverAvisoDeOtra(estado.avisos, estado.minutos, sentido);
        expect(new Set(estado.avisos).size).toBe(estado.avisos.length);
        for (const otro of otros) expect(estado.avisos).toContain(otro);
        expect(estado.avisos).toContain(estado.minutos);
        expect(estado.avisos).toHaveLength(otros.length + 1);
      }
    }
  });

  it('en el tope, o sin valor libre en esa dirección, no cambia nada', () => {
    expect(moverAvisoDeOtra([60], 60, 1)).toEqual({ avisos: [60], minutos: 60 });
    expect(moverAvisoDeOtra([1], 1, -1)).toEqual({ avisos: [1], minutos: 1 });
    expect(moverAvisoDeOtra([60, 55], 55, 1)).toEqual({ avisos: [60, 55], minutos: 55 });
  });

  it('un valor suelto (no múltiplo de 5) sigue de 5 en 5 desde ahí', () => {
    expect(moverAvisoDeOtra([12], 12, 1)).toEqual({ avisos: [17], minutos: 17 });
    expect(moverAvisoDeOtra([58], 58, 1)).toEqual({ avisos: [60], minutos: 60 });
    expect(moverAvisoDeOtra([3], 3, -1)).toEqual({ avisos: [1], minutos: 1 });
  });

  it('no toca «a la hora» ni los avisos de afuera de la fila (90)', () => {
    expect(moverAvisoDeOtra([90, 15, 0], 15, 1)).toEqual({ avisos: [90, 20, 0], minutos: 20 });
  });

  it('no cambia la lista que recibe', () => {
    const avisos = [30, 15];
    moverAvisoDeOtra(avisos, 15, 1);
    expect(avisos).toEqual([30, 15]);
  });

  it('una secuencia completa con 30 y a la hora marcados: sumar, subir hasta el tope y bajar hasta el piso', () => {
    const abierta = abrirOtra([30, 0]);
    expect(abierta).toEqual({ avisos: [30, 15, 0], minutos: 15 });
    let estado = abierta!;
    // 15 → 20 → 25 → 35 (salta el 30) → 40 … → 60.
    for (let i = 0; i < 20; i += 1) estado = moverAvisoDeOtra(estado.avisos, estado.minutos, 1);
    expect(estado).toEqual({ avisos: [60, 30, 0], minutos: 60 });
    estado = moverAvisoDeOtra(estado.avisos, estado.minutos, -1);
    expect(estado).toEqual({ avisos: [55, 30, 0], minutos: 55 });
    // Hacia abajo salta el 30 y llega al piso: 1.
    for (let i = 0; i < 20; i += 1) estado = moverAvisoDeOtra(estado.avisos, estado.minutos, -1);
    expect(estado).toEqual({ avisos: [30, 1, 0], minutos: 1 });
  });
});

describe('desplazamientoParaVerLaFila: la fila nueva se ve entera', () => {
  it('si ya cabe en lo visible, no desplaza', () => {
    expect(desplazamientoParaVerLaFila(100, 64, 0, 400)).toBeNull();
    expect(desplazamientoParaVerLaFila(300, 64, 0, 400)).toBeNull();
  });

  it('si nace debajo de lo visible, desplaza lo justo para que quede entera con un poco de aire', () => {
    // La fila termina en 340 + 64 = 404; con 16 de aire, 420: hay que bajar 20.
    expect(desplazamientoParaVerLaFila(340, 64, 0, 400)).toBe(20);
    // Con 150 ya desplazados, lo visible llega a 550; la fila termina en 536 + 64 + 16 = 616.
    expect(desplazamientoParaVerLaFila(536, 64, 150, 400)).toBe(216);
  });

  it('sin medida de lo visible no hace nada', () => {
    expect(desplazamientoParaVerLaFila(500, 64, 0, 0)).toBeNull();
  });
});
