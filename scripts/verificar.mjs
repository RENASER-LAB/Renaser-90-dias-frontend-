// Verificación estándar de la app: el mismo camino para cualquier persona o el CI (2026-11-06).
//
//   npm run verificar                     parches de postinstall + tipos + Jest completo + trazabilidad + Maestro (conteo)
//   npm run verificar -- --rapido         parches + tipos + solo las pruebas de lo cambiado respecto de origin/master
//   npm run verificar -- --e2e [flujo…]   lo anterior + la suite de Maestro en el emulador (.maestro/correr.sh)
//   npm run verificar -- --ci             lo que corre el CI: sin detección de máquina ocupada; lo que no aplica en el
//                                         CI (la trazabilidad, que corre en el CI del backend) no cuenta como pendiente
//   --forzar                              corre lo pesado aunque parezca que otra sesión tiene la máquina
//
// Por qué existe: cada sesión verificaba a su manera, y varios PR explicaron a mano el mismo falso rojo (al
// `node_modules` compartido le faltaba un parche de postinstall). Acá los parches se aplican primero; los scripts son
// idempotentes: si el parche ya está, no tocan nada.
//
// Salida: 0 = todo corrió y pasó; 1 = algo falló; 2 = nada falló pero quedó algo sin correr (eso NO es «en verde»).
// Al final imprime un resumen para pegar en el PR como evidencia.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resumen as resumenDeMaestro } from './flujos-sin-correr.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcion = (o) => args.includes(o);
const RAPIDO = opcion('--rapido');
const E2E = opcion('--e2e');
const CI = opcion('--ci') || process.env.CI === 'true';
const FORZAR = opcion('--forzar') || CI;
const flujos = args.filter((a) => !a.startsWith('--'));

/** ok: true (pasó), false (falló), null (sin correr: impide el verde), 'na' (no aplica aquí: neutro), 'info'. */
const resultados = [];

function correr(nombre, comando, argumentos, opciones = {}) {
  console.log(`\n▶ ${nombre}`);
  const inicio = Date.now();
  const r = spawnSync(comando, argumentos, { cwd: RAIZ, stdio: 'inherit', ...opciones });
  const ok = r.status === 0;
  resultados.push({ nombre, ok, segundos: Math.round((Date.now() - inicio) / 1000) });
  return ok;
}

function anotar(nombre, ok, motivo) {
  console.log(`\n– ${nombre}: ${motivo}`);
  resultados.push({ nombre, ok, motivo });
}

/** Procesos que dicen que otra sesión está usando la máquina para algo pesado. */
function maquinaOcupada() {
  if (CI) return [];
  const señales = [
    ['qemu-system', 'un emulador de Android'],
    ['\\.maestro/(bin|lib)', 'Maestro'],
    ['GradleDaemon', 'una compilación de Gradle'],
  ];
  const vistas = [];
  for (const [patron, nombre] of señales) {
    const r = spawnSync('pgrep', ['-f', patron], { encoding: 'utf8' });
    if (r.error) return []; // sin pgrep: no se puede saber, no se frena
    if (r.stdout.split('\n').some((pid) => pid && Number(pid) !== process.pid)) vistas.push(nombre);
  }
  return vistas;
}

function puedeCorrerLoPesado(queCosa) {
  const vistas = maquinaOcupada();
  if (!vistas.length || FORZAR) return true;
  anotar(queCosa, null, `sin correr: la máquina parece en uso (${vistas.join(', ')}). Pregunta a las otras sesiones; ` +
    'si es tuya, vuelve con --forzar. Mientras tanto, --rapido corre las pruebas de lo cambiado.');
  return false;
}

/** La carpeta del backend: RENASER_BACKEND, o un hermano `Renaser-90-dias-backend` de esta carpeta o del checkout principal. */
function carpetaDelBackend() {
  const candidatos = [process.env.RENASER_BACKEND];
  let dir = RAIZ;
  for (let i = 0; i < 6; i++) {
    candidatos.push(path.join(dir, '..', 'Renaser-90-dias-backend'));
    dir = path.dirname(dir);
  }
  return candidatos.find((c) => c && fs.existsSync(path.join(c, 'scripts', 'trazabilidad-specs.mjs')));
}

// 1. Parches de postinstall, los mismos de package.json y en el mismo orden. El `node_modules` puede ser compartido
// (los worktrees lo enlazan): con otra sesión probando no se toca y se avisa.
const postinstall = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).scripts.postinstall ?? '';
const parches = postinstall.split('&&').map((c) => c.trim().split(/\s+/)[1]).filter(Boolean);
const ocupada = maquinaOcupada();
if (ocupada.length && !FORZAR) {
  anotar('Parches de postinstall', null, `sin correr: no se tocan con la máquina en uso (${ocupada.join(', ')}). ` +
    'Si fallan alarmasTipoDespertador o escucharSonido, es esto');
} else {
  console.log('▶ Parches de postinstall en node_modules');
  const ok = parches.every((script) => spawnSync('node', [script], { cwd: RAIZ, stdio: 'inherit' }).status === 0);
  resultados.push({ nombre: 'Parches de postinstall', ok, segundos: 0 });
}

// 2. Tipos.
correr('Tipos (tsc --noEmit)', 'node', ['node_modules/typescript/bin/tsc', '--noEmit']);

// 3. Pruebas. Las reglas de código (src/__tests__/reglas) van dentro del Jest completo.
// En el CI, como antes (`npm test -- --ci`): un solo proceso. En una máquina compartida, dos.
const jest = ['node_modules/jest/bin/jest.js', ...(CI ? ['--ci', '--runInBand'] : ['--maxWorkers=2'])];
if (RAPIDO) {
  correr('Jest: lo cambiado respecto de origin/master', 'node', [...jest, '--changedSince=origin/master', '--passWithNoTests']);
  correr('Jest: reglas de código', 'node', [...jest, 'src/__tests__/reglas']);
  anotar('Jest completo', null, 'sin correr: --rapido no cierra nada');
} else if (puedeCorrerLoPesado('Jest completo')) {
  correr('Jest completo', 'node', jest);
}

// 4. Trazabilidad de specs: el script vive en el backend y lee las pruebas de esta app.
const backend = carpetaDelBackend();
if (backend) {
  // La tabla completa es larga: se imprime solo la última línea, o todo si falla (para saber qué requisito falta).
  // Se lee el backend TAL COMO ESTÁ en esa carpeta: si quedó atrás de su origin/master, puede faltar una spec nueva. Por
  // eso se dice qué commit se usó (otra carpeta: RENASER_BACKEND=<ruta>).
  const commitDelBackend = spawnSync('git', ['-C', backend, 'log', '-1', '--format=%h %cs'], { encoding: 'utf8' }).stdout.trim() || '?';
  console.log(`\n▶ Trazabilidad de specs (backend @ ${commitDelBackend})`);
  const r = spawnSync('node', [path.join(backend, 'scripts', 'trazabilidad-specs.mjs'), RAIZ], { cwd: RAIZ, encoding: 'utf8' });
  const salida = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  console.log(r.status === 0 ? salida.split('\n').pop() : salida);
  resultados.push({ nombre: `Trazabilidad de specs (${backend} @ ${commitDelBackend}: ${salida.split('\n').pop()})`, ok: r.status === 0, segundos: 0 });
} else {
  anotar('Trazabilidad de specs', CI ? 'na' : null, CI
    ? 'no aplica en el CI de la app: la corre el CI del backend (trazabilidad.yml) contra esta rama'
    : 'sin correr: no encontré el backend (pon RENASER_BACKEND=<ruta>)');
}

// 4b. Chequeos locales de cada desarrollador, si los tiene (.arnes/verificar-local.mjs, fuera de git). En el CI no existen.
const verificarLocal = path.join(RAIZ, '.arnes', 'verificar-local.mjs');
if (!CI && fs.existsSync(verificarLocal)) correr('Chequeos locales (.arnes)', 'node', [verificarLocal]);

// 5. Maestro: cuántos flujos hay sin correr (tablero, no puerta).
const m = resumenDeMaestro();
anotar('Flujos de Maestro', 'info',
  `${m.total} flujos · ${m.corridos} corridos en verde · ${m.sinCorrer} escritos y sin correr · ${m.sinDato} sin dato ` +
  '(node scripts/flujos-sin-correr.mjs --lista)');

// 6. E2E en el emulador.
if (E2E) {
  const faltan = ['E2E_APRENDIZ_EMAIL', 'E2E_APRENDIZ_PASSWORD', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'].filter((v) => !process.env[v]);
  const adb = spawnSync('adb', ['devices'], { encoding: 'utf8' });
  const hayEmulador = !adb.error && /\n\S+\tdevice/.test(adb.stdout);
  if (faltan.length) anotar('Maestro', null, `sin correr: faltan ${faltan.join(', ')} (viven en ~/.config/renaser-e2e/, nunca en el repo)`);
  else if (!hayEmulador) anotar('Maestro', null, 'sin correr: no hay emulador conectado. Nunca contra producción: backend local y build debug');
  else if (puedeCorrerLoPesado('Maestro')) correr(`Maestro (${flujos.length ? flujos.join(', ') : 'toda .maestro/regresion'})`, 'bash', ['.maestro/correr.sh', ...flujos]);
}

// Resumen para pegar en el PR.
const git = (a) => spawnSync('git', a, { cwd: RAIZ, encoding: 'utf8' }).stdout.trim();
console.log(`\n── Verificación · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${git(['rev-parse', '--abbrev-ref', 'HEAD'])} @ ${git(['rev-parse', '--short', 'HEAD'])}`);
for (const r of resultados) {
  const marca = r.ok === true ? '✔' : r.ok === false ? '✘' : r.ok === null ? '–' : '·';
  console.log(`${marca} ${r.nombre}${r.motivo ? ` — ${r.motivo}` : r.segundos ? ` (${r.segundos} s)` : ''}`);
}
const fallo = resultados.some((r) => r.ok === false);
const sinCorrer = resultados.some((r) => r.ok === null);
console.log(fallo ? '\nAlgo falló: no está terminado.' : sinCorrer ? '\nNada falló, pero hay pasos sin correr: dilo en el PR.' : '\nTodo en verde.');
process.exit(fallo ? 1 : sinCorrer ? 2 : 0);
