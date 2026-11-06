/**
 * spec 045 FR-010 (decisión D8 del dueño, 2026-11-06): «el inglés con español se ve feo en una app».
 *
 * Barre `src/` y `App.tsx` buscando, en el código que se dibuja o se lee en voz alta (no en comentarios ni en nombres internos),
 * las palabras en inglés que se cambiaron: «Training» (la pestaña es «Entrenar», D5), «Ranking» (es «Tabla»), «Sticker»
 * (es «Figurita»), «Tickets» (son «Consultas»), «Mi onboarding» (es «Mis documentos») y «· auto» (es «· del teléfono»).
 *
 * Los nombres internos se quedan: la ruta `'Training'`, las claves `'ranking'`, `'onboarding'`, los nombres de archivos y tipos.
 * La única excepción es el prefijo técnico de las figuritas en el chat (`'Sticker Renaser: '`): viaja dentro del mensaje y las
 * versiones anteriores de la app lo usan para reconocerlas, así que no se puede cambiar sin romper los mensajes ya enviados.
 */
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '../..');

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/** Quita comentarios de bloque y de línea (sin tocar los `//` dentro de un texto con `://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** Textos entre comillas o entre `>` y `<` (JSX). */
function textos(codigo: string): string[] {
  const res: string[] = [];
  const rx = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\\n]|\\.)*)`|>([^<>{}\n]*[A-Za-zÁÉÍÓÚáéíóúñ][^<>{}\n]*)</g;
  for (const m of codigo.matchAll(rx)) res.push((m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').replace(/\$\{[^}]*\}/g, ''));
  return res;
}

const PROHIBIDOS: [string, RegExp][] = [
  ['Training', /\b(Training|TRAINING)\b/],
  ['Ranking', /\bRanking\b|\branking\b(?=\s)|\s\branking\b/],
  ['Sticker', /\b[Ss]tickers?\b/],
  ['Tickets', /\b[Tt]ickets?\b/],
  ['Mi onboarding', /Mi onboarding/],
  ['· auto', /· auto\b/],
  ['checklist', /\bchecklist\b/],
];

/** Lo que sí puede llevar la palabra: nombres internos sin espacios (rutas, claves) y el prefijo técnico del chat. */
function esNombreInterno(texto: string): boolean {
  if (texto === 'Sticker Renaser: ') return true;
  return !/\s/.test(texto.trim()) && /^[A-Za-z_./-]+$/.test(texto.trim()) && texto !== 'TRAINING' && texto !== 'Ranking';
}

describe('ningún texto en inglés en lo que se ve (spec 045 FR-010, D8)', () => {
  const lista = [...archivos(path.join(RAIZ, 'src')), path.join(RAIZ, 'App.tsx')];
  it.each(PROHIBIDOS)('no aparece «%s»', (_nombre, rx) => {
    const hallados: string[] = [];
    for (const archivo of lista) {
      for (const texto of textos(sinComentarios(fs.readFileSync(archivo, 'utf8')))) {
        if (rx.test(texto) && !esNombreInterno(texto) && !/^\/api\//.test(texto) && !/^(GET|POST|PUT|PATCH|DELETE|SSE) /.test(texto) && !/^\[\w+\] /.test(texto) && !/^[a-z]+\.[a-z.]+$/.test(texto)) {
          hallados.push(`${path.relative(RAIZ, archivo)}: ${texto.slice(0, 80)}`);
        }
      }
    }
    expect(hallados).toEqual([]);
  });
});
