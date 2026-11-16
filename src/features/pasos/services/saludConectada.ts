/**
 * Android: la salud conectada es Health Connect (spec 037, D-310). La plataforma se elige AQUÍ y en sus hermanos, y en ningún otro
 * lugar: `saludConectada.ts` (este, Android), `saludConectada.ios.ts` (iPhone: la app Salud de Apple, FR-016) y `saludConectada.web.ts`
 * (la web, sin salud). Metro toma el archivo de la plataforma; las tres tienen la misma forma, y quien las usa no ramifica por plataforma.
 */
export * from './saludDeHealthConnect';
