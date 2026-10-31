import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { FUENTES_A_CARGAR, fuentes } from '../fuentes';

/**
 * La fuente de la app es UNA regla global, como un CSS global (2026-10-31, pedido del dueño): el nombre de la fuente se escribe en
 * un solo archivo, `src/theme/fuentes.ts`, y el resto de la app pide un ROL (`fuentes.regular`, `.media`, `.seminegrita`, `.negrita`,
 * `.display`) o usa los tokens `t.*`. Cambiar la fuente de toda la app es tocar ese archivo.
 *
 * Esta prueba falla si cualquier otro archivo de `src/` (también `App.tsx`, que solo pasa `FUENTES_A_CARGAR` a `useFonts`) escribe el
 * nombre de una fuente a mano: `Inter_400Regular`, `Jost_700Bold`, `Fraunces_600SemiBold`…
 */

const RAIZ_DEL_PROYECTO = path.resolve(__dirname, '..', '..', '..');
const SRC = path.join(RAIZ_DEL_PROYECTO, 'src');
const ESTE_ARCHIVO = path.resolve(__dirname, 'fuenteUnica.test.ts');
const LA_FUENTE = path.join(SRC, 'theme', 'fuentes.ts');

/** El nombre de un archivo de fuente de Expo: `Familia_400Regular`. Armado por partes para que esta prueba no se delate a sí misma. */
const NOMBRE_DE_FUENTE = new RegExp(`\\b(?:${['Inter', 'Jost', 'Fraunces'].join('|')})_[0-9]{3}[A-Za-z]*`);

function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules') continue;
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(ts|tsx|js|jsx)$/.test(entrada.name)) salida.push(ruta);
  }
  return salida;
}

describe('la fuente vive en un solo archivo', () => {
  it('ningún archivo de src/ (ni App.tsx) escribe el nombre de una fuente a mano, salvo theme/fuentes.ts', () => {
    const candidatos = [...archivos(SRC), path.join(RAIZ_DEL_PROYECTO, 'App.tsx')].filter(p => p !== LA_FUENTE && p !== ESTE_ARCHIVO);
    expect(candidatos.length).toBeGreaterThan(300);
    const infractores = candidatos
      .filter(p => NOMBRE_DE_FUENTE.test(fs.readFileSync(p, 'utf-8')))
      .map(p => path.relative(RAIZ_DEL_PROYECTO, p));
    expect(infractores).toEqual([]);
  });

  it('ningún estilo escribe `fontFamily` con un texto: siempre un rol de `fuentes` (o un token `t.*`)', () => {
    const literal = /fontFamily\s*[:=]\s*\{?\s*['"`]/;
    const infractores = archivos(SRC)
      .filter(p => p !== ESTE_ARCHIVO && p !== LA_FUENTE)
      .filter(p => literal.test(fs.readFileSync(p, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')))
      .map(p => path.relative(RAIZ_DEL_PROYECTO, p));
    expect(infractores).toEqual([]);
  });

  it('el paquete de Jost y el de Fraunces ya no están en el proyecto', () => {
    const paquete = JSON.parse(fs.readFileSync(path.join(RAIZ_DEL_PROYECTO, 'package.json'), 'utf-8')) as { dependencies: Record<string, string> };
    expect(paquete.dependencies['@expo-google-fonts/jost']).toBeUndefined();
    expect(paquete.dependencies['@expo-google-fonts/fraunces']).toBeUndefined();
    expect(paquete.dependencies['@expo-google-fonts/inter']).toBeDefined();
  });
});

describe('fuentes.ts', () => {
  it('tiene los cinco roles pedidos, todos de la misma familia', () => {
    expect(Object.keys(fuentes).sort()).toEqual(['display', 'media', 'negrita', 'regular', 'seminegrita']);
    for (const nombre of Object.values(fuentes)) expect(nombre).toMatch(/^Inter_[0-9]{3}[A-Za-z]+$/);
  });

  it('los pesos son los que dicen sus nombres', () => {
    expect(fuentes.regular).toMatch(/400/);
    expect(fuentes.media).toMatch(/500/);
    expect(fuentes.seminegrita).toMatch(/600/);
    expect(fuentes.negrita).toMatch(/700/);
  });

  it('todo rol tiene su archivo cargado (si no, el texto caería al tipo del sistema en silencio)', () => {
    for (const rol of Object.values(fuentes)) expect(FUENTES_A_CARGAR[rol]).toBeDefined();
  });

  it('`display` es la Bold porque el paquete no trae el corte Display', () => {
    expect(fuentes.display).toBe(fuentes.negrita);
  });

  it('los tokens de texto piden roles, no nombres: títulos grandes en display, párrafos en regular', () => {
    const tokens = fs.readFileSync(path.join(SRC, 'theme', 'tokens.ts'), 'utf-8');
    expect(tokens).toMatch(/hero: \{ fontFamily: fuentes\.display/);
    expect(tokens).toMatch(/screenTitle: \{ fontFamily: fuentes\.display/);
    expect(tokens).toMatch(/body: \{ fontFamily: fuentes\.regular/);
    expect(tokens).toMatch(/cardTitle: \{ fontFamily: fuentes\.seminegrita/);
  });
});
