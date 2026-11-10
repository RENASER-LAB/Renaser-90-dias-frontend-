/**
 * Spec 048 (FR-005), auditoría del 2026-11-10: sin señal, Comunidad → Tabla (el ranking) quedaba como un hueco en blanco: el
 * error de la lectura (`rankingError`) no se mostraba en ningún lado. La pantalla es demasiado grande para montarla en una
 * prueba; se comprueba en su código que el cuerpo del ranking va dentro de `SoloConConexion` (que dice «Necesitas conexión») y
 * que al volver la señal el ranking se pide de nuevo. Si falla: envuelve el cuerpo de la sección `ranking` en
 * `<SoloConConexion>` y deja `recargarRanking()` dentro del `alVolverLaConexion` de `ComunidadScreen`.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const fuente = fs.readFileSync(path.join(__dirname, '../../../screens/ComunidadScreen.tsx'), 'utf8');

function seccionDelRanking(): string {
  const inicio = fuente.indexOf("{seccionActiva === 'ranking' && !seccionEnMantenimiento && (");
  expect(inicio).toBeGreaterThan(-1);
  const fin = fuente.indexOf('</ScrollView>', inicio);
  return fuente.slice(inicio, fin);
}

describe('el ranking de Comunidad sin señal (spec 048)', () => {
  it('su cuerpo va dentro de SoloConConexion: dice «Necesitas conexión» en vez de un hueco en blanco', () => { // spec 048 FR-005
    const seccion = seccionDelRanking();
    const abre = seccion.indexOf('<SoloConConexion>');
    const cierra = seccion.indexOf('</SoloConConexion>');
    expect(abre).toBeGreaterThan(-1);
    expect(cierra).toBeGreaterThan(abre);
    // Todo lo que se lee del servidor (la tabla elegida, el podio, tu posición y la lista) queda adentro.
    for (const pieza of ['<ControlSegmentado', '<PodioRanking', 'Tu posición', 'rankingList.map']) {
      const donde = seccion.indexOf(pieza);
      expect(donde).toBeGreaterThan(abre);
      expect(donde).toBeLessThan(cierra);
    }
  });

  it('al volver la señal el ranking se pide de nuevo', () => { // spec 048 FR-005
    const efecto = fuente.slice(fuente.indexOf('alVolverLaConexion(() => {'));
    expect(efecto.slice(0, efecto.indexOf('}),'))).toMatch(/recargarRanking\(\)/);
  });
});
