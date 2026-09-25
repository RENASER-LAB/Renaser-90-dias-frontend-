#!/usr/bin/env node
/**
 * Arregla `expo-thinking-orbs` (0.2.x) para que funcione con el plugin de worklets de Expo 57.
 *
 * EL SÍNTOMA (2026-09-23), al abrir Hoy con el orbe:
 *   Render Error — undefined is not a function
 *   node_modules/expo-thinking-orbs/lib/commonjs/engine/orbits.js (23:30)  → (0, _core.hashD)(...)
 *
 * LA CAUSA. El build `commonjs` del paquete exporta arriba de todo (`exports.hashD = hashD;`), lo
 * que es válido porque `function hashD` se eleva. Pero `hashD` lleva `'worklet'`, y el plugin
 * `react-native-worklets/plugin` 0.10 la reescribe como `var hashD = (function(){...})()`, que YA NO
 * se eleva: cuando corre `exports.hashD = hashD`, `hashD` todavía es `undefined`.
 *
 * EL ARREGLO. Mover esas líneas `exports.X = X;` al FINAL de cada archivo del build `commonjs`, cuando
 * todas las funciones ya existen. Para las funciones normales no cambia nada (seguían siendo las
 * mismas); para las worklets, las exporta ya definidas. Es idempotente: correrlo dos veces no hace
 * nada la segunda.
 *
 * Corre en `postinstall`, así se reaplica después de cada `npm install`. Si el paquete publica una
 * versión que ya lo resuelve, este script no encuentra nada que mover y no toca nada.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', 'node_modules', 'expo-thinking-orbs', 'lib', 'commonjs');
const MARCA = '// [renaser] exports movidos al final (scripts/arreglar-thinking-orbs.js)';
const EXPORT_ELEVADO = /^exports\.(\w+) = \1;$/;

function archivosJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entrada => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return archivosJs(ruta);
    return entrada.name.endsWith('.js') ? [ruta] : [];
  });
}

function arreglar(ruta) {
  const texto = fs.readFileSync(ruta, 'utf8');
  if (texto.includes(MARCA)) return false;
  const lineas = texto.split('\n');
  const movidas = lineas.filter(linea => EXPORT_ELEVADO.test(linea));
  if (movidas.length === 0) return false;
  const resto = lineas.filter(linea => !EXPORT_ELEVADO.test(linea));
  const mapa = resto.findIndex(linea => linea.startsWith('//# sourceMappingURL='));
  const fin = mapa === -1 ? resto.length : mapa;
  resto.splice(fin, 0, MARCA, ...movidas);
  fs.writeFileSync(ruta, resto.join('\n'));
  return true;
}

if (!fs.existsSync(raiz)) {
  process.exit(0);
}
const cambiados = archivosJs(raiz).filter(arreglar);
if (cambiados.length > 0) {
  console.log(`[renaser] expo-thinking-orbs: exports reordenados en ${cambiados.length} archivo(s).`);
}
