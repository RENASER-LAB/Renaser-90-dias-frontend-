import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { textoDelRecord } from '../textoDelRecord';

/** El récord de racha en Yo (2026-10-31, pedido del dueño): una línea chica bajo la Racha, «Récord: 3 días». */
describe('textoDelRecord', () => {
  it('«Récord: 3 días» y «Récord: 1 día»', () => {
    expect(textoDelRecord(3)).toBe('Récord: 3 días');
    expect(textoDelRecord(1)).toBe('Récord: 1 día');
    expect(textoDelRecord(0)).toBe('Récord: 0 días');
    expect(textoDelRecord(120)).toBe('Récord: 120 días');
  });
});

describe('Yo dibuja el récord bajo la Racha', () => {
  const YO = fs
    .readFileSync(path.resolve(__dirname, '..', '..', '..', '..', 'screens', 'YoScreen.tsx'), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('con el dato de /home (`rachaMaxima`) y sin él no se dibuja nada', () => {
    expect(YO).toMatch(/typeof resumen\?\.rachaMaxima === 'number' \? \(\s*<Text style=\{\[t\.small, styles\.statRecord, \{ color: c\.textSoft \}\]\}>\{textoDelRecord\(resumen\.rachaMaxima\)\}<\/Text>\s*\) : null/);
  });

  it('13 px, gris secundario y cifras tabulares, justo después de la Racha', () => {
    expect(YO).toMatch(/statRecord: \{ fontSize: 13, [^}]*fontVariant: \['tabular-nums'\] \}/);
    expect(YO.indexOf('<Text style={[t.small, styles.rotulo, { color: c.textSoft }]}>Racha</Text>')).toBeLessThan(YO.indexOf('textoDelRecord(resumen.rachaMaxima)'));
  });
});
