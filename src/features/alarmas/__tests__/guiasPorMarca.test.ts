/**
 * Spec 007, historia 2 (T020): la guía de batería de cada marca.
 *
 * Contra el código de antes falla: `marcaDelTelefono.ts` y `data/guiasPorMarca.ts` no existían. La guía de
 * Yo → Alarmas decía a todos «Batería → Sin restricciones», que en Honor y Huawei no existe: ahí lo que
 * borra las alarmas es «Gestionar automáticamente» en «Inicio de aplicaciones».
 */
import { describe, expect, it } from '@jest/globals';

import { GUIAS_POR_MARCA, lineaDeLaGuia, TEXTO_DE_BATERIA } from '../data/guiasPorMarca';
import { marcaDelTelefono, type MarcaDelTelefono } from '../utils/marcaDelTelefono';

/** Lo que dice `data-model.md` §Guía por marca, palabra por palabra. */
const LINEA_HONOR_Y_HUAWEI = 'Inicio de aplicaciones → Renaser → apaga «Gestionar automáticamente» y deja todo encendido.';
const LINEA_XIAOMI = 'Inicio automático → activa Renaser. En Ahorro de batería elige «Sin restricciones».';
const LINEA_SAMSUNG = 'Batería → Renaser → «Sin restricciones», y sácala de «Apps en suspensión».';
const LINEA_OPPO = 'Inicio automático → activa Renaser, y en Batería permite la actividad en segundo plano.';
const LINEA_VIVO = 'Inicio automático / Segundo plano → permite Renaser.';

function lineaPara(Manufacturer: string, Brand: string): string {
  return lineaDeLaGuia(marcaDelTelefono({ Manufacturer, Brand }, 'android'));
}

describe('la línea de la guía según Manufacturer y Brand', () => {
  it.each([
    ['HONOR', 'HONOR', LINEA_HONOR_Y_HUAWEI],
    ['HUAWEI', 'HUAWEI', LINEA_HONOR_Y_HUAWEI],
    // Honor de cuando todavía era una submarca de Huawei: el fabricante dice HUAWEI y la marca, HONOR.
    ['HUAWEI', 'HONOR', LINEA_HONOR_Y_HUAWEI],
    ['Xiaomi', 'Xiaomi', LINEA_XIAOMI],
    ['Xiaomi', 'Redmi', LINEA_XIAOMI],
    ['Xiaomi', 'POCO', LINEA_XIAOMI],
    ['samsung', 'samsung', LINEA_SAMSUNG],
    ['OPPO', 'OPPO', LINEA_OPPO],
    ['realme', 'realme', LINEA_OPPO],
    ['OnePlus', 'OnePlus', LINEA_OPPO],
    ['vivo', 'vivo', LINEA_VIVO],
    ['vivo', 'iQOO', LINEA_VIVO],
    ['iQOO', 'iQOO', LINEA_VIVO],
  ])('%s / %s', (fabricante, marca, linea) => {
    expect(lineaPara(fabricante, marca)).toBe(linea);
  });

  it('otra marca ve el texto genérico de siempre', () => {
    expect(lineaPara('Google', 'google')).toBe(TEXTO_DE_BATERIA);
    expect(lineaPara('Motorola', 'motorola')).toBe(TEXTO_DE_BATERIA);
  });

  it('sin datos del teléfono (iOS, web, módulo ausente) es la genérica', () => {
    expect(marcaDelTelefono({ Manufacturer: 'HONOR', Brand: 'HONOR' }, 'ios')).toBe('otra');
    expect(marcaDelTelefono({ Manufacturer: 'HONOR', Brand: 'HONOR' }, 'web')).toBe('otra');
    expect(marcaDelTelefono(null, 'android')).toBe('otra');
    expect(marcaDelTelefono({}, 'android')).toBe('otra');
    expect(marcaDelTelefono({ Manufacturer: 12 as unknown as string, Brand: null as unknown as string }, 'android')).toBe('otra');
  });

  it('el genérico es el texto de antes, sin cambiar una palabra', () => {
    expect(TEXTO_DE_BATERIA).toBe(
      'Para que tus alarmas no se borren, en Batería elige «Sin restricciones» y no cierres Renaser a la fuerza.',
    );
  });

  it('cada marca reconocida tiene su línea; Honor y Huawei comparten la suya', () => {
    const marcas: MarcaDelTelefono[] = ['honor', 'huawei', 'xiaomi', 'samsung', 'oppo', 'vivo', 'otra'];
    expect(Object.keys(GUIAS_POR_MARCA).sort()).toEqual([...marcas].sort());
    expect(GUIAS_POR_MARCA.honor).toBe(GUIAS_POR_MARCA.huawei);
  });
});

describe('los textos son cortos y en tuteo («mucho texto marea al usuario»)', () => {
  const frases = (t: string) => t.split(/[.!?](\s|$)/).filter(x => x.trim().length > 1).length;
  /* Sin `\b`: la palabra termina en una vocal con tilde y `\b` no la ve como parte de la palabra. */
  const VOSEO = /(?<!\p{L})(tenés|querés|podés|elegí|apagá|activá|dejá|entrá|sacá|permití|hacé|mirá|abrí|cerrá|andá|fijate|vos)(?!\p{L})/iu;

  it.each(Object.entries(GUIAS_POR_MARCA))('%s: a lo más dos frases, ≤ 120 caracteres, sin voseo', (_marca, linea) => {
    expect(frases(linea)).toBeLessThanOrEqual(2);
    expect(linea.length).toBeLessThanOrEqual(120);
    expect(linea).not.toMatch(VOSEO);
  });
});
