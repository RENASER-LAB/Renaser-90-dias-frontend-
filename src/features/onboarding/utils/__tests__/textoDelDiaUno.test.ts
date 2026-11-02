import { describe, expect, it } from '@jest/globals';

import { AVISO_FECHA_CAMBIO, BOTON_ENTENDIDO, TITULO_EMPIEZA_MANANA, fechaDelDiaUno, lineaDelPlazo } from '../textoDelDiaUno';

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
