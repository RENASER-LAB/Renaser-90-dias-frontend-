import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const leer = (relativa: string) => fs.readFileSync(path.resolve(__dirname, relativa), 'utf8');
const FICHA = leer('../components/PagosDeLaPersona.tsx');
const MI_INGRESO = leer('../components/FilaDeCuota.tsx');

/**
 * E2E de las formaciones (01/11/2026, issue #89): al marcar una cuota como pagada y volver a pendiente, el monto de esa fila se dibujaba cortado
 * («US$ 1 00» en vez de «US$ 1 000»). Un `Text` con `numberOfLines={1}` y `adjustsFontSizeToFit` conserva en Android la medida del ancho anterior cuando la
 * fila crece (aparece la línea «La devolvió a pendiente…»). El monto ocupa el ancho que queda y, si no cupiera, baja de línea; nunca se recorta.
 */
describe('el monto de una cuota nunca se recorta', () => {
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

  it('en la ficha el monto toma el ancho que sobra (`flex: 1`) entre la fecha y el estado', () => {
    expect(FICHA).toMatch(/<Text style=\{\[t\.body, \{ color: c\.textStrong, fontSize: 17, flex: 1 \}\]\}>\s*\{visible\.monto\}/);
  });
});
