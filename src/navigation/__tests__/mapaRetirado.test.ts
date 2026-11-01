/**
 * El Mapa de Renacimiento se retiró de la app (spec 026, 2026-10-31: lo reemplaza la ficha con diagnóstico). Esta prueba lo vigila
 * de punta a punta, leyendo el código fuente: ninguna entrada al Mapa queda (la tarjeta de Hoy, la puerta de Plan, «Ir al Mapa»,
 * Yo → Mi onboarding, el botón flotante de SER, el radar, la navegación) ni código que lo importe.
 * Los datos que el servidor guarde del Mapa no se tocan: solo la app deja de ofrecerlo.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ_SRC = path.resolve(__dirname, '..', '..');
const RAIZ_APP = path.resolve(RAIZ_SRC, '..');

function archivos(dir: string, salida: string[] = []): string[] {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === '__tests__' || entrada.name === 'node_modules') continue;
      archivos(ruta, salida);
    } else if (/\.(ts|tsx)$/.test(entrada.name)) {
      salida.push(ruta);
    }
  }
  return salida;
}
const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('el Mapa de Renacimiento ya no está en la app', () => {
  const fuentes = [...archivos(RAIZ_SRC), path.join(RAIZ_APP, 'App.tsx')].map(ruta => ({
    ruta: path.relative(RAIZ_APP, ruta),
    codigo: sinComentarios(fs.readFileSync(ruta, 'utf-8')),
  }));

  it('la carpeta de la función se borró', () => {
    expect(fs.existsSync(path.join(RAIZ_SRC, 'features', 'mapa-renacimiento'))).toBe(false);
  });

  it('ningún archivo importa algo del Mapa', () => {
    const importan = fuentes.filter(f => /from ['"][^'"]*mapa-renacimiento[^'"]*['"]/.test(f.codigo)).map(f => f.ruta);
    expect(importan).toEqual([]);
  });

  it('ninguna pantalla, contexto ni navegador nombra su contexto, su flujo o sus identificadores', () => {
    const nombres = /MapaRenacimiento|useMapaRenacimientoAbierto|abrirMapa|mapaAbierto|useLecturaDelEstadoDelMapa|mapaHabilitado|consultarMapa|almacenMapa|useAccionesDelMapa|PuertaDelMapa/;
    const nombran = fuentes.filter(f => nombres.test(f.codigo)).map(f => f.ruta);
    expect(nombran).toEqual([]);
  });

  it('ningún texto que ve la persona habla del Mapa de Renacimiento', () => {
    const textos = /['"`][^'"`\n]*(Mapa de Renacimiento|Mapa de renacimiento|Hacer mi Mapa|Haz tu Mapa|Ir al Mapa|tu Mapa)[^'"`\n]*['"`]/;
    const hablan = fuentes.filter(f => textos.test(f.codigo)).map(f => f.ruta);
    expect(hablan).toEqual([]);
  });

  it('el overlay del Mapa ya no reemplaza a las pestañas en el navegador raíz ni envuelve la app', () => {
    const raiz = fuentes.find(f => f.ruta === path.join('src', 'navigation', 'RootNavigator.tsx'))!;
    const app = fuentes.find(f => f.ruta === 'App.tsx')!;
    expect(raiz.codigo).not.toMatch(/Mapa/);
    expect(app.codigo).not.toMatch(/Mapa/);
  });

  it('el flujo `mapa_dia7` ya no se pide al servidor ni se guarda', () => {
    const catalogo = fuentes.find(f => f.ruta === path.join('src', 'features', 'onboarding', 'data', 'catalogoPreguntas.ts'))!;
    expect(catalogo.codigo).not.toContain('mapa_dia7');
  });

  it('las pruebas end-to-end del Mapa se borraron; la del Día 1 sigue, en su carpeta', () => {
    expect(fs.existsSync(path.join(RAIZ_APP, 'e2e', 'mapa-poder'))).toBe(false);
    expect(fs.existsSync(path.join(RAIZ_APP, 'playwright.mapa.config.ts'))).toBe(false);
    expect(fs.existsSync(path.join(RAIZ_APP, 'e2e', 'dia-uno', 'dia-uno.spec.ts'))).toBe(true);
    expect(fs.existsSync(path.join(RAIZ_APP, 'playwright.dia-uno.config.ts'))).toBe(true);
  });
});
