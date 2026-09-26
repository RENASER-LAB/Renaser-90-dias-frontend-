import { describe, expect, it } from '@jest/globals';

import { cuadrosPorDibujo, FPS_MAXIMO_DEL_ORBE, periodoSuavizado } from '../ritmoDelOrbe';

const HZ = (hz: number) => 1000 / hz;

describe('cuadrosPorDibujo', () => {
  it('en reposo (30 por segundo) dibuja 1 de cada 4 cuadros a 120 Hz, 1 de 3 a 90 y 1 de 2 a 60', () => {
    const fps = FPS_MAXIMO_DEL_ORBE.reposo;
    expect(cuadrosPorDibujo(HZ(120), fps)).toBe(4);
    expect(cuadrosPorDibujo(HZ(90), fps)).toBe(3);
    expect(cuadrosPorDibujo(HZ(60), fps)).toBe(2);
  });

  it('activo (60 por segundo) salta 1 de cada 2 a 120 Hz y dibuja todos a 60 Hz', () => {
    const fps = FPS_MAXIMO_DEL_ORBE.hablando;
    expect(cuadrosPorDibujo(HZ(120), fps)).toBe(2);
    expect(cuadrosPorDibujo(HZ(60), fps)).toBe(1);
  });

  it('a 90 Hz con tope 60 usa un paso fijo de 2 (45 parejos), aunque la medida quede apenas debajo', () => {
    expect(cuadrosPorDibujo(HZ(90), 60)).toBe(2);
    expect(cuadrosPorDibujo(HZ(90) + 0.05, 60)).toBe(2);
    expect(cuadrosPorDibujo(HZ(90) - 0.05, 60)).toBe(2);
  });

  it('una pantalla de 60 o 120 Hz algo lenta no pierde la mitad de los cuadros', () => {
    expect(cuadrosPorDibujo(16.9, 60)).toBe(1);
    expect(cuadrosPorDibujo(8.4, 60)).toBe(2);
    expect(cuadrosPorDibujo(8.4, 30)).toBe(4);
  });

  it('una pantalla más lenta que el tope dibuja todos sus cuadros', () => {
    expect(cuadrosPorDibujo(HZ(30), 60)).toBe(1);
  });

  it('sin medida válida no se queda sin dibujar', () => {
    expect(cuadrosPorDibujo(0, 30)).toBe(1);
    expect(cuadrosPorDibujo(Number.NaN, 30)).toBe(1);
    expect(cuadrosPorDibujo(16, 0)).toBe(1);
  });
});

describe('periodoSuavizado', () => {
  it('un tirón (cuadro de 100 ms) no cambia el período medido ni el paso', () => {
    const periodo = periodoSuavizado(HZ(120), 100);
    expect(periodo).toBe(HZ(120));
    expect(cuadrosPorDibujo(periodo, 30)).toBe(4);
  });

  it('ignora medidas vacías', () => {
    expect(periodoSuavizado(16, 0)).toBe(16);
  });

  it('sin medida previa arranca de la primera', () => {
    expect(periodoSuavizado(0, HZ(120))).toBe(HZ(120));
    expect(periodoSuavizado(0, 0)).toBe(0);
  });

  it('converge al período real de la pantalla', () => {
    let periodo = HZ(60);
    for (let i = 0; i < 100; i++) periodo = periodoSuavizado(periodo, HZ(120));
    expect(periodo).toBeCloseTo(HZ(120), 1);
  });
});
