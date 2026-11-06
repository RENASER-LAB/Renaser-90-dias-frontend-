// Hook SessionStart de Claude Code (.claude/settings.json): al abrir una sesión le dice al agente dónde está parado,
// sin que tenga que acordarse de leerlo (2026-10-29, learn-harness-engineering, lecciones 5 y 12; al día con el arnés propio
// del 2026-11-06).
//
// Solo LEE: la rama, los cambios sin commitear, «Siguiente paso» y «A medias o pendiente» de PROGRESO.md, cuántos flujos
// de Maestro siguen sin correr y los bugs abiertos de GitHub. No cambia nada. Si GitHub no responde en 5 s, sigue sin los bugs.
// Nunca falla la sesión: ante cualquier error, sale en silencio.
//
// Sale en el formato de los hooks: `additionalContext` para el agente y una línea corta (`systemMessage`) para la
// persona. Para probarlo a mano: `node scripts/inicio-de-sesion.mjs`.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const correr = (comando, args, timeout = 5000) => {
  const r = spawnSync(comando, args, { cwd: RAIZ, encoding: 'utf8', timeout });
  return r.status === 0 ? r.stdout.trim() : null;
};

/** El cuerpo de una sección «## Título» de un markdown, sin líneas vacías de los bordes. */
function seccion(md, titulo) {
  const partes = md.split(/^## /m);
  const suya = partes.find((p) => p.startsWith(titulo));
  return suya ? suya.split('\n').slice(1).join('\n').trim() : '';
}

try {
  const rama = correr('git', ['rev-parse', '--abbrev-ref', 'HEAD']) ?? '?';
  const sinCommitear = (correr('git', ['status', '--porcelain']) ?? '').split('\n').filter(Boolean).length;
  const enWorktree = correr('git', ['rev-parse', '--git-dir'])?.includes('/worktrees/') ?? false;

  const progreso = fs.existsSync(path.join(RAIZ, 'PROGRESO.md')) ? fs.readFileSync(path.join(RAIZ, 'PROGRESO.md'), 'utf8') : '';
  const siguiente = seccion(progreso, 'Siguiente paso').replace(/\s*\n\s*/g, ' ');
  const pendientes = [...seccion(progreso, 'A medias o pendiente').matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].replace(/[:.]$/, ''));

  let maestro = '';
  try {
    const r = JSON.parse(correr('node', [path.join(RAIZ, 'scripts', 'flujos-sin-correr.mjs'), '--json']) ?? 'null');
    maestro = r ? `${r.total} flujos, ${r.sinCorrer} escritos y sin correr, ${r.sinDato} sin dato` : 'no se pudo contar';
  } catch {
    maestro = 'no se pudo contar';
  }

  const bugsJson = correr('gh', ['issue', 'list', '--label', 'bug', '--state', 'open', '--limit', '15', '--json', 'number,title']);
  const bugs = bugsJson ? JSON.parse(bugsJson) : null;

  // Grafo primero (arnés, 2026-11-06): el hook de graphify no corre en worktrees; se dice si está al día.
  const grafo = spawnSync('bash', [path.join(RAIZ, 'scripts', 'grafo-al-dia.sh'), '--estado'], { cwd: RAIZ, encoding: 'utf8', timeout: 5000 }).stdout?.trim() || 'graphify no disponible';

  const lineas = [
    'Estado al abrir la sesión (scripts/inicio-de-sesion.mjs; el detalle está en PROGRESO.md):',
    `- Rama: ${rama}${enWorktree ? ' (worktree)' : ''} · ${sinCommitear ? `${sinCommitear} ${sinCommitear === 1 ? 'archivo' : 'archivos'} sin commitear: no los mezcles con tu trabajo` : 'sin cambios sin commitear'}`,
    `- Siguiente paso: ${siguiente || '(PROGRESO.md no lo dice)'}`,
    `- Pendientes: ${pendientes.length ? pendientes.join(' · ') : 'ninguno anotado'}`,
    `- Grafo: ${grafo}. Navega con graphify query/path/explain ANTES de abrir archivos.`,
    `- Un PR no está listo sin npm run verificar en 0, el E2E de su spec y los logs del backend y logcat sin errores nuevos.`,
    `- Maestro: ${maestro} (un flujo sin correr no es evidencia)`,
    `- Bugs abiertos: ${bugs === null ? 'GitHub no respondió (gh issue list --label bug)' : bugs.length ? bugs.map((b) => `#${b.number} ${b.title}`).join(' · ') : 'ninguno'}`,
  ];

  const resumen =
    `Renaser · ${rama}${sinCommitear ? ` · ${sinCommitear} sin commitear` : ''}` +
    `${bugs ? ` · ${bugs.length} bugs abiertos` : ''} · ${pendientes.length} pendientes en PROGRESO.md`;

  process.stdout.write(
    JSON.stringify({
      systemMessage: resumen,
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lineas.join('\n') },
    }),
  );
} catch {
  // Un hook de inicio nunca debe trabar la sesión.
}
