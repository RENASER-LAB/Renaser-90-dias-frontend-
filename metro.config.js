// Configuración de Metro. Extiende la de Expo; lo único propio es la exclusión de abajo.
//
// POR QUÉ EXISTE ESTE ARCHIVO
//
// `graphify watch` corre en segundo plano y reescribe `graphify-out/` (graph.json, graph.html,
// GRAPH_REPORT.md) cada vez que rehace el grafo. Esa carpeta vive DENTRO del proyecto, y sin este
// archivo Metro vigila todo el directorio: cada rebuild del grafo le parecía un cambio de código y
// **recargaba la app entera**.
//
// El síntoma era desconcertante y costó ubicarlo (2026-09-23): probando en el emulador, la app se
// ponía en blanco y volvía a HOY a mitad de camino, sin ningún error de JavaScript en el log. Se
// confundió con un crash del código que se estaba probando. Lo que decía la verdad era el log del
// proceso: `Destroying ReactInstance` seguido de `Running "main"` — eso no es un crash, es una
// recarga. Y el disparador estaba en `~/.cache/graphify-rebuild.log`.
//
// `graphify-out/` ya está en `.gitignore`, pero eso a Metro no le dice nada: ignora lo que le
// ponen en `blockList`, no lo que ignora git.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// `.claude/worktrees/` guarda las copias de trabajo de los agentes, cada una con su node_modules:
// vigilarlas agotaba el límite del sistema (`ENOSPC: System limit for number of file watchers
// reached`) y Metro se caía al arrancar (2026-09-30).
config.resolver.blockList = [/\/graphify-out\/.*/, /\/\.claude\/.*/];

// El fénix vivo (`assets/rive/phoenix_master_v3_3.riv`, 2026-10-06): Metro no conoce la extensión `.riv` y sin esto
// el `require` del archivo no se resuelve («Unable to resolve module ...riv»). Va como asset, igual que un PNG.
config.resolver.assetExts.push('riv');

module.exports = config;
