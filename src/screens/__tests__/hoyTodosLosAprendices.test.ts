/**
 * «Todos los aprendices» (2026-10-31): cómo queda cableado en `HoyScreen`. Montar Hoy entera no probaría nada más que sus
 * dobles, así que el cableado se prueba sobre el código (sin comentarios), como las demás pruebas de Hoy. La fila se prueba
 * montada en `features/hoy-por-papel/__tests__`; la pantalla y su búsqueda, en `features/lider-mentores/screens/__tests__`.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');

function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const HOY = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/HoyScreen.tsx'), 'utf-8'));

describe('Hoy: «Todos los aprendices»', () => {
  it('solo pregunta al servidor si lo ofrece quien lidera mentores y con su entrada prendida', () => {
    expect(HOY).toContain('const aprendicesDisponibles = useAprendicesDisponibles(esLider && esDisponible(CLAVES.lider));');
  });

  it('la fila de «Mis mentores» existe solo con un 200 (`=== true`: ni pendiente ni caído)', () => {
    expect(HOY).toContain('verTodos={aprendicesDisponibles === true}');
    expect(HOY).toContain('onAbrirTodos={() => setEnTodosLosAprendices(true)}');
  });

  it('la pantalla es estado de Hoy, solo para el líder, y salir vuelve a Hoy (sin pestaña nueva)', () => {
    expect(HOY).toMatch(
      /if \(enTodosLosAprendices && esLider\) \{\s*return <AprendicesDelLiderScreen onSalir=\{\(\) => setEnTodosLosAprendices\(false\)\} \/>;\s*\}/,
    );
  });
});
