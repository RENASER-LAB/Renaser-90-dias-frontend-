import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Hoy no inventa un dato cuando `/home` falla o no lo trae (pedido del dueño del 2026-10-05; el mismo
 * error que el «DÍA 1 DE 90» del 2026-09-07 y el «100 %» de coherencia del 2026-09-15).
 *
 * Contra el código anterior falla: había `resumen?.puntosLiga ?? 100` («100 pts» con el servidor caído),
 * `rachaActual ?? 0` y `rachaMaxima ?? 0` («0 días», «Récord histórico: 0 d»), y la tarjeta del Mapa
 * calculaba los días que quedan con `diaConocido ?? 0` («los próximos 90 días»).
 *
 * Y la fase (decisión del dueño, también del 2026-10-05): sin `/home` decía «Programa activo»
 * (`rotuloDeFase(resumen?.fase) || 'Programa activo'`). Ahora dice «—».
 *
 * Se lee el código sin comentarios: el comentario que cuenta qué había antes puede nombrarlo.
 */
const HOY = fs
  .readFileSync(path.resolve(__dirname, '..', 'HoyScreen.tsx'), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Hoy sin datos inventados', () => {
  it.each(['puntosLiga ?? 100', 'rachaActual ?? 0', 'rachaMaxima ?? 0', 'diaConocido ?? 0', 'calcularDiasQueQuedan(diaNumero)'])(
    'ya no rellena con «%s»',
    viejo => {
      expect(HOY).not.toContain(viejo);
    },
  );

  it('sin dato, los puntos, la racha y el récord dicen «—»', () => {
    expect(HOY).toMatch(/const puntosLiga = typeof resumen\?\.puntosLiga === 'number' \? resumen\.puntosLiga : null;/);
    expect(HOY).toMatch(/const rachaActual = typeof resumen\?\.rachaActual === 'number' \? resumen\.rachaActual : null;/);
    expect(HOY).toMatch(/const rachaMaxima = typeof resumen\?\.rachaMaxima === 'number' \? resumen\.rachaMaxima : null;/);
    expect(HOY).toContain("{puntosLiga ?? '—'} pts");
    expect(HOY).toContain("{rachaActual ?? '—'}");
    expect(HOY).toContain("Récord histórico: {rachaMaxima === null ? '—' : `${rachaMaxima} d`}");
    // «días» solo acompaña a una cifra.
    expect(HOY).toMatch(/\{rachaActual !== null && \(\s*<Text[^>]*>\{rachaActual === 1 \? 'día' : 'días'\}<\/Text>/);
  });

  it('sin fase, el nombre de la fase dice «—» y no «Programa activo»', () => {
    expect(HOY).not.toContain('Programa activo');
    expect(HOY).toContain('const faseNombre = rotuloDeFase(resumen?.fase);');
    expect(HOY).toContain("{faseNombre ?? '—'}");
    // El lector de pantalla no lee «raya»: dice que no hay dato.
    expect(HOY).toContain("accessibilityLabel={faseNombre === null ? 'Fase del programa: sin datos' : undefined}");
  });

  it('la tarjeta del Mapa usa la cuenta de la apertura del Mapa: sin día conocido, sin número', () => {
    expect(HOY).toMatch(/lapsoQueQueda\(\s*diasQueQuedanSiSeSabe\(\{ diaPrograma: resumen\?\.diaPrograma, inscrito: resumen\?\.inscrito, cargando: false \}\),?\s*\)/);
    expect(HOY).toContain('`Convierte lo aprendido en un plan claro para ${lapsoDelMapa}. 15–20 min.`');
    expect(HOY).not.toMatch(/los próximos \$\{/);
  });
});
