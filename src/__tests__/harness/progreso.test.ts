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

describe('worktrees y grafo (arnés, 2026-11-06)', () => {
  const agents = fs.readFileSync(path.join(RAIZ, 'AGENTS.md'), 'utf8');

  it.each(['worktree-nuevo.sh', 'worktree-cerrar.sh', 'worktree-viejos.sh', 'grafo-al-dia.sh'])('scripts/%s existe, es ejecutable y su bash es válido', (s) => {
    const p = path.join(RAIZ, 'scripts', s);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).mode & 0o111).toBeTruthy();
    execFileSync('bash', ['-n', p]);
  });

  it('AGENTS.md manda a usar el grafo primero, a cerrar el worktree al fusionar y a revisar E2E y logs antes del PR', () => {
    expect(agents).toMatch(/graphify query/);
    expect(agents).toMatch(/scripts\/grafo-al-dia\.sh/);
    expect(agents).toMatch(/scripts\/worktree-cerrar\.sh/);
    expect(agents).toMatch(/no está listo sin el E2E de su spec/);
    expect(agents).toMatch(/logcat/);
  });

  it('el hook de inicio de sesión dice el estado del grafo', () => {
    expect(fs.readFileSync(path.join(RAIZ, 'scripts', 'inicio-de-sesion.mjs'), 'utf8')).toMatch(/grafo-al-dia\.sh/);
  });
});
