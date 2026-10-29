// Hook SessionStart de Claude Code (.claude/settings.json): al abrir una sesión le dice al agente dónde está parado,
// sin que tenga que acordarse de leerlo (2026-10-29, learn-harness-engineering, lecciones 5 y 12).
//
// Solo LEE: la rama, los cambios sin commitear, «Siguiente paso» y «Pendientes» de PROGRESO.md, cómo están las
// funcionalidades y los bugs abiertos de GitHub. No cambia nada. Si GitHub no responde en 5 s, sigue sin los bugs.
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
  const pendientes = [...seccion(progreso, 'Pendientes').matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].replace(/[:.]$/, ''));

  let estados = '';
  try {
    const lista = JSON.parse(fs.readFileSync(path.join(RAIZ, 'funcionalidades.json'), 'utf8')).funcionalidades;
    const contar = (f) => lista.filter(f).length;
    estados =
      `${contar((x) => x.estado === 'en_curso')} en curso, ${contar((x) => x.estado === 'sin_verificar')} sin verificar, ` +
      `${contar((x) => x.publicacion?.app === 'falta_apk')} esperan APK`;
  } catch {
    estados = 'no se pudo leer funcionalidades.json';
  }

  const bugsJson = correr('gh', ['issue', 'list', '--label', 'bug', '--state', 'open', '--limit', '15', '--json', 'number,title']);
  const bugs = bugsJson ? JSON.parse(bugsJson) : null;

  const lineas = [
    'Estado al abrir la sesión (scripts/inicio-de-sesion.mjs; el detalle está en PROGRESO.md):',
    `- Rama: ${rama}${enWorktree ? ' (worktree)' : ''} · ${sinCommitear ? `${sinCommitear} ${sinCommitear === 1 ? 'archivo' : 'archivos'} sin commitear: no los mezcles con tu trabajo` : 'sin cambios sin commitear'}`,
    `- Siguiente paso: ${siguiente || '(PROGRESO.md no lo dice)'}`,
    `- Pendientes: ${pendientes.length ? pendientes.join(' · ') : 'ninguno anotado'}`,
    `- Funcionalidades: ${estados}`,
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
