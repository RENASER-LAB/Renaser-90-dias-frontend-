/**
 * El Código Renaser con la brújula (`compass`) y no con la diana (rediseño de Plan, 2026-10-05). La diana
 * (`target`) queda solo en «Tus acciones» de Plan: en Hoy eran tres dianas para tres cosas distintas.
 *
 * Spec 016 (2026-10-29): la tarjeta aparte del Código Renaser (`TarjetaCodigoRenaser`) pasó a ser la mitad del Radar de la
 * tarjeta de hábitos. La brújula la decide `mitadDelRadar` (`icono`) y la dibuja `TarjetaHabitoYRadar` a 20.
 *
 * Contra el código anterior falla: la tarjeta dibujaba `target` («se queda hasta que entre `compass`», decía su cabecera).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const leer = (relativo: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', '..', relativo), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('Código Renaser', () => {
  it('lleva la brújula de 20, no la diana', () => {
    const decide = leer('features/radar/utils/mitadDelRadar.ts');
    expect(decide).not.toContain("'target'");
    expect(decide).toContain("icono: 'compass'");
    const dibuja = leer('features/home/components/TarjetaHabitoYRadar.tsx');
    expect(dibuja).not.toContain('name="target"');
    expect(dibuja).toMatch(/<Icon name=\{icono\} size=\{TAMANO_ICONO\.normal\}/);
  });
});
