/**
 * Plan: la misma fila compacta del programa propio que Hoy (2026-11-01, pedido del dueño: «ajusta eso y el plan»). Quien no tiene programa,
 * no eligió su Día 1 o ya lo eligió y espera ve arriba de Plan «Haz tu programa de 90 días», «Todavía no elegiste tu Día 1» o «Tu programa
 * empieza el martes 3 de noviembre». Un solo hook y una sola función pura para Hoy y Plan: no hay una segunda copia de la lógica.
 *
 * La pantalla monta medio app, así que se lee el código fuente sin comentarios; qué dice cada estado lo prueban `filaDelPrograma` y
 * `filaDelProgramaPropio`.
 *
 * Contra el código anterior falla: Plan no decía nada de esto; con objetivos que el servidor rechaza o vacíos, la persona no sabía por qué.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const PLAN = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/PlanScreen.tsx'), 'utf-8'));
const HOY = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/HoyScreen.tsx'), 'utf-8'));

describe('Plan: la fila del programa propio', () => {
  it('va arriba de todo (antes de los objetivos por confirmar y del selector de eje) y solo si hay algo que decir', () => {
    // Sin programa propio andando el estado vacío trae su propio botón «Elegir mi Día 1» y la fila no se repite, salvo que haya que reintentar (#82).
    expect(PLAN).toContain('{programaPropio.visible && (!sinProgramaPropio || programaPropio.error !== null) ? <FilaDelProgramaPropio programa={programaPropio} /> : null}');
    const fila = PLAN.indexOf('<FilaDelProgramaPropio');
    expect(fila).toBeGreaterThan(-1);
    expect(fila).toBeLessThan(PLAN.indexOf('<TarjetaRevisaTusObjetivos'));
    expect(fila).toBeLessThan(PLAN.indexOf('<ControlSegmentado'));
  });

  it('usa el mismo hook y el mismo componente que Hoy, con lo que Plan ya lee de /home (sin otra lectura de /home)', () => {
    for (const pantalla of [PLAN, HOY]) {
      expect(pantalla).toContain("import { useFilaDelProgramaPropio } from '../features/programa/hooks/useFilaDelProgramaPropio';");
      expect(pantalla).toContain("import { FilaDelProgramaPropio } from '../features/programa/components/FilaDelProgramaPropio';");
      expect(pantalla).toMatch(/useFilaDelProgramaPropio\(\{\s*inscrito: resumen\?\.inscrito,\s*diaPrograma: resumen\?\.diaPrograma,\s*duracionDias: resumen\?\.duracionDias,\s*formacion: resumen\?\.formacion,/);
    }
    expect(PLAN.match(/useResumenHome\(\)/g)).toHaveLength(1);
  });

  it('Plan no vuelve a escribir los textos de la fila: no hay una segunda copia de la lógica', () => {
    for (const texto of ['Haz tu programa de', 'Tu programa empieza', 'Todavía no elegiste tu Día 1', 'Elige tu Día 1']) {
      expect(PLAN).not.toContain(texto);
      expect(HOY).not.toContain(texto);
    }
  });
});
