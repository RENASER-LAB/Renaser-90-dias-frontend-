/**
 * Un rótulo de Hoy que comparte fila con algo a la derecha («Hábitos de hoy · 0/15», «Acciones y
 * objetivos · 0/0», «Última evidencia del muro · Hace 6 días») no puede ir suelto en esa fila.
 *
 * El 2026-10-05, en el emulador Android, Hoy mostraba «Acciones y» en lugar de «Acciones y
 * objetivos». Suelto en una fila `row` + `space-between`, el rótulo mide exactamente lo que su
 * texto, y con «Acciones y objetivos» Android lo partía en dos por una fracción de píxel: la segunda
 * línea quedaba fuera del alto de una y no se veía. Depende del texto exacto (los otros rótulos
 * caían por debajo del borde) y no pasa en la web ni en Jest, así que lo que se prueba es la forma:
 * el rótulo va dentro de un contenedor que crece (`flex: 1`) y no directamente en la fila.
 *
 * Contra el código anterior falla: los tres `<MicroLabel>` iban como hijos directos de
 * `encabezadoTarjeta` y `wallActivityHeader`, las dos filas `row` + `space-between`.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const HOY = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/HoyScreen.tsx'), 'utf-8'));

/** El cuerpo de `nombre: { … }` dentro de `StyleSheet.create`, o `null` si no está. */
function estilo(nombre: string): string | null {
  const encontrado = HOY.match(new RegExp(`\\n\\s*${nombre}:\\s*\\{([^}]*)\\}`));
  return encontrado ? encontrado[1] : null;
}

const esFilaRepartida = (cuerpo: string | null) =>
  cuerpo !== null && /flexDirection:\s*'row'/.test(cuerpo) && /justifyContent:\s*'space-between'/.test(cuerpo);

describe('Hoy: los rótulos que comparten fila no se cortan', () => {
  it('ningún <MicroLabel> es hijo directo de una fila row + space-between', () => {
    const sueltos = [...HOY.matchAll(/<View style=\{styles\.(\w+)\}>\s*<MicroLabel>([^<]*)<\/MicroLabel>/g)]
      .filter(([, nombre]) => esFilaRepartida(estilo(nombre)))
      .map(([, nombre, texto]) => `${texto} (en styles.${nombre})`);
    expect(sueltos).toEqual([]);
  });

  it('los tres rótulos con algo a la derecha van en el contenedor que crece', () => {
    for (const texto of ['Hábitos de hoy', 'Acciones y objetivos', 'Última evidencia del muro']) {
      const envuelto = new RegExp(`<View style=\\{styles\\.rotuloDeLaFila\\}>\\s*<MicroLabel>${texto}</MicroLabel>`);
      expect({ texto, envuelto: envuelto.test(HOY) }).toEqual({ texto, envuelto: true });
    }
    expect(estilo('rotuloDeLaFila')).toMatch(/flex:\s*1\b/);
  });
});
