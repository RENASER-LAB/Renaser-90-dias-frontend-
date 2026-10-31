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

  it('los puntos ya no están en Hoy (2026-10-31): viven en Yo, que no inventa datos', () => {
    expect(HOY).not.toContain('puntosLiga');
    expect(HOY).not.toMatch(/\} pts/);
  });

  it('Coherencia y racha ya no están en Hoy (2026-10-31): viven en Yo, que no inventa datos', () => {
    expect(HOY).not.toContain('Coherencia');
    expect(HOY).not.toContain('Récord histórico');
    expect(HOY).not.toContain('rachaMaxima');
    expect(HOY).not.toContain('coherenciaScore');
  });

  it('la fase ya no está en Hoy (2026-10-31): vive en Yo; Hoy no dice «Programa activo» ni inventa una fase', () => {
    expect(HOY).not.toContain('Programa activo');
    expect(HOY).not.toContain('faseNombre');
    expect(HOY).not.toContain('Fase del programa');
  });

  it('la tarjeta del Mapa usa la cuenta de la apertura del Mapa: sin día conocido, sin número', () => {
    expect(HOY).toMatch(/lapsoQueQueda\(\s*diasQueQuedanSiSeSabe\(\{ diaPrograma: resumen\?\.diaPrograma, inscrito: resumen\?\.inscrito, cargando: false \}\),?\s*\)/);
    // Corregido 2026-10-27 (issue #37): dice de dónde salen los objetivos de Plan; la cuenta del lapso no cambia.
    expect(HOY).toContain('`Tu plan para ${lapsoDelMapa} empieza aquí: de este Mapa nacen tus objetivos. 15–20 min.`');
    expect(HOY).not.toMatch(/los próximos \$\{/);
  });
});
