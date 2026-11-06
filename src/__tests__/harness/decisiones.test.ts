import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * `docs/decisiones/` guarda lo que el dueño autorizó, decidió o mandó corregir (antes, dentro de `AGENTS.md`). La
 * regla de los cinco tabs depende de que un agente encuentre esas entradas desde el índice `README.md`, así que:
 *
 * - cada entrada (`## … — AAAA-MM-DD …`) de un archivo de tema tiene su fila en el índice, con ese archivo;
 * - el índice no enlaza archivos que no existen;
 * - cada fila tiene fecha, al menos un tab o área y el archivo.
 *
 * Si falla: agregaste una entrada sin su fila (súmala ARRIBA de la tabla del índice) o renombraste un archivo.
 */

const DIR = path.resolve(__dirname, '..', '..', '..', 'docs', 'decisiones');
const leer = (a: string) => fs.readFileSync(path.join(DIR, a), 'utf8');
const indice = leer('README.md');
const temas = fs.readdirSync(DIR).filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'reglas-historial.md');
const filas = indice.split('\n').filter((l) => /^\| \d{4}-\d{2}-\d{2} \|/.test(l));

describe('docs/decisiones: el índice cubre todas las entradas', () => {
  it('hay archivos de tema y filas', () => {
    expect(temas.length).toBeGreaterThan(5);
    expect(filas.length).toBeGreaterThan(100);
  });

  it.each(temas)('%s: cada entrada tiene su fila en el índice', (archivo) => {
    const entradas = leer(archivo)
      .split('\n')
      .filter((l) => l.startsWith('## ') && /\d{4}-\d{2}-\d{2}/.test(l));
    const suyas = filas.filter((f) => f.includes(`](${archivo})`));
    expect({ archivo, filas: suyas.length }).toEqual({ archivo, filas: entradas.length });
  });

  it('el índice solo enlaza archivos que existen', () => {
    const enlazados = new Set([...indice.matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => m[1]));
    for (const a of enlazados) expect(fs.existsSync(path.join(DIR, a))).toBe(true);
  });

  it('cada fila dice fecha, tabs y archivo', () => {
    for (const f of filas) {
      const celdas = f.split(' | ');
      expect(celdas.length).toBeGreaterThanOrEqual(6);
      expect(celdas[1].trim()).not.toBe('');
    }
  });
});
