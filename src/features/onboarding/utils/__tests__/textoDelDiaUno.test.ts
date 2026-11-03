import { describe, expect, it } from '@jest/globals';

import { AVISO_FECHA_CAMBIO, BOTON_ENTENDIDO, TEXTO_PREPARANDO, TITULO_EMPIEZA_MANANA, fechaDelDiaUno, lineaDelPlazo, yaEmpezo } from '../textoDelDiaUno';

describe('«Tu programa empieza mañana» habla del plazo de la persona', () => {
  it('90 días (la Escuela, la Certificación y sin dato): «Son tus 90 días.»', () => {
    expect(lineaDelPlazo(90, 'ESCUELA')).toBe('Son tus 90 días.');
    expect(lineaDelPlazo(90, 'CERTIFICACION')).toBe('Son tus 90 días.');
    expect(lineaDelPlazo(undefined, undefined)).toBe('Son tus 90 días.');
    expect(lineaDelPlazo(null, null)).toBe('Son tus 90 días.');
  });

  it('el Diplomado dice sus meses o su año', () => {
    expect(lineaDelPlazo(90, 'DIPLOMADO')).toBe('Son tus 3 meses.');
    expect(lineaDelPlazo(365, 'DIPLOMADO')).toBe('Es tu año.');
  });

  it('el año completo se dice igual en cualquier formación (la duración sola lo decide)', () => {
    expect(lineaDelPlazo(365, 'ESCUELA')).toBe('Es tu año.');
  });

  it('los textos son los del dueño: nada de «elegir»', () => {
    expect(TITULO_EMPIEZA_MANANA).toBe('Tu programa empieza mañana');
    expect(BOTON_ENTENDIDO).toBe('Entendido');
    expect(TEXTO_PREPARANDO).toBe('Preparando tu programa…');
    expect(AVISO_FECHA_CAMBIO).not.toMatch(/eleg|elij/i);
  });
});

describe('la fecha de mañana, en palabras', () => {
  it('«Martes 3 de noviembre»: mayúscula solo al principio', () => {
    expect(fechaDelDiaUno('2026-11-03')).toBe('Martes 3 de noviembre');
    expect(fechaDelDiaUno('2026-12-31')).toBe('Jueves 31 de diciembre');
    expect(fechaDelDiaUno('2027-01-01')).toBe('Viernes 1 de enero');
  });
});

describe('si el Día 1 ya llegó (la persona activó, cerró la app y volvió)', () => {
  const ahora = new Date(2026, 10, 3, 9, 30); // martes 3 de noviembre, 09:30 en el reloj del teléfono

  it('mañana todavía no empezó; hoy y antes, sí', () => {
    expect(yaEmpezo('2026-11-04', ahora)).toBe(false);
    expect(yaEmpezo('2026-11-05', ahora)).toBe(false);
    expect(yaEmpezo('2026-11-03', ahora)).toBe(true);
    expect(yaEmpezo('2026-11-02', ahora)).toBe(true);
    expect(yaEmpezo('2026-10-31', ahora)).toBe(true);
  });

  it('no depende de la hora del día ni de UTC: a las 23:59 y a las 00:01 el día es el del teléfono', () => {
    expect(yaEmpezo('2026-11-04', new Date(2026, 10, 3, 23, 59))).toBe(false);
    expect(yaEmpezo('2026-11-04', new Date(2026, 10, 4, 0, 1))).toBe(true);
  });
});
