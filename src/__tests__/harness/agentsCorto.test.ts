import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * `AGENTS.md` es el mapa del repo y se carga entero en cada sesión de un agente: tiene que seguir corto (2026-10-29).
 *
 * Hasta ese día tenía 2.552 líneas y 262 KB, y el 95 % era el historial de cambios autorizados por el dueño: cada
 * sesión arrancaba gastando ~60 000 tokens en leer historia antes de leer una sola regla. El historial se movió tal
 * cual a `docs/producto/` (un archivo por dominio y un índice), y estas pruebas frenan que vuelva a crecer:
 *
 * - `AGENTS.md` no pasa de 200 líneas ni de 16 KB (quedó en 150 y 12 KB).
 * - Una entrada de autorización («Cambio por pedido del dueño — AAAA-MM-DD…») no va en `AGENTS.md`, va en
 *   `docs/producto/<dominio>.md`.
 * - Cada entrada de `docs/producto/` tiene su fila en el índice `docs/producto/README.md`, y el índice no apunta a
 *   archivos que no existen: si no, el agente que busca lo autorizado en un tab no la encuentra.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const PRODUCTO = path.join(RAIZ, 'docs', 'producto');
const leer = (archivo: string) => fs.readFileSync(archivo, 'utf8');

const MAX_LINEAS = 200;
const MAX_BYTES = 16 * 1024;

describe('AGENTS.md corto', () => {
  const agents = leer(path.join(RAIZ, 'AGENTS.md'));

  it(`no pasa de ${MAX_LINEAS} líneas ni de ${MAX_BYTES / 1024} KB`, () => {
    expect(agents.split('\n').length).toBeLessThanOrEqual(MAX_LINEAS);
    expect(Buffer.byteLength(agents, 'utf8')).toBeLessThanOrEqual(MAX_BYTES);
  });

  it('no guarda entradas del historial de cambios autorizados (van en docs/producto/)', () => {
    const entrada =
      /(Cambio por pedido del dueño|Excepci[oó]n(es)? autorizada|Correcci[oó]n autorizada|Decisi[oó]n del dueño)[^\n]*—\s*\d{4}-\d{2}-\d{2}/;
    expect(agents).not.toMatch(entrada);
  });
});

describe('docs/producto: el índice cubre todas las entradas', () => {
  const indice = leer(path.join(PRODUCTO, 'README.md'));
  const dominios = fs.readdirSync(PRODUCTO).filter((f) => f.endsWith('.md') && f !== 'README.md');

  it('cada archivo de dominio tiene tantas filas en el índice como entradas', () => {
    for (const archivo of dominios) {
      const entradas = leer(path.join(PRODUCTO, archivo)).split('\n').filter((l) => l.startsWith('## ')).length;
      const filas = indice.split('\n').filter((l) => l.startsWith('| 2') && l.includes(`](${archivo})`)).length;
      expect({ archivo, filas }).toEqual({ archivo, filas: entradas });
    }
  });

  it('el índice solo enlaza archivos que existen', () => {
    const enlazados = [...indice.matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => m[1]);
    expect(enlazados.length).toBeGreaterThan(0);
    for (const archivo of new Set(enlazados)) expect(dominios).toContain(archivo);
  });
});
