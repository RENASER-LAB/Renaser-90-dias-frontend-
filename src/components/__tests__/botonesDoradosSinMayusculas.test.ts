import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { ANTESALA_PACTO, GUIA_PRIMER_POST } from '../../features/sparkie/data/asistente';

/**
 * Ningún botón dorado escribe su texto en MAYÚSCULAS (decisión del dueño, 2026-11-02: «unificar todos al estilo nuevo»).
 *
 * Llevaban escritos en versales «LISTO», «CONFIRMAR MI DÍA 1», «CONTINUAR A TÉRMINOS», «ENTRAR A MI DÍA 01 (HOY)»… Ahora dicen
 * «Listo», «Confirmar mi Día 1», «Continuar a términos», «Entrar a mi Día 1 (hoy)». El estilo del botón (16 px, sin espaciado) lo
 * vigila `goldButtonTipoOracion`; acá se barre el código de la app buscando el texto que cada `<GoldButton>` recibe.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const SRC = path.join(RAIZ, 'src');

/** Sin comentarios: lo que se explica en ellos (el estilo viejo, «CANCELAR»…) no cuenta como código. */
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
    } else if (/\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name)) {
      salida.push(ruta);
    }
  }
  return salida;
}

/** Cada `<GoldButton …/>` del código, con el texto de sus atributos (hasta el primer `/>`). */
function botonesDelCodigo(): { archivo: string; elemento: string; label: string }[] {
  const archivos = [...archivosDeCodigo(SRC), path.join(RAIZ, 'App.tsx')].filter(f => fs.existsSync(f));
  const encontrados: { archivo: string; elemento: string; label: string }[] = [];
  for (const archivo of archivos) {
    const fuente = sinComentarios(fs.readFileSync(archivo, 'utf-8'));
    if (!fuente.includes('<GoldButton')) continue;
    let desde = 0;
    for (;;) {
      const inicio = fuente.indexOf('<GoldButton', desde);
      if (inicio < 0) break;
      const fin = fuente.indexOf('/>', inicio);
      const elemento = fuente.slice(inicio, fin < 0 ? undefined : fin + 2);
      desde = inicio + 1;
      encontrados.push({ archivo: path.relative(RAIZ, archivo), elemento, label: expresionDelLabel(elemento) });
    }
  }
  return encontrados;
}

/** Lo que va en `label=…`: un texto entre comillas o una expresión entre llaves (con las llaves bien cerradas). */
function expresionDelLabel(elemento: string): string {
  const inicio = elemento.search(/\blabel=/);
  if (inicio < 0) return '';
  const resto = elemento.slice(inicio + 'label='.length);
  if (resto[0] === '"' || resto[0] === "'") return resto.slice(0, resto.indexOf(resto[0], 1) + 1);
  if (resto[0] !== '{') return '';
  let nivel = 0;
  for (let i = 0; i < resto.length; i++) {
    if (resto[i] === '{') nivel++;
    if (resto[i] === '}' && --nivel === 0) return resto.slice(0, i + 1);
  }
  return resto;
}

/** Los textos literales de una expresión: "…", '…' y `…` (de la plantilla, sin lo que va en `${…}`). */
function literalesDe(expresion: string): string[] {
  const literales: string[] = [];
  for (const m of expresion.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
    literales.push((m[1] ?? m[2] ?? (m[3] ?? '').replace(/\$\{[^}]*\}/g, '')).trim());
  }
  return literales;
}

/** Siglas y nombres que van en mayúsculas aunque el resto del botón esté en tipo oración. */
const SIGLAS = new Set(['OK', 'SER', 'IA', 'TV', 'USD', 'SOS']);

function estaEnMayusculas(texto: string): boolean {
  const letras = texto.match(/\p{L}/gu) ?? [];
  if (letras.length < 2) return false;
  if (SIGLAS.has(texto.replace(/[^\p{L}]/gu, ''))) return false;
  return texto === texto.toLocaleUpperCase('es') && texto !== texto.toLocaleLowerCase('es');
}

/**
 * Archivos cuyo botón dorado todavía dice «✓ GUARDAR HORA» en esta rama: el selector de hora lo reescribe la rama
 * `hora-picker-compacto` (#97), que lo deja en «Guardar hora». Se retira de acá cuando esa rama se fusione; no se toca en esta
 * para no pisar su reescritura completa del archivo.
 */
const PENDIENTES_EN_OTRA_RAMA = new Set(['src/features/habits/components/HoraPickerModal.tsx']);

describe('ningún botón dorado escribe su texto en MAYÚSCULAS', () => {
  const botones = botonesDelCodigo();

  it('el barrido encuentra los botones de la app (si no, la prueba no vigila nada)', () => {
    expect(botones.length).toBeGreaterThan(40);
    expect(botones.filter(b => b.label !== '').length).toBe(botones.length);
  });

  it('ningún texto literal del `label` está en mayúsculas (salvo siglas)', () => {
    const culpables = botones
      .filter(b => !PENDIENTES_EN_OTRA_RAMA.has(b.archivo))
      .flatMap(b => literalesDe(b.label).filter(estaEnMayusculas).map(texto => `${b.archivo}: «${texto}»`));
    expect(culpables).toEqual([]);
  });

  it('nadie pasa el `label` a versales con `toUpperCase()` ni pide `textTransform` o espaciado al botón', () => {
    const culpables = botones.flatMap(b => {
      const problemas: string[] = [];
      if (/toUpperCase|toLocaleUpperCase/.test(b.elemento)) problemas.push('toUpperCase');
      if (/textTransform/.test(b.elemento)) problemas.push('textTransform');
      if (/letterSpacing:\s*[1-9]/.test(b.elemento)) problemas.push('letterSpacing positivo');
      return problemas.map(p => `${b.archivo}: ${p}`);
    });
    expect(culpables).toEqual([]);
  });

  it('los textos que llegan por una constante tampoco están en mayúsculas', () => {
    expect(estaEnMayusculas(ANTESALA_PACTO.boton)).toBe(false);
    expect(estaEnMayusculas(GUIA_PRIMER_POST.botonPrincipal)).toBe(false);
  });

  it('la prueba reconoce el estilo viejo y deja pasar el nuevo', () => {
    for (const viejo of ['LISTO', 'CONFIRMAR MI DÍA 1', 'ENTRAR A MI DÍA 01 (HOY)', '💬 ENVIAR MENSAJE DIRECTO 1 A 1', '✓ GUARDAR HORA']) {
      expect(estaEnMayusculas(viejo)).toBe(true);
    }
    for (const nuevo of ['Listo', 'Confirmar mi Día 1', 'Entrar a mi Día 1 (hoy)', 'Continuar a términos', 'Empezar ahora', '', 'OK']) {
      expect(estaEnMayusculas(nuevo)).toBe(false);
    }
  });
});
