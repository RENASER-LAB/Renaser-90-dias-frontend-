/**
 * El cableado de las categorías por formación (spec 023): se mira el código fuente de lo que no se puede montar entero sin media app.
 * Cada línea de aquí existe porque sin ella una formación nueva se vería rota (hábitos que desaparecen, una tarjeta vacía, una lista sin aviso).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '../../../../..');
const leer = (relativo: string) => fs.readFileSync(path.join(RAIZ, relativo), 'utf-8');

describe('el cableado de las categorías por formación', () => {
  it('App.tsx lee las categorías apenas hay sesión (también las leen los avisos y las alarmas, que no son una pantalla)', () => {
    expect(leer('App.tsx')).toContain('<CargadorDeCategoriasDeHabito />');
  });

  it('Training: sin hábitos lo dice, y con el programa propio en otra formación muestra el aviso en lugar de la lista', () => {
    const training = leer('src/screens/TrainingScreen.tsx');
    expect(training).toContain('Tu formación todavía no tiene hábitos.');
    expect(training).toContain('useProgramaEnOtraFormacion()');
    expect(training).toContain('<AvisoDeProgramaEnOtraFormacion nombre={programaEnOtraFormacion.nombre} />');
    // «Tus prácticas» tampoco se ofrece: no hay lista que planificar.
    expect(training).toContain('programaEnOtraFormacion !== null');
  });

  it('Hoy: la tarjeta de hábitos se esconde en una formación sin hábitos y el programa propio en otra formación se avisa', () => {
    const hoy = leer('src/screens/HoyScreen.tsx');
    expect(hoy).toContain('sinHabitosEnLaFormacion({');
    expect(hoy).toContain('<AvisoDeProgramaEnOtraFormacion nombre={programaEnOtraFormacion.nombre} />');
  });

  it('useTraining no descarta los hábitos de una categoría nueva: la dimensión sale de las categorías vigentes', () => {
    const hook = leer('src/features/training/hooks/useTraining.ts');
    expect(hook).toContain('useCategoriasDeHabito()');
    expect(hook).toContain('dimensionDelHabito(h)');
    expect(hook).not.toContain('DIMENSION_POR_CATEGORIA[');
  });

  it('ninguna pantalla vuelve a escribir las cuatro dimensiones a mano: Training y «Tus prácticas» piden las de la formación', () => {
    expect(leer('src/features/training/components/PracticasDeTraining.tsx')).toContain('dimensionesDeTraining(');
    expect(leer('src/features/training/components/PracticasDeTraining.tsx')).not.toContain('DIMENSIONES_CONFIG.map');
    expect(leer('src/features/training/components/PlanificarDimensionModal.tsx')).not.toContain('CATEGORIA_POR_DIMENSION');
  });
});
