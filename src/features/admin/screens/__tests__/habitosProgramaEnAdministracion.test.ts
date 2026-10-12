import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * «Hábitos del programa» (pedido del dueño del 12/10; spec 001 del backend, D-264) está enchufada en
 * Administración y se abre desde «Más opciones». Lee el código fuente, como las de Bienvenida e Imágenes de
 * las fases. Falla contra el código anterior: las vistas no existían.
 */
const PANTALLAS = path.resolve(__dirname, '..');
const leer = (archivo: string) => fs.readFileSync(path.join(PANTALLAS, archivo), 'utf8');

describe('Hábitos del programa en Administración', () => {
  it('AdminScreen tiene la lista y el formulario, y Más opciones los abre', () => {
    const admin = leer('AdminScreen.tsx');
    expect(admin).toMatch(/\{\s*nombre:\s*'habitos-programa'\s*\}/);
    expect(admin).toMatch(/\{\s*nombre:\s*'habito-programa';\s*id:\s*string \| null\s*\}/);
    expect(admin).toMatch(/<HabitoProgramaFormScreen id=\{vista\.id\}/);
    expect(admin).toMatch(/onAbrirHabitosDelPrograma=\{\(\) => entrar\(\{ nombre: 'habitos-programa' \}\)\}/);
    expect(admin).toMatch(/useHabitosProgramaAdmin\(vista\.nombre === 'habitos-programa'\)/);
  });

  it('Más opciones la ofrece y ya no dice que el catálogo vive en la web', () => {
    const mas = leer('MasOpcionesScreen.tsx');
    expect(mas).toMatch(/titulo: 'Hábitos del programa'/);
    expect(mas).not.toMatch(/titulo: 'Catálogo de hábitos'/);
    expect(leer('AdminInicioScreen.tsx')).not.toMatch(/Hábitos del programa/);
  });

  it('las dos vistas atienden el gesto atrás del sistema', () => {
    expect(leer('HabitosProgramaAdminScreen.tsx')).toMatch(/useSystemBackHandler/);
    expect(leer('HabitoProgramaFormScreen.tsx')).toMatch(/useSystemBackHandler/);
  });

  it('el formulario elige la audiencia con el interruptor y casillas, y avisa que rige desde mañana', () => {
    const form = leer('HabitoProgramaFormScreen.tsx');
    expect(form).toMatch(/<Interruptor etiqueta="Para todos los roles"/);
    expect(form).toMatch(/<Checkbox/);
    expect(form).toMatch(/rige desde mañana/i);
    expect(form).toMatch(/reduceMotion\(ReduceMotion\.System\)/);
  });
});
