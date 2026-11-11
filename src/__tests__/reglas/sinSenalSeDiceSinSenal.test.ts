import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Familia «sin señal se dice sin señal» (spec 048, #182; 2026-11-10).
 *
 * Una pantalla que LEE sus datos y falla sin señal no está rota: la cuenta todavía no tiene esa lectura guardada en el teléfono.
 * Si guarda `mensajeDeError(e, …)` en su estado, el cliente HTTP le devuelve «No se pudo conectar con el servidor. Revisa tu
 * conexión e inténtalo de nuevo.» y la pantalla lo pinta en rojo, como si algo se hubiera roto (Plan, #182). La frase de «sin señal»
 * la decide un solo lugar: `src/features/sinRed/utils/sinSenal.ts` (`mensajeDeCarga` / `mensajeDeCargaEnLinea`), se pinta con `<ErrorDeCarga>` y se vuelve a
 * pedir sola con `useRecargarAlVolverLaSenal`. Lo que se repite una vez más es un chequeo, no un párrafo (AGENTS.md, regla 10).
 *
 * Lo que NO entra: los diálogos de una acción que la persona acaba de tocar (`Alert.alert`, `avisar`) y lo que ella manda (guardar,
 * agendar, enviar): ahí «No se pudo conectar» dice justo lo que pasó. Las excepciones que ya existían están en `excepciones.json`
 * (`sinSenalAlCargar`), con fecha y motivo: esa lista solo se achica.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const EXC = JSON.parse(fs.readFileSync(path.join(__dirname, 'excepciones.json'), 'utf8'));
const rel = (p: string) => path.relative(RAIZ, p).split(path.sep).join('/');

function archivos(dir: string): string[] {
  const out: string[] = [];
  const pila = [path.join(RAIZ, dir)];
  while (pila.length) {
    const d = pila.pop()!;
    if (!fs.existsSync(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules') pila.push(p);
      } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  }
  return out.sort();
}

const esPrueba = (f: string) => /__tests__|\.test\.|\.spec\./.test(f);
/** El código sin comentarios, con los saltos de línea en su lugar (para dar el número de línea). */
const sinComentarios = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

/** Quien define o envuelve `mensajeDeError`, y el helper mismo: no son pantallas. */
const DEFINEN = new Set([
  'src/services/http/apiClient.ts',
  'src/features/objetivos/utils/mensajeDeObjetivos.ts',
  'src/features/sinRed/utils/sinSenal.ts',
]);
const CODIGO = archivos('src')
  .filter((f) => !esPrueba(rel(f)) && !DEFINEN.has(rel(f)));

/** Lo que dice un fallo al LEER: «No pudimos cargar…», «No se pudo leer…», o una constante como `NO_SE_PUDO_CARGAR`. */
const VERBO_DE_LECTURA =
  /No (?:pudimos|pude|se pudo|se pudieron|podemos) (?:cargar|leer|encontrar|traer|comprobar|consultar|obtener|actualizar|abrir la lista)\b|\b[A-Z][A-Z_]*(?:CARGAR|AL_LEER)\b/;

/** El texto de los argumentos de la llamada que abre en `abre` (el paréntesis de apertura), sin pasarse de su cierre. */
function argumentos(t: string, abre: number): string {
  let prof = 0;
  let comilla: string | null = null;
  for (let i = abre; i < t.length; i++) {
    const ch = t[i];
    if (comilla) {
      if (ch === '\\') i++;
      else if (ch === comilla) comilla = null;
    } else if (ch === "'" || ch === '"' || ch === '`') comilla = ch;
    else if (ch === '(') prof++;
    else if (ch === ')' && --prof === 0) return t.slice(abre, i + 1);
  }
  return t.slice(abre);
}

describe('familia «sin señal se dice sin señal» (spec 048, #182)', () => {
  it('un fallo al CARGAR que va al estado de la pantalla usa mensajeDeCarga, no mensajeDeError', () => {
    const exentos: string[] = EXC.sinSenalAlCargar.archivos;
    const malos: string[] = [];
    for (const f of CODIGO) {
      if (exentos.includes(rel(f))) continue;
      const t = sinComentarios(fs.readFileSync(f, 'utf8'));
      for (const m of t.matchAll(/\b(mensajeDeError|mensajeDeObjetivos)\(/g)) {
        const abre = (m.index ?? 0) + m[0].length - 1;
        const antes = t.slice(0, m.index ?? 0);
        const contexto = antes.slice(Math.max(antes.lastIndexOf(';'), antes.lastIndexOf('\n}')) + 1);
        const llamada = contexto + argumentos(t, abre);
        const esDialogo = /\bAlert\.alert\(|\bavisar\(/.test(contexto);
        const vaAlEstado = /\bset[A-Z]\w*\(/.test(contexto) || /\b(?:error|mensaje|fallo|detalle)\w*\s*:\s*$/.test(contexto);
        if (!esDialogo && vaAlEstado && VERBO_DE_LECTURA.test(llamada)) {
          malos.push(`${rel(f)}:${antes.split('\n').length}`);
        }
      }
      // El mismo error con otra forma: `e instanceof Error ? e.message : 'No se pudieron cargar…'`.
      t.split('\n').forEach((l, i) => {
        const porDefecto = /instanceof Error\s*\?\s*\w+\.message\s*:\s*(['"`].*)$/.exec(l)?.[1];
        if (porDefecto && !/\bAlert\.alert\(|\bavisar\(/.test(l) && VERBO_DE_LECTURA.test(porDefecto)) malos.push(`${rel(f)}:${i + 1}`);
      });
    }
    if (malos.length) {
      throw new Error(
        'Estas lecturas guardan mensajeDeError(…) en su estado: sin señal eso pinta «No se pudo conectar con el servidor. Revisa tu conexión…» ' +
          'en rojo, como si algo se hubiera roto (#182). Arréglalo así: en el catch usa mensajeDeCarga(e, \'No pudimos cargar…\') ' +
          '(o mensajeDeCargaEnLinea si lo que lees nunca se guarda en el teléfono) de src/features/sinRed/utils/sinSenal.ts, con ' +
          'mensajeDeObjetivos como tercer argumento si hace falta; píntalo con <ErrorDeCarga mensaje={…} /> en vez de un <Text> rojo; y vuelve ' +
          'a pedir los datos al volver la señal con useRecargarAlVolverLaSenal(recargar, error !== null). Si la pantalla es del personal y no tiene ' +
          'modo sin internet, anótala en excepciones.json (sinSenalAlCargar) con su motivo.\n' +
          malos.join('\n'),
      );
    }
  });

  it('quien usa mensajeDeCarga también vuelve a pedir los datos al volver la señal (useRecargarAlVolverLaSenal o alVolverLaConexion)', () => {
    const exentos: string[] = EXC.sinSenalSinRecarga.archivos;
    const malos = CODIGO.filter((f) => !exentos.includes(rel(f)))
      .filter((f) => /\bmensajeDeCarga(?:EnLinea)?\(/.test(fs.readFileSync(f, 'utf8')))
      .filter((f) => !/\b(useRecargarAlVolverLaSenal|alVolverLaConexion)\(/.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    if (malos.length) {
      throw new Error(
        'Estos archivos dicen «se cargará solo cuando vuelva la señal» (mensajeDeCarga / mensajeDeCargaEnLinea) pero no vuelven a pedir los datos: ' +
          'la pantalla se queda con el texto aunque la señal vuelva. Arréglalo con useRecargarAlVolverLaSenal(recargar, error !== null) ' +
          '(src/features/sinRed/useRecargarAlVolverLaSenal.ts) en el hook que lee. Si otro lado ya lo pide (el anfitrión de la pantalla), ' +
          'anótalo en excepciones.json (sinSenalSinRecarga) con su motivo.\n' +
          malos.join('\n'),
      );
    }
  });

  it('las excepciones siguen existiendo y siguen siendo violaciones (si arreglaste una, bórrala de excepciones.json)', () => {
    const sobran: string[] = [];
    for (const f of EXC.sinSenalAlCargar.archivos as string[]) {
      const p = path.join(RAIZ, f);
      if (!fs.existsSync(p) || !/\bmensajeDeError\(/.test(fs.readFileSync(p, 'utf8'))) sobran.push(f);
    }
    for (const f of EXC.sinSenalSinRecarga.archivos as string[]) {
      const p = path.join(RAIZ, f);
      if (!fs.existsSync(p) || !/\bmensajeDeCarga(?:EnLinea)?\(/.test(fs.readFileSync(p, 'utf8'))) sobran.push(f);
    }
    if (sobran.length) {
      throw new Error(`Estas excepciones de excepciones.json ya no lo son: bórralas de la lista (la lista solo se achica).\n${sobran.join('\n')}`);
    }
  });
});
