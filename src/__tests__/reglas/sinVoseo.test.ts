import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Texto que ve el usuario: español de Perú, con tuteo (AGENTS.md, regla 6). El voseo nuevo es regresión.
 *
 * Hasta el 2026-11-13 solo lo cuidaban pruebas sueltas por pantalla, y «Pedí uno nuevo» se coló en los mensajes del código de
 * verificación del registro y de la recuperación de la contraseña (#191). Lo que se repite se vuelve chequeo (regla 10): esta
 * guarda recorre todo `src/` (sin pruebas) y busca, dentro de textos entre comillas, las formas de voseo más comunes.
 *
 * Si falla: cambia la palabra a tuteo («Pedí» → «Pide», «Revisá» → «Revisa», «tenés» → «tienes», «podés» → «puedes»).
 * Los comentarios no cuentan: la regla es sobre lo que ve la persona.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const rel = (p: string) => path.relative(RAIZ, p).split(path.sep).join('/');

// `\b` de JavaScript no entiende letras con tilde («Pedí» termina en «í»): los bordes de palabra van con \p{L} y la bandera `u`.
const VOSEO = /['"`][^'"`\n]*(?<!\p{L})(Pedí|Revisá|Tocá|Escribí|Elegí|Intentá|Probá|Volvé|Ingresá|Esperá|Fijate|Usá|Abrí|Cerrá|Mirá|Hacé|Decí|Poné|Andá|Vení|Contá|Buscá|Activá|Confirmá|Completá|Guardá|Agregá|tenés|podés|querés|sabés)(?!\p{L})/u;

function archivos(dir: string): string[] {
  const out: string[] = [];
  const pila = [path.join(RAIZ, dir)];
  while (pila.length) {
    const d = pila.pop()!;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__' && e.name !== 'node_modules') pila.push(p);
      } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) {
        out.push(p);
      }
    }
  }
  return out;
}

const esComentario = (linea: string) => /^\s*(\/\/|\*|\/\*)/.test(linea);

describe('Sin voseo en el texto de la app (#191)', () => {
  it('ningún texto entre comillas de src/ usa voseo', () => {
    const hallazgos: string[] = [];
    for (const f of archivos('src')) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((linea, i) => {
        const m = !esComentario(linea) && linea.match(VOSEO);
        if (m) hallazgos.push(`${rel(f)}:${i + 1} «${m[1]}» → pásalo a tuteo`);
      });
    }
    expect(hallazgos).toEqual([]);
  });

  it('la guarda detecta el caso que se coló (#191)', () => {
    expect(VOSEO.test("'El código no es válido o ya venció. Pedí uno nuevo.'")).toBe(true);
    expect(VOSEO.test("'El código no es válido o ya venció. Pide uno nuevo.'")).toBe(false);
  });
});
