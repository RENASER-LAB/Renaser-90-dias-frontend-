/** Spec 046: las reglas que la app revisa antes de mandar, cuándo sale la fila de Hoy y los textos. */
import { describe, expect, it } from '@jest/globals';

import { MENSAJE_DEL_PROBLEMA, TEXTOS_DEL_SOBRENOMBRE, limpiarSobrenombre, muestraLaFilaEnHoy, problemaDeLaForma, textoDeLaEspera } from '../utils/reglasDelSobrenombre';

describe('la forma', () => {
  it('spec 046 FR-004: de 3 a 20, letras con tildes, números, espacio, punto y guion', () => {
    expect(problemaDeLaForma('Fénix de Arequipa')).toBeNull();
    expect(problemaDeLaForma('León-23.Ñ')).toBeNull();
    expect(problemaDeLaForma('Yo')).toBe('largo');
    expect(problemaDeLaForma('Un sobrenombre muy muy largo')).toBe('largo');
    expect(problemaDeLaForma('Dos  espacios')).toBe('espacios');
    expect(problemaDeLaForma('Fénix 🔥')).toBe('caracteres');
    expect(MENSAJE_DEL_PROBLEMA.largo).toBe('Usa de 3 a 20 letras.');
  });

  it('spec 046 FR-004 (issue #100): la tilde combinable (NFD) se acepta y se manda en NFC; dos espacios dicen por qué', () => {
    const nfd = 'Jose\u0301 Luis';
    expect(problemaDeLaForma(nfd)).toBeNull();
    expect(limpiarSobrenombre(`  ${nfd} `)).toBe('José Luis');
    expect(limpiarSobrenombre(nfd)).toBe('José Luis'.normalize('NFC'));
    expect(MENSAJE_DEL_PROBLEMA.espacios).toBe('Usa un solo espacio entre palabras.');
  });
});

describe('la fila de Hoy', () => {
  const sin = { sobrenombre: null, invitacionDescartada: false };
  it('spec 046 FR-001: desde el día 7, sin sobrenombre y sin «Ahora no» (D1, D2)', () => {
    expect(muestraLaFilaEnHoy(7, sin)).toBe(true);
    expect(muestraLaFilaEnHoy(12, sin)).toBe(true);
    expect(muestraLaFilaEnHoy(6, sin)).toBe(false);
    expect(muestraLaFilaEnHoy(7, { ...sin, invitacionDescartada: true })).toBe(false);
    expect(muestraLaFilaEnHoy(7, { ...sin, sobrenombre: 'Fénix' })).toBe(false);
    expect(muestraLaFilaEnHoy(7, null)).toBe(false);
    expect(muestraLaFilaEnHoy(undefined, sin)).toBe(false);
  });

  it('spec 046 FR-004: dice desde cuándo puede cambiarlo otra vez (D5), en español', () => {
    const ahora = new Date('2026-11-06T15:00:00Z');
    expect(textoDeLaEspera('2026-12-06T15:00:00Z', ahora)).toBe('Puedes cambiarlo de nuevo desde el 6 de diciembre.');
    expect(textoDeLaEspera('2026-11-01T15:00:00Z', ahora)).toBeNull();
    expect(textoDeLaEspera(null, ahora)).toBeNull();
  });
});

describe('los textos', () => {
  it('spec 046 FR-007: tipo oración, tuteo y nada en inglés', () => {
    const todos = Object.values(TEXTOS_DEL_SOBRENOMBRE).map(v => (typeof v === 'function' ? v('Fénix') : v));
    for (const texto of todos) expect(texto).not.toMatch(/\b(nickname|alias|username|post|save|cancel|ok)\b/i);
    expect(TEXTOS_DEL_SOBRENOMBRE.ayuda).toBe('Así te verán en el Muro. Tu mentor y el equipo siguen viendo tu nombre.');
  });
});
