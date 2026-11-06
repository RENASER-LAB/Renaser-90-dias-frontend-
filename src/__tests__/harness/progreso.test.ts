import { describe, expect, it } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * `PROGRESO.md` es lo primero que lee una sesión nueva (y lo que le pone el hook de inicio): tiene que ser corto y tener
 * siempre las mismas secciones, o el hook y las personas dejan de encontrar el «siguiente paso». Lo viejo se borra: ya
 * queda en git.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const progreso = fs.readFileSync(path.join(RAIZ, 'PROGRESO.md'), 'utf8');

describe('PROGRESO.md', () => {
  it('no pasa de 150 líneas', () => {
    expect(progreso.split('\n').length).toBeLessThanOrEqual(150);
  });

  it.each(['## Estado verificado', '## Siguiente paso', '## A medias o pendiente', '## Sesiones'])('tiene la sección «%s»', (s) => {
    expect(progreso).toContain(s);
  });
});

describe('scripts/flujos-sin-correr.mjs', () => {
  it('cuenta los flujos de Maestro y los suma bien', () => {
    const r = JSON.parse(execFileSync('node', [path.join(RAIZ, 'scripts', 'flujos-sin-correr.mjs'), '--json'], { encoding: 'utf8' }));
    expect(r.total).toBeGreaterThan(0);
    expect(r.corridos + r.sinCorrer + r.sinDato).toBe(r.total);
  });
});
