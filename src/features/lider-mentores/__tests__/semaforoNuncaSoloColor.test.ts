import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

/**
 * SC-008 de la spec 056: en las pantallas del líder, ningún estado del semáforo depende solo del color (WCAG 1.4.1). Toda pantalla o
 * pieza del líder que pinta un estado con color (el borde de un avatar o una barra de colores) también lo dice con su forma y su
 * símbolo: `EstadoConForma` o `ContadoresPorColor` (que usa `EstadoConForma`).
 *
 * Fuera de esta guarda, a propósito: la ficha de la persona (`mentor/components/FichaDePersona.tsx`), que es la de la 055 tal cual
 * (decisión del dueño del 18/11) y cuyos círculos de días llevan la palabra del estado para el lector de pantalla.
 */
const CARPETA = path.resolve(__dirname, '..');
const ARCHIVOS = ['screens', 'components']
  .flatMap(sub => fs.readdirSync(path.join(CARPETA, sub)).filter(a => a.endsWith('.tsx')).map(a => path.join(sub, a)));

const PINTA_COLOR = /<(AvatarConSemaforo|BarraDeColores)\b/;
const DICE_CON_FORMA = /<(EstadoConForma|ContadoresPorColor)\b/;

describe('el semáforo del líder nunca va solo con color', () => {
  it.each(ARCHIVOS.filter(a => PINTA_COLOR.test(fs.readFileSync(path.join(CARPETA, a), 'utf8'))))(
    '%s pinta un estado con color y también lo dice con forma y símbolo',
    archivo => { // spec 056 SC-008
      const fuente = fs.readFileSync(path.join(CARPETA, archivo), 'utf8');
      expect({ archivo, conForma: DICE_CON_FORMA.test(fuente) }).toEqual({ archivo, conForma: true });
    },
  );

  it('la guarda revisa algo: hay pantallas del líder que pintan estados con color', () => { // spec 056 SC-008
    expect(ARCHIVOS.filter(a => PINTA_COLOR.test(fs.readFileSync(path.join(CARPETA, a), 'utf8'))).length).toBeGreaterThan(2);
  });
});
