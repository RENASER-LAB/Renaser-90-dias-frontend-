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

  it('sin día de programa NI fecha todavía no se sabe nada: no inventa la del día 1', () => {
    // Día 0 = cuenta aprobada pero el reloj sin arrancar. Sin fecha del calendario tampoco hay de dónde sacar una: null, como antes.
    expect(fraseDelDia(0)).toBeNull();
    expect(fraseDelDia(null)).toBeNull();
    expect(fraseDelDia(undefined)).toBeNull();
    expect(fraseDelDia(-3)).toBeNull();
    expect(fraseDelDia(Number.NaN)).toBeNull();
    expect(fraseDelDia(0, null)).toBeNull();
    expect(fraseDelDia(0, undefined)).toBeNull();
  });

  describe('sin día de programa, por la fecha del calendario (2026-11-01)', () => {
    const SIN_DIA = [0, null, undefined, -1, Number.NaN] as const;

    it('sale siempre: personal sin programa, Día 0 y sin Día 1 elegido', () => {
      for (const dia of SIN_DIA) {
        expect(fraseDelDia(dia, '2026-11-01')?.texto).toBeTruthy();
      }
    });

    it('siete frases distintas en cualquier semana, con las fechas de varios meses (también al cruzar el fin de mes y de año)', () => {
      for (const primerDia of ['2026-11-01', '2026-02-24', '2026-12-28', '2028-02-26']) {
        const semana = [0, 1, 2, 3, 4, 5, 6].map(i => {
          const [a, m, d] = primerDia.split('-').map(Number);
          const fecha = new Date(Date.UTC(a, m - 1, d + i)).toISOString().slice(0, 10);
          return fraseDelDia(0, fecha)?.id;
        });
        expect(new Set(semana).size).toBe(7);
      }
    });

    it('derivada: la misma fecha da siempre la misma frase y un día sin abrir la app no desfasa nada', () => {
      expect(fraseDelDia(0, '2026-11-01')).toBe(fraseDelDia(null, '2026-11-01'));
      const total = FRASES_DE_CONFRONTACION.length;
      const hoy = fraseDelDia(0, '2026-11-05')?.id;
      // Nueve días después vuelve a tocar la misma: no hay contador que se pueda perder.
      expect(fraseDelDia(0, '2026-11-14')?.id).toBe(hoy);
      expect(total).toBe(9);
    });

    it('días seguidos dan frases seguidas del catálogo, sin saltos', () => {
      const indice = (fecha: string) => FRASES_DE_CONFRONTACION.findIndex(f => f.id === fraseDelDia(0, fecha)?.id);
      const total = FRASES_DE_CONFRONTACION.length;
      expect(indice('2026-11-02')).toBe((indice('2026-11-01') + 1) % total);
      expect(indice('2027-01-01')).toBe((indice('2026-12-31') + 1) % total);
    });

    it('con día de programa manda el día, no la fecha', () => {
      expect(fraseDelDia(12, '2026-11-01')).toBe(fraseDelDia(12));
      expect(fraseDelDia(12, '2030-06-15')).toBe(fraseDelDia(12));
    });

    it('una fecha que no existe o mal escrita cuenta como «no se sabe»', () => {
      for (const mala of ['', '2026-02-31', '2026-13-01', '2026-11-1', '01/11/2026', 'hoy', '2026-11-01T10:00:00']) {
        expect(fraseDelDia(0, mala)).toBeNull();
      }
    });

    it('una fecha anterior a 1970 no rompe el índice', () => {
      expect(fraseDelDia(0, '1969-12-31')?.texto).toBeTruthy();
    });
  });

  it('ninguna frase del catálogo está vacía ni repetida', () => {
    const ids = FRASES_DE_CONFRONTACION.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const frase of FRASES_DE_CONFRONTACION) {
      expect(frase.texto.trim().length).toBeGreaterThan(20);
    }
  });
});
