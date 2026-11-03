import { describe, expect, it } from '@jest/globals';

import {
  HORAS,
  HORA_POR_DEFECTO,
  MINUTOS,
  POR_RENGLON,
  aDosDigitos,
  armarHora,
  enRenglones,
  momentoDelDia,
  partirHora,
} from '../horaDelSelector';

/**
 * Las cuentas del selector de hora (issue #97): lo que se ofrece, cómo se reparte en renglones y de qué hora se
 * parte. El selector se ve en cuatro pantallas (Despertar de Yo → Alarmas, los recordatorios de las acciones, los de
 * pago y el formulario de eventos) y lo que devuelve —`HH:mm`, minutos de 5 en 5— no puede cambiar.
 */

describe('lo que ofrece el selector', () => {
  it('las 24 horas, de 00 a 23, y los minutos de 5 en 5, de 00 a 55', () => {
    expect(HORAS).toHaveLength(24);
    expect(HORAS[0]).toBe(0);
    expect(HORAS[23]).toBe(23);
    expect(MINUTOS).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  });

  it('las 24 horas caben en 4 renglones de 6 y los minutos en 2: todo a la vista, sin desplazar de lado', () => {
    expect(POR_RENGLON).toBe(6);
    const horas = enRenglones(HORAS);
    const minutos = enRenglones(MINUTOS);
    expect(horas).toHaveLength(4);
    expect(minutos).toHaveLength(2);
    for (const renglon of [...horas, ...minutos]) expect(renglon).toHaveLength(6);
    // Ninguna se pierde ni se repite, y siguen en orden.
    expect(horas.flat()).toEqual([...HORAS]);
    expect(minutos.flat()).toEqual([...MINUTOS]);
    // La hora 11, que antes pedía arrastrar la fila de lado, está en el segundo renglón.
    expect(horas[1]).toContain(11);
  });

  it('enRenglones deja el último renglón más corto si no se reparte exacto', () => {
    expect(enRenglones([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(enRenglones([], 3)).toEqual([]);
  });
});

describe('lo que devuelve', () => {
  it('«HH:mm» con dos cifras, de 00:00 a 23:55', () => {
    expect(aDosDigitos(7)).toBe('07');
    expect(armarHora(9, 0)).toBe('09:00');
    expect(armarHora(11, 35)).toBe('11:35');
    expect(armarHora(23, 55)).toBe('23:55');
    expect(armarHora(0, 5)).toBe('00:05');
  });

  it('el momento del día: mañana hasta las 11, tarde hasta las 17, noche desde las 18', () => {
    expect(momentoDelDia(0)).toBe('de la mañana');
    expect(momentoDelDia(11)).toBe('de la mañana');
    expect(momentoDelDia(12)).toBe('de la tarde');
    expect(momentoDelDia(17)).toBe('de la tarde');
    expect(momentoDelDia(18)).toBe('de la noche');
    expect(momentoDelDia(23)).toBe('de la noche');
  });
});

describe('de qué hora parte al abrirse', () => {
  it('de la que ya tenía quien lo abre', () => {
    expect(partirHora('09:00')).toEqual({ hora: 9, minuto: 0 });
    expect(partirHora('22:30')).toEqual({ hora: 22, minuto: 30 });
    expect(partirHora('23:55')).toEqual({ hora: 23, minuto: 55 });
  });

  it('lleva el minuto al múltiplo de 5 más cercano, sin pasar a otra hora (58 → 00)', () => {
    expect(partirHora('07:07')).toEqual({ hora: 7, minuto: 5 });
    expect(partirHora('07:08')).toEqual({ hora: 7, minuto: 10 });
    expect(partirHora('07:58')).toEqual({ hora: 7, minuto: 0 });
  });

  it('acepta «HH:mm:ss» y ignora los segundos', () => {
    expect(partirHora('06:30:00')).toEqual({ hora: 6, minuto: 30 });
  });

  it('sin hora legible, las 06:00; una hora fuera de rango se acota', () => {
    expect(HORA_POR_DEFECTO).toBe(6);
    expect(partirHora('abc')).toEqual({ hora: 6, minuto: 0 });
    expect(partirHora('25:00')).toEqual({ hora: 23, minuto: 0 });
    expect(partirHora('-3:00')).toEqual({ hora: 0, minuto: 0 });
  });
});
