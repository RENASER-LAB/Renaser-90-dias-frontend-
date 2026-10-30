import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Mi Radar en Yo (spec 012, pedido del dueño del 2026-10-29): una fila justo debajo de «Tuve una emergencia», solo desde
 * el día 8 y solo si el servidor la ofrece; abre `MiRadarScreen` a pantalla completa. Se lee el código sin comentarios,
 * como `redisenoDeYo`.
 */
const SRC = path.resolve(__dirname, '..', '..');
const sinComentarios = (texto: string) =>
  texto
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const yo = sinComentarios(fs.readFileSync(path.join(SRC, 'screens/YoScreen.tsx'), 'utf-8'));

describe('la fila «Mi Radar» de Yo', () => {
  it('va justo debajo de «Tuve una emergencia», con la brújula, en la misma lista', () => {
    const grupo = yo.slice(yo.indexOf('<GrupoDeAjustes>'), yo.indexOf('</GrupoDeAjustes>'));
    const emergencia = grupo.indexOf('titulo="Tuve una emergencia"');
    const miRadar = grupo.indexOf('titulo="Mi Radar"');
    expect(emergencia).toBeGreaterThan(-1);
    expect(miRadar).toBeGreaterThan(emergencia);
    // Y ninguna otra fila entre las dos: lo único que se abre en medio es la propia fila de Mi Radar.
    expect(grupo.slice(emergencia, miRadar).match(/<FilaDeAjuste/g)).toHaveLength(1);
    expect(grupo.slice(grupo.indexOf('key="mi-radar"'))).toMatch(/icono="compass"/);
  });

  it('solo desde el día 8 y solo si el servidor respondió: ni fila ni pantalla antes', () => {
    expect(yo).toMatch(/const veMiRadar = miRadarCorresponde\(resumen\?\.diaPrograma\) && configMiRadar !== null;/);
    expect(yo).toMatch(/\{veMiRadar && configMiRadar \? \(\s*<FilaDeAjuste\s+key="mi-radar"/);
    expect(yo).toMatch(/if \(enMiRadar && veMiRadar\) \{\s*return \(?\s*<MiRadarScreen/);
  });

  it('dice su estado en una línea', () => {
    expect(yo).toMatch(/detalle=\{textoDeMiRadar\(configMiRadar\)\}/);
  });

  it('el estado con días distintos («… · sáb 11:00 · dom sin Radar») se parte en renglones: la fila no lo corta', () => {
    // La fila de Ajustes dibuja el detalle sin límite de renglones ni «…»: un resumen largo crece hacia abajo.
    const filas = sinComentarios(fs.readFileSync(path.join(SRC, 'features/yo/components/FilasDeAjustes.tsx'), 'utf-8'));
    expect(filas).not.toMatch(/numberOfLines/);
    expect(filas).not.toMatch(/ellipsizeMode/);
    expect(filas).toMatch(/\{detalle \? <Text[^>]*>\{detalle\}<\/Text> : null\}/);
  });

  it('el aviso `/mi-radar` llega con `abrirMiRadar`, que abre la pantalla (como `abrirCaja`) y se consume', () => {
    expect(yo).toMatch(/abrirMiRadar\?: boolean/);
    expect(yo).toMatch(/setMiRadarPorAviso\(true\);\s*setEnMiRadar\(true\);/);
    expect(yo).toMatch(/setParams\(\{ abrirMiRadar: undefined \}\)/);
    // Tocar la fila a mano no abre el formulario; venir de un aviso sí (si toca).
    expect(yo).toMatch(/setMiRadarPorAviso\(false\);\s*setEnMiRadar\(true\);/);
    expect(yo).toMatch(/<MiRadarScreen\s+abrirDesdeAviso=\{miRadarPorAviso\}/);
  });
});
