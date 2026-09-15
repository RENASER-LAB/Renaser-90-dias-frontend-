/**
 * El ritmo del día: lo que decide si la partícula del hero viaja, va lento o se detiene.
 *
 * La propiedad que de verdad hay que proteger es la que motivó escribir esto: **la animación tiene
 * que distinguir a quien cumplió de quien no**. Si alguna vez alguien la ata a `coherencia` (que el
 * backend no calcula y el móvil resuelve a 100) o a `rachaActual` (que no avanza), estas pruebas
 * no lo van a atrapar solas — pero el caso "no hizo nada" sí deja de dar `detenido` en cuanto el
 * cálculo deje de mirar lo que la persona hizo hoy.
 */
import { describe, expect, it } from '@jest/globals';

import { ritmoDelDia } from '../ritmoDelDia';

describe('ritmoDelDia', () => {
  it('sin nada hecho, la partícula se detiene y el mensaje no castiga', () => {
    const r = ritmoDelDia({ habitosCompletados: 0, habitosTotal: 5, rocaCompletada: false });
    expect(r.ritmo).toBe('detenido');
    expect(r.progreso).toBe(0);
    // La guía del cliente es explícita: "no te castigues". El texto nombra el hecho, no juzga.
    expect(r.mensaje).not.toMatch(/fallaste|mal|perdiste|deber[ií]as/i);
  });

  it('a medias, va lento', () => {
    const r = ritmoDelDia({ habitosCompletados: 2, habitosTotal: 5, rocaCompletada: false });
    expect(r.ritmo).toBe('lento');
    expect(r.progreso).toBeCloseTo(2 / 6);
  });

  it('todo hecho, va rápido', () => {
    const r = ritmoDelDia({ habitosCompletados: 5, habitosTotal: 5, rocaCompletada: true });
    expect(r.ritmo).toBe('rapido');
    expect(r.progreso).toBe(1);
  });

  it('la roca cuenta como una unidad más — sin ella el día no está completo', () => {
    // Cumplir los 5 hábitos pero no la roca NO es día completo: falta una de seis.
    const conRocaPendiente = ritmoDelDia({ habitosCompletados: 5, habitosTotal: 5, rocaCompletada: false });
    expect(conRocaPendiente.ritmo).toBe('lento');
    expect(conRocaPendiente.progreso).toBeCloseTo(5 / 6);

    // Sin roca definida, los 5 hábitos sí son el día entero.
    const sinRoca = ritmoDelDia({ habitosCompletados: 5, habitosTotal: 5, rocaCompletada: null });
    expect(sinRoca.ritmo).toBe('rapido');
  });

  it('distingue de verdad: el que cumplió y el que no NO reciben lo mismo', () => {
    // Ésta es la prueba que existe por el motivo de fondo. Si alguien ata el cálculo a coherencia
    // (siempre 100) o a la racha (siempre 0), estos dos casos empiezan a devolver lo mismo.
    const cumplio = ritmoDelDia({ habitosCompletados: 4, habitosTotal: 4, rocaCompletada: true });
    const abandono = ritmoDelDia({ habitosCompletados: 0, habitosTotal: 4, rocaCompletada: false });
    expect(cumplio.ritmo).not.toBe(abandono.ritmo);
    expect(cumplio.mensaje).not.toBe(abandono.mensaje);
  });

  it('sin plan del día no inventa avance', () => {
    const r = ritmoDelDia({ habitosCompletados: 0, habitosTotal: 0, rocaCompletada: null });
    expect(r.ritmo).toBe('detenido');
    expect(r.progreso).toBe(0);
    expect(r.mensaje).toMatch(/plan/i);
  });

  it('aguanta datos incoherentes del servidor sin pasarse de 1', () => {
    // Más completados que totales no debería pasar, pero si pasa, la barra no se sale.
    const r = ritmoDelDia({ habitosCompletados: 99, habitosTotal: 3, rocaCompletada: true });
    expect(r.progreso).toBeLessThanOrEqual(1);
    expect(r.ritmo).toBe('rapido');
  });

  it('números negativos no rompen el cálculo', () => {
    const r = ritmoDelDia({ habitosCompletados: -5, habitosTotal: -2, rocaCompletada: null });
    expect(r.progreso).toBe(0);
    expect(r.ritmo).toBe('detenido');
  });
});
