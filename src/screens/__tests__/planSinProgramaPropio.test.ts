import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const PLAN = fs.readFileSync(path.resolve(__dirname, '../PlanScreen.tsx'), 'utf8');

/**
 * E2E de las formaciones (01/11/2026, issue #81): una cuenta del personal sin programa propio veía en Plan «Participante no encontrado: <id>» en dos
 * tarjetas, porque el servidor responde 404 a todo `/rocks/*` cuando no hay participación. Sin programa, Plan muestra la fila del programa propio y una
 * línea que lo explica; el selector de eje, el objetivo, «Esta semana» y las acciones no se dibujan.
 */
describe('Plan sin programa propio', () => {
  it('lo decide `/home` (no estar inscrito) y dice por qué no hay objetivos', () => {
    expect(PLAN).toContain('const sinProgramaPropio = resumen?.inscrito === false;');
    expect(PLAN).toMatch(/TEXTO_DE_PLAN_SIN_PROGRAMA =\s*'Tu plan se arma con tu programa\. Cuando elijas tu Día 1 podrás escribir tus objetivos y agendar tus acciones aquí\.'/);
  });

  it('la fila del programa propio sigue arriba de todo y lo demás solo se dibuja con programa', () => {
    const fila = PLAN.indexOf('<FilaDelProgramaPropio programa={programaPropio} />');
    const sin = PLAN.indexOf('{sinProgramaPropio ? (');
    const texto = PLAN.indexOf('{TEXTO_DE_PLAN_SIN_PROGRAMA}');
    const otraRama = PLAN.indexOf(') : (', sin);
    expect(fila).toBeGreaterThan(0);
    expect(sin).toBeGreaterThan(fila);
    expect(texto).toBeGreaterThan(sin);
    expect(otraRama).toBeGreaterThan(texto);
    for (const bloque of ['<ControlSegmentado', '<TarjetaDelObjetivo', '<PlanDelEje']) {
      const donde = PLAN.indexOf(bloque, sin);
      expect(donde).toBeGreaterThan(otraRama);
    }
  });

  it('quien tiene programa, aunque no haya elegido su Día 1, ve Plan como siempre: la condición es «no inscrito», no «día 0»', () => {
    expect(PLAN).not.toMatch(/sinProgramaPropio = .*diaPrograma/);
  });
});
