import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Retroalimentación del 26/09.
 *
 * - **A-2, palabras simples.** En lo que se VE de mentoría y administración no aparecen «Cohorte»,
 *   «Recepción», «Staff», «Cumplimiento» ni «Sin datos» (glosario: Generación, Grupo de bienvenida,
 *   Equipo, Cuánto cumplió, Todavía sin actividad para medir). Los nombres de campos de la API y los
 *   identificadores del código no cambian: la prueba mira solo textos entre comillas y texto de JSX,
 *   con los comentarios quitados.
 * - **S-1, el indicador vacío.** Ninguna pantalla del mentor vuelve a decir «sin avance registrado»
 *   ni «Día por confirmar»: eran frases que salían de campos que el servidor nunca mandaba.
 */

const RAIZ = path.resolve(__dirname, '..', '..');
const CARPETAS = ['features/admin', 'features/mentor'];

function archivos(carpeta: string): string[] {
  const salida: string[] = [];
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__') salida.push(...archivos(ruta));
    } else if (/\.tsx?$/.test(e.name)) {
      salida.push(ruta);
    }
  }
  return salida;
}

/** El código sin comentarios. Un `//` dentro de una URL entre comillas no se toca. */
function sinComentarios(texto: string): string {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(linea => linea.replace(/(^|[^:'"`])\/\/.*$/, '$1'))
    .join('\n');
}

/** Los textos que pueden verse: entre comillas, entre acentos graves, o texto suelto de JSX. */
function textosVisibles(codigo: string): string[] {
  const textos: string[] = [];
  for (const m of codigo.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`|>([^<>{}\n]+)</g)) {
    textos.push(m[1] ?? m[2] ?? m[3] ?? m[4] ?? '');
  }
  return textos;
}

const PROHIBIDAS: Array<{ patron: RegExp; en: string }> = [
  { patron: /\bCohorte\b|\bcohorte\b/, en: 'Generación' },
  { patron: /Recepción/, en: 'Grupo de bienvenida' },
  { patron: /\bStaff\b/, en: 'Equipo' },
  { patron: /\bCumplimiento\b|\bcumplimiento\b/, en: 'Cuánto cumplió' },
  { patron: /\bSin datos\b/, en: 'Todavía sin actividad para medir' },
  { patron: /sin avance registrado/i, en: '(S-1: el semáforo dice quién necesita ayuda)' },
  { patron: /Día por confirmar/, en: '(S-1: sin dato no se dice nada)' },
];

describe('palabras simples en mentoría y administración (A-2) y sin el indicador vacío (S-1)', () => {
  const lista = CARPETAS.flatMap(c => archivos(path.join(RAIZ, c)));

  it('revisa archivos de verdad', () => {
    expect(lista.length).toBeGreaterThan(30);
  });

  it('ningún texto visible usa las palabras del glosario viejo', () => {
    const problemas: string[] = [];
    for (const archivo of lista) {
      const textos = textosVisibles(sinComentarios(fs.readFileSync(archivo, 'utf8')));
      for (const texto of textos) {
        /* Rutas de la API y claves internas: no se ven. */
        if (/^\/api\/|^(GET|POST|PUT|PATCH|DELETE) \//.test(texto)) continue;
        for (const { patron, en } of PROHIBIDAS) {
          if (patron.test(texto)) problemas.push(`${path.relative(RAIZ, archivo)}: «${texto.trim()}» → ${en}`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });
});
