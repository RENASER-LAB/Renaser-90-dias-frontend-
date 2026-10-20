import { describe, expect, it } from '@jest/globals';

import {
  abrirOtra,
  desplazamientoParaVerLaFila,
  MAXIMO_DE_OTRA,
  MINIMO_DE_OTRA,
  minutosTrasElPaso,
  moverAvisoDeOtra,
  PASO_DE_OTRA,
  sePuedeMover,
} from '../avisoOtra';

/**
 * «Otra» del recordatorio (spec 011): se agrega y marca ya, y la fila «− 15 min antes +» lo mueve de 5 en 5 entre 1 y 60.
 */
describe('los topes y el paso', () => {
  it('de 5 en 5, entre 1 y 60 (los de la rueda que reemplaza)', () => {
    expect(PASO_DE_OTRA).toBe(5);
    expect(MINIMO_DE_OTRA).toBe(1);
    expect(MAXIMO_DE_OTRA).toBe(60);
  });
});

describe('abrirOtra: lo que pasa al tocar «Otra»', () => {
  it('sin avisos: agrega y marca 15 minutos antes', () => {
    expect(abrirOtra([])).toEqual({ avisos: [15], minutos: 15 });
  });

  it('solo «a la hora»: 15 se suma sin quitar el 0', () => {
    expect(abrirOtra([0])).toEqual({ avisos: [15, 0], minutos: 15 });
  });

  it('con un aviso que ya rige parte de ese (el último elegido, como abría la rueda) y no lo duplica', () => {
    expect(abrirOtra([30])).toEqual({ avisos: [30], minutos: 30 });
    expect(abrirOtra([10, 45, 30])).toEqual({ avisos: [45, 30, 10], minutos: 45 });
  });

  it('mantiene el orden de siempre, de la antelación mayor a la menor', () => {
    expect(abrirOtra([0]).avisos).toEqual([15, 0]);
    expect(abrirOtra([5, 0])).toEqual({ avisos: [5, 0], minutos: 5 });
    expect(abrirOtra([60, 10])).toEqual({ avisos: [60, 10], minutos: 60 });
  });

  it('un aviso viejo fuera de la fila (90) sigue en la lista y la fila arranca en el tope', () => {
    expect(abrirOtra([90])).toEqual({ avisos: [90, 60], minutos: 60 });
  });

  it('no cambia la lista que recibe', () => {
    const avisos = [30, 10];
    abrirOtra(avisos);
    expect(avisos).toEqual([30, 10]);
  });
});

describe('minutosTrasElPaso: «+» y «−» de 5 en 5', () => {
  it('suma y resta cinco', () => {
    expect(minutosTrasElPaso(15, 1)).toBe(20);
    expect(minutosTrasElPaso(15, -1)).toBe(10);
    expect(minutosTrasElPaso(55, 1)).toBe(60);
    expect(minutosTrasElPaso(10, -1)).toBe(5);
  });

  it('un valor que no es múltiplo de 5 se mueve de 5 en 5 desde ahí', () => {
    expect(minutosTrasElPaso(12, 1)).toBe(17);
    expect(minutosTrasElPaso(12, -1)).toBe(7);
    expect(minutosTrasElPaso(1, 1)).toBe(6);
    expect(minutosTrasElPaso(6, -1)).toBe(1);
  });

  it('tope en 60: ni «+» lo pasa', () => {
    expect(minutosTrasElPaso(60, 1)).toBe(60);
    expect(minutosTrasElPaso(58, 1)).toBe(60);
    expect(minutosTrasElPaso(57, 1)).toBe(60);
  });

  it('tope en 1: ni «−» lo baja', () => {
    expect(minutosTrasElPaso(1, -1)).toBe(1);
    expect(minutosTrasElPaso(3, -1)).toBe(1);
    expect(minutosTrasElPaso(5, -1)).toBe(1);
  });
});

describe('sePuedeMover: los botones de los topes se apagan', () => {
  it('«+» se apaga en 60 y «−» en 1; en el medio, los dos andan', () => {
    expect(sePuedeMover(60, 1)).toBe(false);
    expect(sePuedeMover(60, -1)).toBe(true);
    expect(sePuedeMover(1, -1)).toBe(false);
    expect(sePuedeMover(1, 1)).toBe(true);
    expect(sePuedeMover(15, 1)).toBe(true);
    expect(sePuedeMover(15, -1)).toBe(true);
  });

  it('cerca del tope todavía hay un paso (58 sube a 60, 3 baja a 1)', () => {
    expect(sePuedeMover(58, 1)).toBe(true);
    expect(sePuedeMover(3, -1)).toBe(true);
  });
});

describe('moverAvisoDeOtra: cambia ESE aviso en la lista', () => {
  it('«+» reemplaza el aviso por el siguiente, sin duplicar y en orden', () => {
    expect(moverAvisoDeOtra([15], 15, 1)).toEqual({ avisos: [20], minutos: 20 });
    expect(moverAvisoDeOtra([30, 15, 0], 15, 1)).toEqual({ avisos: [30, 20, 0], minutos: 20 });
  });

  it('«−» reemplaza el aviso por el anterior', () => {
    expect(moverAvisoDeOtra([15], 15, -1)).toEqual({ avisos: [10], minutos: 10 });
    expect(moverAvisoDeOtra([30, 15], 15, -1)).toEqual({ avisos: [30, 10], minutos: 10 });
  });

  it('si el aviso nuevo ya estaba, la lista no crece y ese queda marcado', () => {
    expect(moverAvisoDeOtra([30, 25], 25, 1)).toEqual({ avisos: [30], minutos: 30 });
    expect(moverAvisoDeOtra([30, 10], 10, 1)).toEqual({ avisos: [30, 15], minutos: 15 });
    expect(moverAvisoDeOtra([20, 15], 20, -1)).toEqual({ avisos: [15], minutos: 15 });
  });

  it('puede cruzar a otro aviso y sigue ordenado (de la mayor a la menor)', () => {
    expect(moverAvisoDeOtra([30, 10], 10, 1).avisos).toEqual([30, 15]);
    expect(moverAvisoDeOtra([10, 5], 5, 1).avisos).toEqual([10]);
    expect(moverAvisoDeOtra([40, 30, 0], 30, 1).avisos).toEqual([40, 35, 0]);
  });

  it('en el tope no cambia nada', () => {
    expect(moverAvisoDeOtra([60], 60, 1)).toEqual({ avisos: [60], minutos: 60 });
    expect(moverAvisoDeOtra([1], 1, -1)).toEqual({ avisos: [1], minutos: 1 });
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

  it('una secuencia completa: abrir, subir hasta el tope y bajar de nuevo', () => {
    let estado = abrirOtra([]);
    for (let i = 0; i < 20; i += 1) estado = moverAvisoDeOtra(estado.avisos, estado.minutos, 1);
    expect(estado).toEqual({ avisos: [60], minutos: 60 });
    estado = moverAvisoDeOtra(estado.avisos, estado.minutos, -1);
    expect(estado).toEqual({ avisos: [55], minutos: 55 });
    for (let i = 0; i < 20; i += 1) estado = moverAvisoDeOtra(estado.avisos, estado.minutos, -1);
    // 55, 50 … 5 y de ahí al piso: 1 (5 − 5 = 0 no existe en la fila).
    expect(estado).toEqual({ avisos: [1], minutos: 1 });
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
