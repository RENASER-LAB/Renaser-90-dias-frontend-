// Verificación estándar de la app: el mismo camino para cualquier sesión, persona o agente (2026-10-29).
//
//   npm run verificar                 parches de postinstall + tipos + Jest completo
//   npm run verificar -- --rapido     parches + tipos + solo las pruebas de lo cambiado respecto de origin/master
//   npm run verificar -- --e2e [flujo…]   lo anterior + la suite de Maestro en el emulador (.maestro/correr.sh)
//   --forzar                          corre lo pesado aunque parezca que otra sesión tiene la máquina
//
// Por qué existe: cada sesión verificaba a su manera, y cinco PR seguidos (#30, #32, #35, #36, #38) explicaron a mano
// el mismo falso rojo (`alarmasTipoDespertador`, `escucharSonido`: al `node_modules` compartido le faltaba el parche de
// postinstall). Acá los parches se aplican primero —los scripts son idempotentes: si el parche ya está, no tocan nada—.
//
// La máquina se comparte entre sesiones (AGENTS.md): el Jest completo y Maestro son pesados. Si hay un emulador,
// Maestro o Gradle corriendo, se frena antes de lo pesado y dice qué vio; si la máquina es tuya, `--forzar`.
// Al final imprime un resumen para pegar en el PR como evidencia. Sale con 1 si algo falló y con 2 si nada falló pero
// quedó algo sin correr: eso no es «en verde».
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcion = (o) => args.includes(o);
const RAPIDO = opcion('--rapido');
const E2E = opcion('--e2e');
const FORZAR = opcion('--forzar');
const flujos = args.filter((a) => !a.startsWith('--'));

const resultados = [];

function correr(nombre, comando, argumentos, opciones = {}) {
  console.log(`\n▶ ${nombre}`);
  const inicio = Date.now();
  const r = spawnSync(comando, argumentos, { cwd: RAIZ, stdio: 'inherit', ...opciones });
  const ok = r.status === 0;
  resultados.push({ nombre, ok, segundos: Math.round((Date.now() - inicio) / 1000) });
  return ok;
}

function saltar(nombre, motivo) {
  console.log(`\n– ${nombre}: ${motivo}`);
  resultados.push({ nombre, ok: null, motivo });
}

/** Procesos que dicen que otra sesión está usando la máquina para algo pesado. */
function maquinaOcupada() {
  const señales = [
    ['qemu-system', 'un emulador de Android'],
    ['\\.maestro/(bin|lib)', 'Maestro'], // el de ~/.maestro, no cualquier ruta que diga «.maestro» del repo
    ['GradleDaemon', 'una compilación de Gradle'],
  ];
  const vistas = [];
  for (const [patron, nombre] of señales) {
    const r = spawnSync('pgrep', ['-f', patron], { encoding: 'utf8' });
    if (r.error) return []; // sin pgrep (Windows): no se puede saber, no se frena
    const otros = r.stdout.split('\n').filter((pid) => pid && Number(pid) !== process.pid);
    if (otros.length) vistas.push(nombre);
  }
  return vistas;
}

function puedeCorrerLoPesado(queCosa) {
  const vistas = maquinaOcupada();
  if (!vistas.length || FORZAR) return true;
  saltar(
    queCosa,
    `parece que la máquina está en uso (${vistas.join(', ')}). Pregunta a las otras sesiones; si es tuya, ` +
      'vuelve a correr con --forzar. Mientras tanto, --rapido corre solo las pruebas de lo cambiado.',
  );
  return false;
}

// 1. Parches de postinstall: los mismos de package.json, en el mismo orden. El `node_modules` puede ser el del
// checkout principal (los worktrees lo enlazan): con otra sesión probando, cambiarlo le movería la app en plena
// prueba, así que en ese caso no se toca y se avisa.
const postinstall = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).scripts.postinstall;
const parches = postinstall.split('&&').map((c) => c.trim().split(/\s+/)[1]);
const ocupadaAlEmpezar = maquinaOcupada();
if (ocupadaAlEmpezar.length && !FORZAR) {
  saltar(
    'Parches de postinstall',
    `no se tocan con la máquina en uso (${ocupadaAlEmpezar.join(', ')}). Si fallan alarmasTipoDespertador o ` +
      'escucharSonido, es esto: corre otra vez cuando se libere',
  );
} else {
  let parchesOk = true;
  console.log('▶ Parches de postinstall en node_modules');
  for (const script of parches) {
    const r = spawnSync('node', [script], { cwd: RAIZ, stdio: 'inherit' });
    if (r.status !== 0) parchesOk = false;
  }
  resultados.push({ nombre: 'Parches de postinstall', ok: parchesOk, segundos: 0 });
}

// 2. Tipos.
correr('Tipos (tsc --noEmit)', 'node', ['node_modules/typescript/bin/tsc', '--noEmit']);

// 3. Pruebas.
const jest = ['node_modules/jest/bin/jest.js', '--runInBand'];
if (RAPIDO) {
  correr('Jest: lo cambiado respecto de origin/master', 'node', [...jest, '--changedSince=origin/master', '--passWithNoTests']);
  correr('Jest: reglas del harness', 'node', [...jest, 'src/__tests__/harness']);
} else if (puedeCorrerLoPesado('Jest completo')) {
  correr('Jest completo', 'node', jest);
}

// 4. E2E en el emulador.
if (E2E) {
  const faltan = ['E2E_APRENDIZ_EMAIL', 'E2E_APRENDIZ_PASSWORD', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'].filter(
    (v) => !process.env[v],
  );
  const adb = spawnSync('adb', ['devices'], { encoding: 'utf8' });
  const hayEmulador = !adb.error && /\n\S+\tdevice/.test(adb.stdout);
  if (faltan.length) {
    saltar('Maestro', `faltan ${faltan.join(', ')} (viven en ~/.config/renaser-e2e/, nunca en el repo)`);
  } else if (!hayEmulador) {
    saltar('Maestro', 'no hay un emulador conectado (adb devices). Nunca contra producción: backend local y build debug');
  } else if (puedeCorrerLoPesado('Maestro')) {
    correr(`Maestro (${flujos.length ? flujos.join(', ') : 'toda .maestro/regresion'})`, 'bash', ['.maestro/correr.sh', ...flujos]);
  }
}

// Resumen para pegar en el PR.
const rama = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).stdout.trim();
const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).stdout.trim();
console.log(`\n── Verificación · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${rama} @ ${commit}`);
for (const r of resultados) {
  const marca = r.ok === null ? '–' : r.ok ? '✔' : '✘';
  console.log(`${marca} ${r.nombre}${r.ok === null ? ` — sin correr: ${r.motivo}` : r.segundos ? ` (${r.segundos} s)` : ''}`);
}
const fallo = resultados.some((r) => r.ok === false);
const sinCorrer = resultados.some((r) => r.ok === null);
console.log(
  fallo ? '\nAlgo falló: no está terminado.' : sinCorrer ? '\nNada falló, pero hay pasos sin correr: dilo en el PR.' : '\nTodo en verde.',
);
// 1 = algo falló; 2 = nada falló pero faltó correr algo (no cuenta como verde); 0 = todo corrió y pasó.
process.exit(fallo ? 1 : sinCorrer ? 2 : 0);
