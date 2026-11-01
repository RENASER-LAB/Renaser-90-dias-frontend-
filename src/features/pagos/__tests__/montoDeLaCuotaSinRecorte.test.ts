import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const leer = (relativa: string) => fs.readFileSync(path.resolve(__dirname, relativa), 'utf8');
const FICHA = leer('../components/PagosDeLaPersona.tsx');
const MI_INGRESO = leer('../components/FilaDeCuota.tsx');

/**
 * E2E de las formaciones (01/11/2026, issues #89 y #91). #89: al marcar una cuota como pagada y volver a pendiente, el monto de esa fila se dibujaba cortado
 * («US$ 1 00» en vez de «US$ 1 000»): un `Text` con `numberOfLines={1}` y `adjustsFontSizeToFit` conserva en Android la medida del ancho anterior cuando la
 * fila crece. #91: sin el autoajuste, el monto era lo único que se podía encoger (`flex: 1` / `flexShrink: 1`) y en 360 dp, con calendario, fecha y «Pendiente»,
 * quedaba más angosto que su texto y Android lo partía por la mitad del número («US$ 1 00» y debajo «0»). El monto no se encoge ni se achica de letra; si la fila
 * no cabe, lo que baja de renglón es el estado.
 */
describe('el monto de una cuota nunca se recorta ni se parte', () => {
  it.each([
    ['la ficha (Pagos)', FICHA],
    ['«Mi ingreso»', MI_INGRESO],
  ])('%s: sin `adjustsFontSizeToFit` ni `numberOfLines` en el monto', (_nombre, fuente) => {
    expect(fuente).not.toContain('adjustsFontSizeToFit');
    const monto = fuente.indexOf('visible.monto') >= 0 ? fuente.indexOf('visible.monto') : fuente.indexOf('cuota.monto');
    expect(monto).toBeGreaterThan(0);
    const texto = fuente.slice(Math.max(0, monto - 220), monto);
    expect(texto).not.toContain('numberOfLines');
  });

  it.each([
    ['la ficha (Pagos)', FICHA, 'cuotaMonto'],
    ['«Mi ingreso»', MI_INGRESO, 'monto'],
  ])('%s: el estilo del monto no se encoge (`flexShrink: 0`)', (_nombre, fuente, estilo) => {
    const linea = fuente.split('\n').find(l => new RegExp(`^\\s*${estilo}:\\s*\\{`).test(l));
    expect(linea).toBeDefined();
    expect(linea).toContain('flexShrink: 0');
    expect(linea).not.toMatch(/flexShrink: [1-9]/);
    expect(linea).not.toMatch(/\bflex: 1\b/);
  });

  it.each([
    ['la ficha (Pagos)', FICHA, 'cuotaFila'],
    ['«Mi ingreso»', MI_INGRESO, 'fila'],
  ])('%s: si la fila no cabe, baja el estado a otro renglón (`flexWrap: wrap`)', (_nombre, fuente, estilo) => {
    const linea = fuente.split('\n').find(l => new RegExp(`^\\s*${estilo}:\\s*\\{`).test(l));
    expect(linea).toBeDefined();
    expect(linea).toContain("flexWrap: 'wrap'");
  });

  it('el monto lleva un espacio duro entre el símbolo y la cifra y entre los miles (nunca se parte en un espacio)', () => {
    const dinero = leer('../utils/dinero.ts');
    expect(dinero).toContain("const ESPACIO_DURO = '\\u00a0'");
    expect(dinero).toMatch(/`\$\{simbolo\}\$\{ESPACIO_DURO\}\$\{numero\}`/);
  });
});
