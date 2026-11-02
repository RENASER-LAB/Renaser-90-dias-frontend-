import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * El programa empieza mañana y la persona no elige nada (spec 036, D-309, cambio de gerencia del 2026-11-02: «el usuario no podrá elegir,
 * lo hará al día siguiente»). Esta prueba falla si en `src/` o en `App.tsx` vuelve a aparecer:
 *
 *  - un texto de «elegir el Día 1» («Elige tu Día 1», «Elegir mi Día 1», «Elige cuándo empiezas», «Todavía no elegiste tu Día 1»,
 *    «Confirmar mi Día 1», «Volver sin elegir»);
 *  - una lista, un selector o varias opciones para escoger la fecha de inicio: de lo que manda el servidor (`validStartDates`) solo se
 *    toma la primera —mañana—, nunca se recorre, y la pantalla de activación no dibuja opciones.
 *
 * Se barre el código sin comentarios (los comentarios cuentan la historia: «antes era «Elige tu Día 1»») y sin las pruebas.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..', '..');
const SRC = path.join(RAIZ, 'src');

function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function archivosDeCodigo(carpeta: string): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === '__tests__' || entrada.name === 'node_modules') continue;
      salida.push(...archivosDeCodigo(ruta));
    } else if (/\.tsx?$/.test(entrada.name) && !/\.(test|spec)\.tsx?$/.test(entrada.name)) {
      salida.push(ruta);
    }
  }
  return salida;
}

const ARCHIVOS = [...archivosDeCodigo(SRC), path.join(RAIZ, 'App.tsx')].filter(f => fs.existsSync(f));
const CODIGO = ARCHIVOS.map(archivo => ({
  archivo: path.relative(RAIZ, archivo),
  fuente: sinComentarios(fs.readFileSync(archivo, 'utf-8')),
}));

/** Los textos que la persona ya no ve: ninguno de los dos idiomas de la pantalla vieja (versales y tipo oración). */
const TEXTOS_PROHIBIDOS: RegExp[] = [
  /elige\s+tu\s+d[ií]a\s*(1|01|uno)\b/i,
  /elegir\s+mi\s+d[ií]a\s*(1|01|uno)\b/i,
  /confirmar\s+mi\s+d[ií]a\s*(1|01|uno)\b/i,
  /elige\s+cu[aá]ndo\s+empiezas/i,
  /todav[ií]a\s+no\s+elegiste\s+tu\s+d[ií]a/i,
  /volver\s+sin\s+elegir/i,
  /elige\s+la\s+fecha\s+de\s+inicio/i,
  /¿?qu[eé]\s+d[ií]a\s+quieres\s+empezar/i,
];

describe('el programa empieza mañana: la persona no elige su Día 1 (spec 036)', () => {
  it('el barrido encuentra el código de la app (si no, la prueba no vigila nada)', () => {
    expect(CODIGO.length).toBeGreaterThan(300);
    expect(CODIGO.some(c => c.archivo.endsWith('ActivarProgramaScreen.tsx'))).toBe(true);
  });

  it('ningún texto de la app dice «Elige tu Día 1», «Elegir mi Día 1» o parecido', () => {
    const culpables = CODIGO.flatMap(({ archivo, fuente }) =>
      TEXTOS_PROHIBIDOS.filter(patron => patron.test(fuente)).map(patron => `${archivo}: ${patron}`),
    );
    expect(culpables).toEqual([]);
  });

  it('de las fechas que manda el servidor solo se toma la primera (mañana): nunca se recorren ni se cuentan', () => {
    const usos = CODIGO.flatMap(({ archivo, fuente }) => {
      const encontrados: { archivo: string; despues: string }[] = [];
      for (let desde = fuente.indexOf('validStartDates'); desde >= 0; desde = fuente.indexOf('validStartDates', desde + 1)) {
        encontrados.push({ archivo, despues: fuente.slice(desde + 'validStartDates'.length, desde + 'validStartDates'.length + 14) });
      }
      return encontrados;
    });
    const esDeclaracion = (despues: string) => /^\s*:\s*(z\.array|string\[\])/.test(despues);
    const esLaPrimera = (despues: string) => /^\??\.?\[0\]/.test(despues);
    const culpables = usos.filter(u => !esDeclaracion(u.despues) && !esLaPrimera(u.despues)).map(u => `${u.archivo}: validStartDates${u.despues}`);
    expect(culpables).toEqual([]);
    // Hay al menos una lectura real de la primera fecha (si no, la regla no estaría vigilando nada).
    expect(usos.filter(u => esLaPrimera(u.despues)).length).toBeGreaterThan(0);
  });

  it('la pantalla de activación no dibuja opciones: ni lista, ni selector, ni radios, ni ruedas de fecha', () => {
    const pantalla = CODIGO.find(c => c.archivo.endsWith('ActivarProgramaScreen.tsx'));
    expect(pantalla).toBeDefined();
    const fuente = pantalla?.fuente ?? '';
    for (const prohibido of [
      '.map(',
      'FlatList',
      'SectionList',
      'OpcionElegible',
      'ControlSegmentado',
      'ChipDeOpcion',
      'Checkbox',
      'DatePicker',
      'HojaDesdeAbajo',
      'accessibilityRole="radio"',
      "accessibilityRole='radio'",
    ]) {
      expect(`${prohibido} => ${fuente.includes(prohibido)}`).toBe(`${prohibido} => false`);
    }
  });

  it('la activación del onboarding manda una sola fecha, la primera, o ninguna', () => {
    const activacion = CODIGO.find(c => c.archivo.endsWith('utils/activacionAlFirmar.ts'));
    expect(activacion).toBeDefined();
    expect(activacion?.fuente).toContain('validStartDates[0]');
  });
});
