import { describe, expect, it } from '@jest/globals';

import { textoDeLaTarjeta } from '../textoDeLaTarjeta';

/**
 * S-1 (26/09): la tarjeta del mentor en Hoy decía «N aprendices · sin avance registrado todavía»
 * SIEMPRE, porque contaba con campos que el servidor nunca mandaba. Ahora habla el semáforo.
 */
describe('la línea de la tarjeta «Mi grupo» en Hoy', () => {
  const base = { cargando: false, fallo: null, total: 5 } as const;

  it('con alguien en rojo o amarillo dice cuántos necesitan ayuda', () => {
    expect(
      textoDeLaTarjeta({ ...base, resumen: { verde: 3, amarillo: 1, rojo: 1, sinDatos: 0, total: 5 } }),
    ).toBe('2 necesitan tu ayuda esta semana');
    expect(
      textoDeLaTarjeta({ ...base, resumen: { verde: 4, amarillo: 0, rojo: 1, sinDatos: 0, total: 5 } }),
    ).toBe('1 necesita tu ayuda esta semana');
  });

  it('nunca dice «sin avance registrado», con o sin semáforo', () => {
    const casos = [
      textoDeLaTarjeta({ ...base, resumen: { verde: 0, amarillo: 0, rojo: 0, sinDatos: 5, total: 5 } }),
      textoDeLaTarjeta({ ...base, resumen: null }),
      textoDeLaTarjeta({ ...base, resumen: { verde: 5, amarillo: 0, rojo: 0, sinDatos: 0, total: 5 } }),
    ];
    for (const texto of casos) expect(texto).not.toMatch(/sin avance/i);
  });

  it('sin semáforo (404/403) dice solo cuántos son', () => {
    expect(textoDeLaTarjeta({ ...base, resumen: null })).toBe('5 aprendices en tu grupo');
    expect(textoDeLaTarjeta({ ...base, total: 1, resumen: null })).toBe('1 aprendiz en tu grupo');
  });

  it('los estados de carga y fallo siguen igual', () => {
    expect(textoDeLaTarjeta({ ...base, cargando: true, resumen: null })).toBe('Cargando tu grupo…');
    expect(textoDeLaTarjeta({ ...base, fallo: 'no_disponible', resumen: null })).toBe(
      'El seguimiento del grupo aún no está disponible.',
    );
    expect(textoDeLaTarjeta({ ...base, fallo: 'sin_red', resumen: null })).toBe('No pudimos cargar tu grupo.');
    expect(textoDeLaTarjeta({ ...base, total: 0, resumen: null })).toBe('Todavía no tienes aprendices asignados.');
  });

  it('un mentor sin grupo asignado no ve un error', () => {
    expect(textoDeLaTarjeta({ ...base, fallo: 'sin_celula', resumen: null })).toBe('Todavía no lideras ningún grupo.');
  });
});
