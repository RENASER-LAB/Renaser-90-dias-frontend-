/**
 * D-229 del backend (29/09, pedido del dueño): el acompañante se llama **SER** en todo lo que ve la
 * persona. «Renasia» queda solo en nombres internos (carpeta `features/renasia`, `MemoriaDeRenasia`,
 * `confirmarPropuestaRenasia`, rutas `/api/v1/renasia`), que nadie lee en la pantalla.
 *
 * Contra el código anterior falla: Yo decía «Lo que Renasia recuerda de ti» y la memoria «Renasia
 * todavía no recuerda nada de ti». Mira el código fuente sin comentarios y busca la palabra suelta
 * «Renasia» (no pegada a otro identificador): eso solo puede ser texto.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '../../..');

function archivosFuente(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entrada => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return entrada.name === '__tests__' ? [] : archivosFuente(ruta);
    return /\.(ts|tsx)$/.test(entrada.name) ? [ruta] : [];
  });
}

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('el acompañante se llama SER en lo que ve la persona', () => {
  it('ningún texto de la app dice «Renasia»', () => {
    const conRenasia = archivosFuente(RAIZ).flatMap(archivo =>
      sinComentarios(fs.readFileSync(archivo, 'utf8'))
        .split('\n')
        .filter(linea => /\bRenasia\b/.test(linea))
        .map(linea => `${path.relative(RAIZ, archivo)}: ${linea.trim()}`)
    );
    expect(conRenasia).toEqual([]);
  });
});
