import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * «¿Mostrar la foto real de cada evidencia en Yo?» → sí (dueño, 2026-10-05; backend D-252). Hasta
 * acá, la tira de tres miniaturas de Yo y la grilla de «Registro de Evidencias» dibujaban
 * `<Icon name={iconoDeTipo(ev.tipo)} />`: una cámara por cada foto, aunque la foto existiera.
 *
 * Se lee el código sin comentarios: lo que importa es qué se dibuja.
 */
const YO = path.resolve(__dirname, '..', 'YoScreen.tsx');
const codigo = fs
  .readFileSync(YO, 'utf-8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('las miniaturas de evidencia de Yo', () => {
  it('ya no dibujan solo el ícono del tipo', () => {
    expect(codigo).not.toMatch(/<Icon name=\{iconoDeTipo\(ev\.tipo\)\}/);
  });

  it('la grilla del registro pinta la foto real con MiniaturaDeEvidencia', () => {
    const usos = codigo.match(/<MiniaturaDeEvidencia[\s\S]*?\/>/g) ?? [];
    expect(usos).toHaveLength(1);
    expect(usos.every(uso => uso.includes('evidencia={ev}'))).toBe(true);
  });

  it('la miniatura del registro se amplía al tocarla', () => {
    const [registro] = codigo.match(/<MiniaturaDeEvidencia[\s\S]*?\/>/g) ?? [];
    expect(registro).toContain('ampliable');
  });

  it('la tira «Evidencia» de Yo se quitó el 2026-10-31 (pedido del dueño): «Mis evidencias» sigue en Ajustes → Tu proceso', () => {
    expect(codigo).not.toContain('<MicroLabel>Evidencia</MicroLabel>');
    expect(codigo).not.toMatch(/evidencias\.slice\(0, 3\)/);
    expect(codigo).not.toContain('Todavía no subiste evidencias.');
    // La puerta de Ajustes y su sub-vista siguen.
    expect(codigo).toContain("{activeView === 'evidencias' && (");
    expect(codigo).toMatch(/Mis evidencias/);
  });
});
