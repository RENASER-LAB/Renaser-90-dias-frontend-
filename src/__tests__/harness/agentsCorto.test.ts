import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * `AGENTS.md` es el mapa del repo y cada sesión de un agente lo carga entero: tiene que seguir corto (arnés propio,
 * 2026-11-06).
 *
 * Hasta ese día tenía más de 6000 líneas y ~730 KB: el 95 % era el historial de lo que el dueño autorizó en cada tab,
 * mezclado con las reglas y con notas «Corregido…» encima de reglas viejas. Cada sesión gastaba decenas de miles de
 * tokens en leer historia antes de leer una regla, y lo importante quedaba en el medio, donde un modelo lo atiende
 * peor. El historial se movió tal cual a `docs/decisiones/` y estas pruebas frenan que vuelva:
 *
 * - `AGENTS.md` no pasa de 200 líneas ni de 20 KB.
 * - Una entrada del historial («Cambio por pedido del dueño — AAAA-MM-DD…», «Corrección — …», «Decisión del dueño — …»)
 *   no va en `AGENTS.md`: va al final de su archivo en `docs/decisiones/`, con su fila en el índice.
 * - Las reglas vigentes no llevan notas «> **Corregido …**»: la regla se reescribe y el rastro queda en la decisión.
 * - Lo que `AGENTS.md` cita (archivos y scripts del repo) existe: un mapa que apunta a lugares que no existen es peor
 *   que no tener mapa.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const agents = fs.readFileSync(path.join(RAIZ, 'AGENTS.md'), 'utf8');

describe('AGENTS.md corto', () => {
  it('no pasa de 200 líneas ni de 20 KB (si crece, lo nuevo va a un documento enlazado)', () => {
    expect(agents.split('\n').length).toBeLessThanOrEqual(200);
    expect(Buffer.byteLength(agents, 'utf8')).toBeLessThanOrEqual(20 * 1024);
  });

  it('no guarda entradas del historial de decisiones (van en docs/decisiones/, ver su README.md)', () => {
    const entrada =
      /(Cambio por pedido del dueño|Excepci[oó]n(es)? autorizada|Correcci[oó]n( autorizada)?|Decisi[oó]n del dueño)[^\n]{0,40}—\s*\d{4}-\d{2}-\d{2}/;
    expect(agents).not.toMatch(entrada);
  });

  it('las reglas vigentes no llevan notas «Corregido» (la regla se reescribe; el rastro va en la decisión)', () => {
    expect(agents).not.toMatch(/>\s*\*\*Corregido/);
  });

  it('cada archivo del repo que cita entre comillas invertidas existe', () => {
    const citados = [...agents.matchAll(/`((?:docs|scripts|src|\.github|\.maestro|\.specify)\/[^`\s*]+?\.(?:md|mjs|ts|yml|json))`/g)].map(
      (m) => m[1],
    );
    expect(citados.length).toBeGreaterThan(3);
    const faltan = citados.filter((c) => !fs.existsSync(path.join(RAIZ, c)));
    expect(faltan).toEqual([]);
  });
});
