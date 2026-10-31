/**
 * #43: en el Ranking, «TÚ», el podio y «Tu posición» se deciden SOLO por el id de la cuenta. Un nombre no
 * identifica a nadie («Ana» está dentro de «Ana María»): comparar por nombre con `includes` marcaba a otra persona.
 *
 * Esta prueba lee el código y frena que vuelva la comparación por nombre en cualquiera de los dos lugares donde se
 * decide: la lógica del ranking y la pantalla de Comunidad (que arma las filas, el podio y «Tu posición»).
 * Contra el código de antes falla: ambos archivos buscaban `fullName.toLowerCase().includes(user.name…)`.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '../../../../..');
const leer = (relativa: string) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');

/** El código sin comentarios: la explicación de por qué NO se compara por nombre puede nombrarlo. */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('el ranking no compara por nombre (#43)', () => {
  const archivos = ['src/features/ranking/utils/tablasDeRanking.ts', 'src/screens/ComunidadScreen.tsx'];

  it.each(archivos)('%s no busca a la persona por el nombre de la fila', archivo => {
    const codigo = sinComentarios(leer(archivo));
    // `fullName.toLowerCase()…` y `.includes(user…name…)` son las dos formas que tenía el `includes` por nombre.
    expect(codigo).not.toMatch(/fullName\s*\.\s*toLowerCase\s*\(\)\s*\.\s*includes/);
    expect(codigo).not.toMatch(/\.includes\(\s*(?:user|quien)\??\.name/);
  });

  it('la pantalla decide con las funciones de id y no le pasa el nombre a quien busca', () => {
    const pantalla = sinComentarios(leer('src/screens/ComunidadScreen.tsx'));
    expect(pantalla).toMatch(/nombreEnElRanking\(/);
    expect(pantalla).toMatch(/esMiEntrada\(/);
    expect(pantalla).toMatch(/miEntradaEnLaTabla\(apiRankingEntries, \{ id: user\?\.id \}\)/);
  });
});
