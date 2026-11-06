// Cuenta los flujos de Maestro que existen pero nunca se corrieron en verde (2026-11-06, arnés propio).
//
// Por qué existe: muchos PR dejaban sus flujos «escritos y sin correr». No es evidencia, pero tampoco se veía cuántos
// había ni cuáles. La convención es simple y vive en la cabecera de cada flujo (las primeras líneas de comentario):
//   - `# corrido: AAAA-MM-DD`  → se corrió en verde ese día (cuenta como corrido);
//   - el texto «sin correr»    → escrito y nunca corrido;
//   - ninguna de las dos       → sin dato (flujos viejos: se marcan la próxima vez que se corran).
// Solo lee; no cambia nada. `--lista` imprime los nombres. Sale siempre con 0: es un tablero, no una puerta.
//
//   node scripts/flujos-sin-correr.mjs [--lista] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAESTRO = path.join(RAIZ, '.maestro');

function flujos(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'comun' ? [] : flujos(ruta);
    return /\.ya?ml$/.test(e.name) && !e.name.startsWith('comun') ? [ruta] : [];
  });
}

/** El estado de un flujo según su cabecera (comentarios antes del primer `---` o de la primera línea con código). */
export function estadoDelFlujo(texto) {
  const cabecera = [];
  for (const linea of texto.split('\n')) {
    if (linea.trim() === '---') break;
    if (linea.trim() === '' || linea.trimStart().startsWith('#')) cabecera.push(linea);
    else break;
  }
  const c = cabecera.join('\n');
  const corrido = c.match(/#\s*corrido:\s*(\d{4}-\d{2}-\d{2})/i);
  if (corrido) return { estado: 'corrido', fecha: corrido[1] };
  if (/sin correr/i.test(c)) return { estado: 'sin_correr' };
  return { estado: 'sin_dato' };
}

export function resumen() {
  const todos = flujos(MAESTRO).map((ruta) => ({ ruta: path.relative(RAIZ, ruta), ...estadoDelFlujo(fs.readFileSync(ruta, 'utf8')) }));
  const contar = (e) => todos.filter((f) => f.estado === e).length;
  return { total: todos.length, corridos: contar('corrido'), sinCorrer: contar('sin_correr'), sinDato: contar('sin_dato'), flujos: todos };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = resumen();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  } else {
    console.log(`Flujos de Maestro: ${r.total} · corridos en verde: ${r.corridos} · escritos y sin correr: ${r.sinCorrer} · sin dato: ${r.sinDato}`);
    if (process.argv.includes('--lista')) {
      for (const f of r.flujos.filter((x) => x.estado !== 'corrido')) console.log(`  ${f.estado === 'sin_correr' ? 'sin correr' : 'sin dato  '}  ${f.ruta}`);
    }
  }
}
