import { describe, expect, it } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Familias de errores que se repiten, convertidas en chequeos (arnés propio, 2026-11-06).
 *
 * Cada bloque nace de una familia de la bitácora del backend (`../Renaser-90-dias-backend/docs/BITACORA_ERRORES.md`) o de
 * los issues `bug` de este repo: lo que se repetía como «cómo evitarlo» en prosa, acá se ejecuta. El inventario completo,
 * con cuántas veces apareció cada familia, está en `docs/arnes/familias-de-errores.md`.
 *
 * Las violaciones que ya existían están en `excepciones.json`, con fecha e issue: esa lista solo se achica.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const EXC = JSON.parse(fs.readFileSync(path.join(__dirname, 'excepciones.json'), 'utf8'));
const rel = (p: string) => path.relative(RAIZ, p).split(path.sep).join('/');

function archivos(dir: string, filtro: (n: string) => boolean): string[] {
  const out: string[] = [];
  const pila = [path.join(RAIZ, dir)];
  while (pila.length) {
    const d = pila.pop()!;
    if (!fs.existsSync(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules') pila.push(p);
      } else if (filtro(e.name)) out.push(p);
    }
  }
  return out.sort();
}

const esPrueba = (f: string) => /__tests__|\.test\.|\.spec\./.test(f);
const CODIGO = [...archivos('src', (n) => /\.(ts|tsx)$/.test(n)), path.join(RAIZ, 'App.tsx')].filter((f) => !esPrueba(rel(f)));
/** El código sin comentarios, con los saltos de línea en su lugar (para dar el número de línea). */
const sinComentarios = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

describe('familia «fechas en UTC» (E-336, E-392, E-534, #108)', () => {
  it('un toISOString().slice(0, 10) solo sale de una fecha armada en UTC (Date.UTC, «T00:00:00Z», setUTC…)', () => {
    const malos: string[] = [];
    for (const f of CODIGO) {
      const lineas = sinComentarios(fs.readFileSync(f, 'utf8')).split('\n');
      lineas.forEach((l, i) => {
        if (!/toISOString\(\)\s*\.\s*(slice\(0,\s*10\)|substring\(0,\s*10\)|split\(['"]T['"]\))/.test(l)) return;
        const antes = lineas.slice(Math.max(0, i - 15), i + 1).join('\n');
        const enUtc = /Date\.UTC\(|T00:00:00Z|setUTC|getUTC/.test(antes) && !/new Date\(\)\s*\.toISOString/.test(l);
        if (!enUtc) malos.push(`${rel(f)}:${i + 1}`);
      });
    }
    // Con una hora local, toISOString() da el día de UTC: en Lima, de 19:00 a medianoche, ya es mañana (#108).
    expect(malos).toEqual([]);
  });

  it('nadie convierte un «YYYY-MM-DD» con new Date(\'…\') (se lee como medianoche UTC: en Lima es el día anterior)', () => {
    const malos = CODIGO.flatMap((f) =>
      sinComentarios(fs.readFileSync(f, 'utf8')).split('\n')
        .map((l, i) => (/new Date\(\s*['"`]\d{4}-\d{2}-\d{2}['"`]\s*\)/.test(l) ? `${rel(f)}:${i + 1}` : null))
        .filter((x): x is string => x !== null),
    );
    expect(malos).toEqual([]);
  });
});

describe('familia «diálogos muertos en la web» (E-144, E-606)', () => {
  it('el Alert se importa de src/components/Alerta, nunca de react-native (salvo las excepciones con su issue)', () => {
    const malos = CODIGO.filter((f) => !EXC.alertDeReactNative.archivos.includes(rel(f)))
      .filter((f) => /import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*['"]react-native['"]/.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect(malos).toEqual([]);
  });

  it('las excepciones de Alert siguen existiendo (si arreglaste una, bórrala de excepciones.json)', () => {
    const sobran = (EXC.alertDeReactNative.archivos as string[]).filter((a) => {
      const p = path.join(RAIZ, a);
      return !fs.existsSync(p) || !/\bAlert\b[^;]*from\s*['"]react-native['"]/.test(fs.readFileSync(p, 'utf8'));
    });
    expect(sobran).toEqual([]);
  });
});

describe('familia «pruebas que no corren» (E-27, E-256, E-430, E-489, #47)', () => {
  it('toda prueba de src/ se llama *.test.ts (jest.config.js no corre .test.tsx, .spec.ts ni .test.js: pasaría en verde sin correr)', () => {
    const sueltas = archivos('src', (n) => /\.(test|spec)\.(tsx?|jsx?)$/.test(n)).filter((f) => !f.endsWith('.test.ts')).map(rel);
    const enTests = archivos('src', (n) => /\.(tsx?|jsx?)$/.test(n))
      .filter((f) => /__tests__/.test(f) && !f.endsWith('.test.ts'))
      .filter((f) => /^\s*(it|test|describe)(\.each\([^)]*\))?\(\s*['"`]/m.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect([...sueltas, ...enTests]).toEqual([]);
  });
});

describe('familia «parches nativos que no llegan al APK» (E-637, E-403)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  const enPostinstall: string[] = (pkg.scripts.postinstall ?? '').split('&&').map((c: string) => c.trim().split(/\s+/)[1]).filter(Boolean);

  it('cada scripts/arreglar-*.js corre en postinstall, y cada script de postinstall existe', () => {
    const scripts = fs.readdirSync(path.join(RAIZ, 'scripts')).filter((n) => /^arreglar-.*\.js$/.test(n)).map((n) => `scripts/${n}`);
    expect(scripts.filter((s) => !enPostinstall.includes(s))).toEqual([]);
    expect(enPostinstall.filter((s) => !fs.existsSync(path.join(RAIZ, s)))).toEqual([]);
  });

  it('un parche al Kotlin/Java de un módulo precompilado (local-maven-repo) lleva ese módulo en buildFromSource', () => {
    const nm = path.join(RAIZ, 'node_modules');
    if (!fs.existsSync(nm)) return; // sin node_modules no se sabe qué módulos vienen precompilados
    const fuente: string[] = pkg.expo?.autolinking?.android?.buildFromSource ?? [];
    const faltan: string[] = [];
    for (const s of enPostinstall) {
      const t = fs.readFileSync(path.join(RAIZ, s), 'utf8');
      if (!/\.(kt|java)['"`]/.test(t)) continue; // solo parches nativos de Android
      for (const [, nombre] of t.matchAll(/['"`]((?:@[a-z0-9-]+\/)?expo-[a-z0-9-]+)['"`]/g)) {
        if (fs.existsSync(path.join(nm, nombre, 'local-maven-repo')) && !fuente.includes(nombre)) faltan.push(`${s} → ${nombre}`);
      }
    }
    // Sin buildFromSource, Gradle enlaza el .aar de local-maven-repo y el parche nunca entra al APK (E-637).
    expect([...new Set(faltan)]).toEqual([]);
  });
});

describe('familia «entorno» (E-52, E-62)', () => {
  it('ningún archivo de texto en git tiene finales de línea CRLF', () => {
    const lista = execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, encoding: 'utf8' }).split('\0').filter(Boolean)
      .filter((f) => /\.(ts|tsx|js|mjs|md|json|ya?ml|sh)$/.test(f) && !EXC.crlf.archivos.includes(f));
    const malos = lista.filter((f) => fs.existsSync(path.join(RAIZ, f)) && fs.readFileSync(path.join(RAIZ, f)).includes(13));
    expect(malos).toEqual([]);
  });
});

describe('excepciones.json', () => {
  it('cada lista tiene fecha y motivo', () => {
    for (const [k, v] of Object.entries(EXC)) {
      if (k.startsWith('$')) continue;
      const e = v as { fecha?: string; motivo?: string };
      expect(e.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect((e.motivo ?? '').length).toBeGreaterThan(10);
    }
  });
});
