import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * #215 (2026-11-16, primer build de iOS): en iPhone el Código Renaser y otras ventanas se metían debajo de la isla y su pie
 * quedaba tapado por la barrita de inicio. En iOS un `Modal` de React Native abre una ventana nativa aparte, y el
 * `SafeAreaProvider` de la raíz no llega ahí: `SafeAreaView` mide 0 de margen. En Android no se ve.
 *
 * La regla: un archivo que use `<Modal` y `SafeAreaView` tiene que abrir la ventana con `ModalConZonaSegura`
 * (`src/components/ModalConZonaSegura.tsx`), que pone su propio `SafeAreaProvider`.
 *
 * Si falla: cambia `<Modal …>` por `<ModalConZonaSegura …>` (las mismas props) y `</Modal>` por `</ModalConZonaSegura>`.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const rel = (p: string) => path.relative(RAIZ, p).split(path.sep).join('/');

function archivos(dir: string): string[] {
  const out: string[] = [];
  const pila = [path.join(RAIZ, dir)];
  while (pila.length) {
    const d = pila.pop()!;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__' && e.name !== 'node_modules') pila.push(p);
      } else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name)) {
        out.push(p);
      }
    }
  }
  return out;
}

/** El archivo usa un `Modal` de React Native (no el compartido) junto con `SafeAreaView`. */
export function modalSinZonaSegura(texto: string): boolean {
  // Los comentarios no cuentan: un `<Modal>` nombrado en un comentario no abre ninguna ventana.
  const codigo = texto
    .split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
  return /<Modal[\s>]/.test(codigo) && /\bSafeAreaView\b/.test(codigo);
}

describe('Ventanas con márgenes seguros en iPhone (#215)', () => {
  it('ningún Modal con SafeAreaView se abre sin su propio SafeAreaProvider', () => {
    const mal = archivos('src')
      .filter(f => !f.endsWith(`${path.sep}ModalConZonaSegura.tsx`))
      .filter(f => modalSinZonaSegura(fs.readFileSync(f, 'utf8')))
      .map(f => `${rel(f)} → usa <ModalConZonaSegura> en vez de <Modal>`);
    expect(mal).toEqual([]);
  });

  it('la guarda detecta el caso que se coló (#215) y deja pasar el arreglo', () => {
    expect(modalSinZonaSegura('<Modal visible>\n<SafeAreaView style={x}>')).toBe(true);
    expect(modalSinZonaSegura('<ModalConZonaSegura visible>\n<SafeAreaView style={x}>')).toBe(false);
    expect(modalSinZonaSegura('<Modal visible>\n<View />')).toBe(false);
    expect(modalSinZonaSegura(' * el selector (un `<Modal>`) se abría\n<SafeAreaView>')).toBe(false);
  });
});
