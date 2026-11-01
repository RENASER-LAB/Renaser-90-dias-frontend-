import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const raizDelRepo = path.resolve(__dirname, '../../../..');
const fuente = (ruta: string) => fs.readFileSync(path.join(raizDelRepo, ruta), 'utf8');

/**
 * E2E del 01/11/2026: una mentora con dos formaciones cambiaba de formación en Yo y Hoy decía «Escuela Renaser» pero seguía mostrando la
 * «Última evidencia del muro» del Diplomado (la lectura guardada vive 2 minutos y es de módulo). Training y Plan guardan lecturas igual
 * (eventos de la semana, días cerrados, cierres) con la cuenta como llave. Cada lectura guardada se separa por cuenta Y formación.
 */
describe('las lecturas guardadas se separan por formación (spec 022)', () => {
  it('«Última evidencia del muro» de Hoy guarda de qué formación es la lectura y no sirve otra', () => {
    const hook = fuente('src/features/community/hooks/useUltimaPublicacionMuro.ts');
    expect(hook).toContain('useFormacionDeLaSesion');
    expect(hook).toContain('llaveDeLasVistas');
    expect(hook).toMatch(/ultimaLectura = \{ publicacion: ultima, leidaEn: Date\.now\(\), formacion \}/);
    expect(hook).toMatch(/sirveParaLaFormacion\(ultimaLectura, formacion\) && lecturaVigente/);
  });

  it.each([
    ['src/screens/TrainingScreen.tsx', /cuentaId=\{llaveDeLasVistas\(user\?\.id \?\? 'anon', formacionDeLaSesion\)\}/],
    ['src/screens/PlanScreen.tsx', /cuentaId=\{llaveDeLasVistas\(user\.id, formacionDeLaSesion\)\}/],
  ])('%s le pasa a sus lecturas guardadas la cuenta y la formación', (ruta, esperado) => {
    expect(fuente(ruta)).toMatch(esperado);
  });
});
