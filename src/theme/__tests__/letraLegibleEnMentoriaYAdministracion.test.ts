import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * A-1 (retroalimentación del 26/09): en mentoría y administración la letra del cuerpo va a 16 px o
 * más. Quienes usan estas pantallas tienen de 30 a 60 años.
 *
 * Esta prueba lee el código fuente y FALLA si aparece:
 *
 * 1. un `fontSize` menor que 16. Única excepción: un metadato (una fecha, una zona horaria, el
 *    rótulo de una tarjeta) de 14 o 15, marcado a mano con el comentario `/* metadato *\/` pegado
 *    al número — para que cada excepción sea una decisión visible en la revisión y no un descuido;
 * 2. un estilo del tema más chico que 16 (`t.micro` 10.5, `t.small` 13, `t.body` 15, …) usado sin
 *    pisar su `fontSize` en el mismo arreglo de estilos;
 * 3. `MicroLabel` (10.5 px en versalitas): acá los títulos van con `TituloDeSeccion`.
 *
 * Si falla, el mensaje dice archivo, línea y qué encontró.
 */

const RAIZ = path.resolve(__dirname, '..', '..');
const CARPETAS = ['features/admin', 'features/mentor'];
const ARCHIVOS_SUELTOS = ['components/Legible.tsx'];

const MINIMO = 16;
const MINIMO_METADATO = 14;
const TOKENS_CHICOS = ['micro', 'small', 'sectionTitle', 'sectionSub', 'tab', 'body'];

function archivosTsx(carpeta: string): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== '__tests__') salida.push(...archivosTsx(ruta));
    } else if (entrada.name.endsWith('.tsx')) {
      salida.push(ruta);
    }
  }
  return salida;
}

function lineaDe(texto: string, indice: number): number {
  return texto.slice(0, indice).split('\n').length;
}

/** Revisa un archivo y devuelve sus problemas como `ruta:línea — qué`. */
export function problemasDe(ruta: string, texto: string): string[] {
  const problemas: string[] = [];
  const nombre = path.relative(RAIZ, ruta);

  // 1. fontSize literales (incluye los ternarios: `fontSize: grande ? 20 : 15`).
  const reFont = /fontSize:\s*([^,}\n]+)/g;
  for (const m of texto.matchAll(reFont)) {
    const expresion = m[1];
    const esMetadato = /\/\*\s*metadato\s*\*\//.test(expresion);
    for (const numero of expresion.replace(/\/\*[\s\S]*?\*\//g, '').match(/\d+(\.\d+)?/g) ?? []) {
      const valor = Number(numero);
      const minimo = esMetadato ? MINIMO_METADATO : MINIMO;
      if (valor < minimo) {
        problemas.push(`${nombre}:${lineaDe(texto, m.index ?? 0)} — fontSize ${valor} (mínimo ${minimo})`);
      }
    }
  }

  // 2. estilos del tema más chicos que 16 sin pisar el tamaño.
  const reToken = new RegExp(`\\bt\\.(${TOKENS_CHICOS.join('|')})\\b`, 'g');
  for (const m of texto.matchAll(reToken)) {
    const desde = m.index ?? 0;
    const cierre = texto.indexOf(']', desde);
    const tramo = cierre === -1 ? '' : texto.slice(desde, cierre);
    /* Dentro de un arreglo de estilos: lo anterior (sin espacios) es `[` o `,`. El `fontSize` tiene
       que venir DESPUÉS del token: en React Native gana el último, y `[{ fontSize: 16 }, t.body]`
       termina en 15. */
    const anterior = texto.slice(0, desde).trimEnd().slice(-1);
    const enArreglo = anterior === '[' || anterior === ',';
    if (!enArreglo || !/fontSize\s*:/.test(tramo)) {
      problemas.push(`${nombre}:${lineaDe(texto, desde)} — t.${m[1]} sin fontSize propio de 16 o más`);
    }
  }

  // 3. MicroLabel.
  const reMicro = /<MicroLabel\b/g;
  for (const m of texto.matchAll(reMicro)) {
    problemas.push(`${nombre}:${lineaDe(texto, m.index ?? 0)} — MicroLabel (usar TituloDeSeccion)`);
  }

  return problemas;
}

describe('letra legible en mentoría y administración (A-1)', () => {
  const archivos = [
    ...CARPETAS.flatMap(c => archivosTsx(path.join(RAIZ, c))),
    ...ARCHIVOS_SUELTOS.map(a => path.join(RAIZ, a)),
  ];

  it('revisa archivos de verdad (si no encuentra ninguno, la prueba no prueba nada)', () => {
    expect(archivos.length).toBeGreaterThan(20);
  });

  it('no hay letra de menos de 16 px (salvo metadatos marcados, de 14 o más)', () => {
    const problemas = archivos.flatMap(a => problemasDe(a, fs.readFileSync(a, 'utf8')));
    expect(problemas).toEqual([]);
  });

  it('la regla detecta lo que tiene que detectar', () => {
    const r = path.join(RAIZ, 'features/admin/Ejemplo.tsx');
    expect(problemasDe(r, "<Text style={[t.body, { fontSize: 13.5 }]} />")).toHaveLength(1);
    expect(problemasDe(r, "<Text style={[t.body, { color: c.text }]} />")).toHaveLength(1);
    expect(problemasDe(r, '<Text style={t.small} />')).toHaveLength(1);
    expect(problemasDe(r, '<MicroLabel>Hola</MicroLabel>')).toHaveLength(1);
    expect(problemasDe(r, "{ fontSize: grande ? 20 : 12 }")).toHaveLength(1);
    expect(problemasDe(r, '{ fontSize: 12 /* metadato */ }')).toHaveLength(1);
    expect(problemasDe(r, '{ fontSize: 14 /* metadato */ }')).toHaveLength(0);
    expect(problemasDe(r, "<Text style={[t.body, { color: c.text, fontSize: 16 }]} />")).toHaveLength(0);
    expect(problemasDe(r, "<Text style={[t.micro, { fontSize: 14 /* metadato */ }]} />")).toHaveLength(0);
    expect(problemasDe(r, "<TextInput style={[{ fontSize: 16 }, t.body]} />")).toHaveLength(1);
    expect(problemasDe(r, "<Text style={[\n  t.body,\n  { color: c.text, fontSize: 16 },\n]} />")).toHaveLength(0);
  });
});
