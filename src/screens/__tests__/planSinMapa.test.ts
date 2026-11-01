/**
 * Plan sin la puerta del Mapa (spec 026, 2026-10-31: el Mapa de Renacimiento se retira y la persona escribe sus objetivos de
 * 90 días directo en Plan, con o sin diagnóstico). La pantalla monta medio app (navegación, contextos, red), así que acá se
 * lee el código fuente sin comentarios y se comprueba QUÉ dibuja y desde dónde decide.
 *
 * Contra el código anterior falla: Plan esperaba al Mapa (`usePuertaDeObjetivos`) y, sin él, dibujaba «Primero tu Mapa de
 * Renacimiento» en lugar del selector de eje, el objetivo, la semana y las acciones.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const leer = (relativo: string) => fs.readFileSync(path.join(RAIZ, relativo), 'utf-8');

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const PLAN = sinComentarios(leer('screens/PlanScreen.tsx'));
const PLAN_DEL_EJE = sinComentarios(leer('features/objetivos/components/PlanDelEje.tsx'));
const AGENDAR = sinComentarios(leer('features/objetivos/components/AgendarAccionesModal.tsx'));
const TARJETAS = sinComentarios(leer('features/objetivos/components/TarjetasDelPlan.tsx'));

describe('Plan ya no depende del Mapa', () => {
  it('ni Plan, ni el eje, ni «Agendar», ni sus tarjetas nombran el Mapa, su contexto o su puerta', () => {
    for (const fuente of [PLAN, PLAN_DEL_EJE, AGENDAR, TARJETAS]) {
      expect(fuente).not.toMatch(/Mapa/);
      expect(fuente).not.toMatch(/mapa-renacimiento/);
      expect(fuente).not.toMatch(/PuertaDelMapa|usePuertaDeObjetivos|abrirMapa|mapaPendiente/);
    }
  });

  it('los archivos de la puerta se borraron', () => {
    for (const borrado of [
      'features/objetivos/components/PuertaDelMapa.tsx',
      'features/objetivos/hooks/usePuertaDeObjetivos.ts',
      'features/objetivos/utils/puertaDeObjetivos.ts',
      'features/objetivos/utils/mapaPendiente.ts',
    ]) {
      expect({ borrado, existe: fs.existsSync(path.join(RAIZ, borrado)) }).toEqual({ borrado, existe: false });
    }
  });
});

describe('Plan siempre dibuja el selector de eje y todo lo del eje', () => {
  it('sin ninguna rama que lo reemplace: el selector, el objetivo y el resto van en el mismo ScrollView', () => {
    const inicio = PLAN.indexOf('<ScrollView');
    const fin = PLAN.indexOf('</ScrollView>', inicio);
    const contenido = PLAN.slice(inicio, fin);
    for (const pieza of ['<ControlSegmentado', '<TarjetaDelObjetivo', '<PlanDelEje']) {
      expect({ pieza, enElContenido: contenido.includes(pieza) }).toEqual({ pieza, enElContenido: true });
    }
    // Ninguna condición decide si se dibuja: el primer hijo del scroll es la columna de Plan.
    expect(contenido).not.toMatch(/\? \(\s*<View style=\{styles\.pantalla\}>/);
    expect(contenido).not.toMatch(/puerta/i);
  });

  it('la cabecera («Plan» y «Tu dirección en 90 días») sigue arriba', () => {
    expect(PLAN.indexOf('<ScreenHeader title="Plan" />')).toBeGreaterThan(0);
    expect(PLAN).toContain('Tu dirección en 90 días');
  });

  it('hay un solo scroll en Plan', () => {
    expect((PLAN.match(/<ScrollView/g) ?? []).length).toBe(2); // el de la pantalla y el de la hoja del objetivo
    const principal = PLAN.slice(0, PLAN.indexOf('<HojaDesdeAbajo'));
    expect((principal.match(/<ScrollView/g) ?? []).length).toBe(1);
  });
});

describe('el diagnóstico ordena los ejes y sugiere la primera acción', () => {
  it('Plan lee la prioridad y la primera acción de `usePrioridadPrincipal` y la pasa a «Agendar» solo para el eje de la prioridad', () => {
    expect(PLAN).toMatch(/const \{ ejePrincipal, primeraAccion \} = usePrioridadPrincipal\(\);/);
    expect(PLAN).toMatch(/ejePrincipal && primeraAccion \? \{ eje: ejePrincipal, texto: primeraAccion \} : null/);
    expect(PLAN).toMatch(/accionSugerida=\{accionSugerida\}/);
    expect(PLAN_DEL_EJE).toMatch(/sugerida=\{accionSugerida\}/);
  });

  it('el selector parte del eje de la prioridad principal (el primero) mientras la persona no toque otro', () => {
    expect(PLAN).toMatch(/const ejesOrdenados = useMemo\(\(\) => conPrincipalPrimero\(EJES, ejePrincipal\), \[ejePrincipal\]\);/);
    expect(PLAN).toMatch(/const ejeAbierto: EjeObjetivo = ejeElegido \?\? ejesOrdenados\[0\] \?\? EJE_POR_DEFECTO;/);
  });
});

describe('guardar el objetivo sin Mapa', () => {
  it('un rechazo del servidor se dice con su mensaje, tal cual, y ya no ofrece «Hacer mi Mapa»', () => {
    expect(PLAN).toMatch(/const avisarGuardadoFallido = \(resultado: \{ mensaje: string \}\) =>/);
    expect(PLAN).toMatch(/Alert\.alert\('No se pudo guardar', resultado\.mensaje\);/);
    expect(PLAN).not.toContain('Hacer mi Mapa');
    // Los dos guardados (objetivo nuevo y avance) pasan por el mismo aviso.
    expect((PLAN.match(/avisarGuardadoFallido\(resultado\);/g) ?? []).length).toBe(2);
  });

  it('con la semana bloqueada, «Escribir mis objetivos» abre el editor del primer eje que no tiene objetivo', () => {
    expect(PLAN).toMatch(/const faltante = ejesOrdenados\.find\(eje => rocaDeEje\(eje\) == null\);/);
    expect(PLAN).toMatch(/if \(faltante !== ejeAbierto\) cambiarEje\(faltante\);\s*openEditGoalModal\(faltante\);/);
    expect(PLAN).toMatch(/onDefinirObjetivos=\{definirObjetivos\}/);
  });
});
