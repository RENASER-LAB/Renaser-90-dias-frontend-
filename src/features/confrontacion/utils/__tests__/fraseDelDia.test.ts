/**
 * La frase de confrontación del día.
 *
 * Lo que de verdad hay que proteger acá no es "que devuelva una frase", sino las dos propiedades
 * que hacen que la función sea correcta con el tiempo:
 *
 * 1. **Siete distintas por semana** — es el pedido literal del dueño.
 * 2. **Derivada, no acumulada** — el mismo día siempre da la misma frase, y un día sin abrir la
 *    app no desfasa nada. Es la lección de E-91 aplicada a este módulo.
 */
import { describe, expect, it } from '@jest/globals';

import { FRASES_DE_CONFRONTACION } from '../../data/frasesDeConfrontacion';
import { fraseDelDia } from '../fraseDelDia';

describe('fraseDelDia', () => {
  it('da siete frases distintas en cualquier semana del programa', () => {
    // No solo la primera semana: se prueba también una semana del medio, que es donde un
    // `% 7` mal escrito empezaría a repetir.
    for (const primerDiaDeLaSemana of [1, 8, 29, 64, 85]) {
      const semana = [0, 1, 2, 3, 4, 5, 6].map(i => fraseDelDia(primerDiaDeLaSemana + i)?.id);
      expect(new Set(semana).size).toBe(7);
    }
  });

  it('el mismo día siempre da la misma frase — abrir la app diez veces no la cambia', () => {
    expect(fraseDelDia(12)).toBe(fraseDelDia(12));
    expect(fraseDelDia(12)?.id).toBe(fraseDelDia(12)?.id);
  });

  it('no se desfasa si alguien no abre la app en tres días', () => {
    // Éste es el test que falla contra un contador incremental: ahí, saltarse los días 6, 7 y 8
    // dejaría al día 9 mostrando la frase del 6. Derivado, el día 9 muestra la del 9.
    const sinSaltos = [6, 7, 8, 9].map(d => fraseDelDia(d)?.id);
    expect(fraseDelDia(9)?.id).toBe(sinSaltos[3]);
    expect(fraseDelDia(9)?.id).not.toBe(fraseDelDia(6)?.id);
  });

  it('recorre el catálogo entero y vuelve a empezar', () => {
    const total = FRASES_DE_CONFRONTACION.length;
    expect(fraseDelDia(1)?.id).toBe(FRASES_DE_CONFRONTACION[0].id);
    expect(fraseDelDia(total)?.id).toBe(FRASES_DE_CONFRONTACION[total - 1].id);
    expect(fraseDelDia(total + 1)?.id).toBe(FRASES_DE_CONFRONTACION[0].id);
  });

  it('cubre los 90 días sin devolver nunca vacío', () => {
    for (let dia = 1; dia <= 90; dia += 1) {
      expect(fraseDelDia(dia)?.texto).toBeTruthy();
    }
  });

  it('sin día de programa no inventa nada', () => {
    // Día 0 = cuenta aprobada pero el reloj sin arrancar. Mostrarle la frase del día 1 a alguien
    // que todavía no empezó sería mentirle sobre dónde está.
    expect(fraseDelDia(0)).toBeNull();
    expect(fraseDelDia(null)).toBeNull();
    expect(fraseDelDia(undefined)).toBeNull();
    expect(fraseDelDia(-3)).toBeNull();
    expect(fraseDelDia(Number.NaN)).toBeNull();
  });

  it('ninguna frase del catálogo está vacía ni repetida', () => {
    const ids = FRASES_DE_CONFRONTACION.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const frase of FRASES_DE_CONFRONTACION) {
      expect(frase.texto.trim().length).toBeGreaterThan(20);
    }
  });
});
