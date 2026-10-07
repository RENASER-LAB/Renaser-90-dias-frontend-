/**
 * Yo y Plan dicen la misma fase (pedido del dueño, 2026-10-06: «En Yo las fases están con bug: deben ser
 * iguales que en Plan»). Se lee el código fuente sin comentarios: las dos pantallas montan medio app.
 *
 * Contra el código anterior falla: Plan leía `/home` con `useProgramaDia`, una sola vez al montar la
 * pestaña, y Yo con `useResumenHome`, que relee al volver al foco. Con la app abierta al pasar del día
 * 34 al 35, Yo decía «Fase 3 · El Maestro Interno» y Plan seguía en «02 · El Ciclo Alquímico». Además,
 * cada una hacía su propia cuenta de la fase (`descripcionDeFase` en Plan, `diasDeLaFase` en Yo).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const leer = (relativo: string) => sinComentarios(fs.readFileSync(path.join(RAIZ, relativo), 'utf-8'));

const PLAN = leer('screens/PlanScreen.tsx');
const YO = leer('screens/YoScreen.tsx');

describe('Yo y Plan leen la fase del mismo lugar', () => {
  it('las dos leen /home con el mismo hook, que relee al volver al foco', () => {
    expect(PLAN).toMatch(/useResumenHome\(\)/);
    expect(YO).toMatch(/useResumenHome\(\)/);
    expect(PLAN).not.toMatch(/useProgramaDia\(/);
  });

  it('las dos sacan la fase de faseEnCurso, y ninguna hace su propia cuenta', () => {
    expect(PLAN).toMatch(/faseEnCurso\(fase, diaConocido\)/);
    expect(YO).toMatch(/faseEnCurso\(resumen\?\.fase, resumen\?\.diaPrograma\)/);
    for (const codigo of [PLAN, YO]) {
      expect(codigo).not.toMatch(/descripcionDeFase\(|diasDeLaFase\(/);
    }
  });

  it('la tarjeta de Yo recibe el mismo rango que Plan muestra', () => {
    expect(YO).toMatch(/rango=\{faseActual\.rango\}/);
    expect(PLAN).toMatch(/\{faseActual\.rango\}/);
  });
});
