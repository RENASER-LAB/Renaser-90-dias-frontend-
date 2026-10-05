/**
 * El Código Renaser con la brújula (`compass`) y no con la diana (rediseño de Plan, 2026-10-05). La diana
 * (`target`) queda solo en «Tus acciones» de Plan: en Hoy eran tres dianas para tres cosas distintas.
 *
 * Contra el código anterior falla: la tarjeta dibujaba `target` («se queda hasta que entre `compass`»,
 * decía su cabecera).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const fuente = fs
  .readFileSync(path.resolve(__dirname, '..', '..', 'features/radar/components/TarjetaCodigoRenaser.tsx'), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('Código Renaser', () => {
  it('lleva la brújula de 20, no la diana', () => {
    expect(fuente).not.toContain('name="target"');
    expect(fuente).toMatch(/<Icon name="compass" size=\{(20|TAMANO_ICONO\.normal)\}/);
  });
});
