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

config.resolver.blockList = [/\/graphify-out\/.*/];

module.exports = config;
