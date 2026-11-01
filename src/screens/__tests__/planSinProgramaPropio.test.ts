import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const PLAN = fs.readFileSync(path.resolve(__dirname, '../PlanScreen.tsx'), 'utf8');
const ESTADO_VACIO = fs.readFileSync(path.resolve(__dirname, '../../features/programa/components/PlanSinPrograma.tsx'), 'utf8');

/**
 * E2E de las formaciones (01/11/2026, issues #81 y #82): una cuenta del personal sin programa propio veía en Plan «Participante no encontrado: <id>» en dos
 * tarjetas (el servidor responde 404 a todo `/rocks/*` cuando no hay participación) y, arreglado eso, la mitad de la pantalla vacía. Sin programa, Plan
 * muestra un estado con cuerpo centrado en el alto que sobra; el selector de eje, el objetivo, «Esta semana» y las acciones no se dibujan.
 */
describe('Plan sin programa propio', () => {
  it('lo decide `/home` (no estar inscrito) o, para el PERSONAL, tener la fila sin haber elegido su Día 1 (#83); el aprendiz con la fila ve Plan como siempre', () => {
    expect(PLAN).toContain(
      "const sinProgramaPropio = resumen?.inscrito === false || (programaPropio.vista?.tipo === 'elegir' && programaPropio.delPersonal);",
    );
    // Quién es del personal lo dice el servidor (`canStartProgram`), no el nombre del rol en el teléfono; y no se decide por el día 0.
    expect(PLAN).not.toMatch(/sinProgramaPropio = .*diaPrograma/);
    expect(PLAN).not.toMatch(/sinProgramaPropio = .*user\?\.role/);
  });

  it('muestra el estado vacío con cuerpo y todo lo demás solo se dibuja con programa', () => {
    const sin = PLAN.indexOf('{sinProgramaPropio ? (');
    const vacio = PLAN.indexOf('<PlanSinPrograma alElegirDiaUno={programaPropio.alElegirDiaUno} />', sin);
    const otraRama = PLAN.indexOf(') : (', vacio);
    expect(sin).toBeGreaterThan(0);
    expect(vacio).toBeGreaterThan(sin);
    expect(otraRama).toBeGreaterThan(vacio);
    for (const bloque of ['<ControlSegmentado', '<TarjetaDelObjetivo', '<PlanDelEje']) {
      expect(PLAN.indexOf(bloque, sin)).toBeGreaterThan(otraRama);
    }
  });

  it('la fila del programa propio no se repite junto al botón del estado vacío, salvo que haya que reintentar una lectura', () => {
    expect(PLAN).toContain('programaPropio.visible && (!sinProgramaPropio || programaPropio.error !== null) ? <FilaDelProgramaPropio');
  });

  it('E2E #85: el estado vacío va ARRIBA, pegado a la cabecera y con el aire normal entre secciones, no centrado en la pantalla', () => {
    expect(PLAN).toContain('<View style={styles.pantalla}>');
    expect(PLAN).not.toContain('pantallaSinPrograma');
    // Una tarjeta más de Plan: nada que estire el bloque ni lo centre.
    expect(ESTADO_VACIO).toMatch(/tarjeta: \{ borderWidth: 1, borderRadius: 16, padding: 17, gap: 12 \}/);
    expect(ESTADO_VACIO).not.toContain('flexGrow');
    expect(ESTADO_VACIO).not.toMatch(/cuerpo:/);
  });

  it('dice qué pasa y trae el botón «Elegir mi Día 1» (el mismo selector de siempre)', () => {
    expect(ESTADO_VACIO).toContain("'Tu plan empieza con tu programa'");
    expect(ESTADO_VACIO).toContain("'Cuando elijas tu Día 1 podrás escribir tus objetivos y agendar tus acciones aquí.'");
    expect(ESTADO_VACIO).toContain('<BotonElegirDiaUno onActivado={alElegirDiaUno} />');
  });
});
