import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * #98: la tarjeta de la persona en Comunidad → Ranking decía «Tu Posición (nombre)» con la P mayúscula, y el resto de la app escribe los
 * rótulos en tipo oración. Se barre el código de la pantalla (sin comentarios, que explican y no se dibujan).
 */
const PANTALLA = path.resolve(__dirname, '..', 'ComunidadScreen.tsx');

function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Ranking: «Tu posición» en tipo oración (#98)', () => {
  const codigo = sinComentarios(fs.readFileSync(PANTALLA, 'utf-8'));

  it('la tarjeta dice «Tu posición (nombre)»', () => {
    expect(codigo).toContain('Tu posición ({nombreUsuario})');
  });

  it('ningún texto de la pantalla vuelve a decir «Tu Posición»', () => {
    expect(codigo).not.toContain('Tu Posición');
  });
});
