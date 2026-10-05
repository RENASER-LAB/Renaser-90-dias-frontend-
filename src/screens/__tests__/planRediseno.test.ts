/**
 * Plan después del rediseño aprobado por el dueño el 2026-10-05 (mosaico «Hoy y Plan · inventario de
 * íconos», filas de Plan). Se lee el código fuente sin comentarios: la pantalla monta medio app
 * (navegación, contextos, red) y acá importa QUÉ dibuja.
 *
 * Contra el código anterior falla: Plan tenía la sub-vista muerta «Hábitos 7 días», el lema
 * «Enfocado. Estratégico. Real.», tres tramos de 30 días, «← VOLVER A PLAN» con la píldora
 * «02. OBJETIVOS (3 NIVELES)», ✏️ y 🎯 de emoji, trofeo, `zap` verde, cinco ventanas centradas y los
 * avisos de éxito en diálogo.
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
const OBJETIVOS = 'features/objetivos/components';
const HOJAS = [
  `${OBJETIVOS}/PlanSemanalModal.tsx`,
  `${OBJETIVOS}/AgendarAccionesModal.tsx`,
  `${OBJETIVOS}/RevisionSemanalModal.tsx`,
  `${OBJETIVOS}/EditarObjetivoDelMesModal.tsx`,
];
const DE_PLAN = ['screens/PlanScreen.tsx', ...HOJAS, `${OBJETIVOS}/TarjetaPlanSemanal.tsx`, `${OBJETIVOS}/TarjetaAccionesDelDia.tsx`];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe('Plan: la sub-vista muerta «Hábitos 7 días»', () => {
  it('ya no existe, ni sus formularios', () => {
    for (const viejo of ["'habitos'", 'HÁBITOS (7 DÍAS)', 'Crear Hábito', 'CREAR NUEVO HÁBITO', 'REUBICAR HÁBITO', 'HoraPickerModal', 'RenombrarHabitoModal', 'usePlanHabitos']) {
      expect(PLAN).not.toContain(viejo);
    }
    expect(PLAN).toMatch(/useState<'main' \| 'objetivos'>\('main'\)/);
  });

  it('los tipos que usan hábitos y Training siguen exportados', () => {
    expect(PLAN).toMatch(/export type DayOfWeek = DiaDelPlan;/);
    expect(PLAN).toMatch(/export interface PlanHabit \{/);
  });
});

describe('Plan: textos', () => {
  it('sin el lema y sin las versales de las migas', () => {
    for (const viejo of ['Enfocado. Estratégico. Real.', 'VOLVER A PLAN', '02. OBJETIVOS (3 NIVELES)', '1. OBJETIVO PRINCIPAL (90 DÍAS)', 'CUMPLIDO', 'PRINCIPAL<', 'Avance cuantitativo']) {
      expect(PLAN).not.toContain(viejo);
    }
    expect(PLAN).toContain('Tu mapa de los próximos 90 días');
    expect(PLAN).toContain('Tu objetivo de 90 días');
  });

  it('el estado vacío del objetivo entra en dos renglones', () => {
    expect(PLAN).not.toContain('Si se puede medir con un número, agrégalo');
    expect(PLAN).toContain('Todavía no lo definiste. Toca Editar y escribe a dónde quieres llegar.');
  });

  it('los ejemplos del formulario van con «Ej.:» y en gris tenue', () => {
    for (const ejemplo of ['Ej.: 82', 'Ej.: 30000', 'Ej.: USD']) {
      expect(PLAN).toMatch(new RegExp(`placeholder="${ejemplo.replace('.', '\\.')}"\\s+placeholderTextColor=\\{c\\.tabInactive\\}`));
    }
  });

  it('ningún botón ni rótulo de Plan queda en versales ni con emoji', () => {
    for (const archivo of DE_PLAN) {
      const fuente = sinComentarios(leer(archivo));
      expect({ archivo, emoji: EMOJI.test(fuente) }).toEqual({ archivo, emoji: false });
      expect({ archivo, versales: fuente.match(/label=["'`{][^\n]*\b(GUARDAR|SIGUIENTE|AGENDAR|LISTO)\b/g) }).toEqual({ archivo, versales: null });
      expect({ archivo, toUpperCase: fuente.includes('.toUpperCase()') }).toEqual({ archivo, toUpperCase: false });
    }
  });
});

describe('Plan: íconos', () => {
  it('cada prioridad lleva el ícono de su eje y un chevron gris de 16, no «01 / 02 / 03»', () => {
    expect(PLAN).toMatch(/<Icon name=\{iconoDelEje\(eje\)\} size=\{TAMANO_ICONO\.normal\}/);
    expect(PLAN).toMatch(/<Icon name="chevron" size=\{TAMANO_ICONO\.chico\} color=\{c\.chevron\} \/>/);
    expect(PLAN).not.toMatch(/String\(indice \+ 1\)\.padStart\(2, '0'\)/);
  });

  it('objetivo con bandera, lápiz de línea y la flecha de volver de 24', () => {
    expect(PLAN).not.toContain('name="trophy"');
    expect(PLAN).toMatch(/<Icon name="flag" size=\{TAMANO_ICONO\.normal\}/);
    expect((PLAN.match(/<Icon name="pencil" size=\{TAMANO_ICONO\.chico\}/g) ?? []).length).toBe(2);
    expect(PLAN).toMatch(/<Icon name="arrowLeft" size=\{TAMANO_ICONO\.grande\}/);
    expect(PLAN).toMatch(/<Icon name="calendar" size=\{TAMANO_ICONO\.chico\}/);
  });

  it('la semana con `calendarRange` dorado; `target` queda solo en «Tus acciones»', () => {
    const semana = sinComentarios(leer(`${OBJETIVOS}/TarjetaPlanSemanal.tsx`));
    expect(semana).toMatch(/<Icon name="calendarRange" size=\{TAMANO_ICONO\.normal\} color=\{c\.goldInk\} \/>/);
    expect(semana).not.toContain('name="zap"');
    expect(semana).not.toMatch(/color: c\.success, fontFamily/);
    const conTarget = DE_PLAN.filter(a => sinComentarios(leer(a)).includes('name="target"'));
    expect(conTarget).toEqual([`${OBJETIVOS}/TarjetaAccionesDelDia.tsx`]);
  });

  it('la acción cumplida con su ícono, no con el carácter ✓', () => {
    const acciones = sinComentarios(leer(`${OBJETIVOS}/TarjetaAccionesDelDia.tsx`));
    expect(acciones).toMatch(/<Icon name="checkCircle" size=\{TAMANO_ICONO\.normal\} color=\{c\.success\} \/>/);
    expect(acciones).not.toContain('>✓<');
  });

  it('el Mapa usa el mismo ícono por eje que Plan (Relaciones ya no es `users`)', () => {
    for (const pantalla of ['PrioridadScreen', 'SistemaEjecucionScreen']) {
      const fuente = sinComentarios(leer(`features/mapa-renacimiento/screens/${pantalla}.tsx`));
      expect(fuente).toMatch(/<Icon name=\{iconoDelEje\(EJE_POR_AREA\[area\]\)\}/);
      expect(fuente).not.toMatch(/relaciones: 'users'/);
    }
  });
});

describe('Plan: Objetivos', () => {
  it('se cambia de eje arriba, sin volver a Plan, en el orden de las tarjetas', () => {
    expect(PLAN).toMatch(/<ControlSegmentado\s+opciones=\{ejesOrdenados\.map\(eje => \(\{\s*valor: eje,\s*etiqueta: ETIQUETA_CORTA_EJE\[eje\],/);
    expect(PLAN).toMatch(/onCambiar=\{cambiarEje\}/);
  });

  it('«Arquitectura de tiempo» dibuja las fases de la fuente, no tres tramos de 30 días', () => {
    expect(PLAN).not.toMatch(/DÍAS 1–30|DÍAS 31–60|DÍAS 61–90|TRAMOS_DEL_RECORRIDO|i \* 30/);
    expect(PLAN).toMatch(/tramosDeLasFases\(diaConocido, fase\)/);
    expect(PLAN).toMatch(/flex: tramo\.dias/);
  });
});

describe('Plan: hojas y avisos', () => {
  it('las cinco ventanas son hojas desde abajo', () => {
    expect(PLAN).toMatch(/<HojaDesdeAbajo\s+visible=\{editGoalModalVisible\}/);
    expect(PLAN).not.toMatch(/<Modal\b/);
    for (const archivo of HOJAS) {
      const fuente = sinComentarios(leer(archivo));
      expect({ archivo, hoja: /<HojaDesdeAbajo\b/.test(fuente) }).toEqual({ archivo, hoja: true });
      expect({ archivo, modal: /<Modal\b/.test(fuente) }).toEqual({ archivo, modal: false });
    }
  });

  it('guardar el objetivo o el avance se confirma en línea y vibra; los errores siguen en diálogo', () => {
    expect(PLAN).not.toContain('¡Objetivo actualizado!');
    expect(PLAN).not.toContain('¡Avance anotado!');
    expect(PLAN).toMatch(/setConfirmacion\(\{ clave: Date\.now\(\), texto \}\);\s*tacto\.logro\(\);/);
    expect(PLAN).toMatch(/<ConfirmacionEnLinea/);
    expect(PLAN).toMatch(/Alert\.alert\('No se pudo guardar', resultado\.mensaje\)/);
  });
});

describe('Plan: respuesta al tacto', () => {
  it('prioridades, volver y «Más detalles» se hunden al tocarlas', () => {
    expect(PLAN).toMatch(/<Presionable\s+key=\{eje\}\s+onPress=\{\(\) => abrirObjetivoDe\(eje\)\}/);
    expect(PLAN).toMatch(/<Presionable\s+onPress=\{\(\) => setActiveSubView\('main'\)\}/);
    expect(PLAN).toMatch(/<Presionable\s+onPress=\{\(\) => setExplicacionNivelesAbierta/);
  });

  it('la escala 1–10 y la fila de días vibran al elegir', () => {
    const semana = sinComentarios(leer(`${OBJETIVOS}/PlanSemanalModal.tsx`));
    const revision = sinComentarios(leer(`${OBJETIVOS}/RevisionSemanalModal.tsx`));
    const agendar = sinComentarios(leer(`${OBJETIVOS}/AgendarAccionesModal.tsx`));
    expect(semana).toMatch(/const elegirEnLaEscala = \(valor: number\) => \{\s*tacto\.seleccion\(\);/);
    expect(semana).toMatch(/<Presionable\s+key=\{valor\}\s+onPress=\{\(\) => elegirEnLaEscala\(valor\)\}/);
    expect(revision).toMatch(/if \(valor !== autoevaluacion\) tacto\.seleccion\(\);/);
    expect(revision).toMatch(/<Presionable\s+key=\{valor\}\s+onPress=\{\(\) => elegir\(valor\)\}/);
    expect(agendar).toMatch(/if \(dia !== diaElegido\) tacto\.seleccion\(\);/);
    expect(agendar).toMatch(/onAlternarDia=\{elegirDia\}/);
  });

  it('«Agendar otro día» y «Este mes» tienen área propia de 44–48', () => {
    expect(sinComentarios(leer(`${OBJETIVOS}/TarjetaAccionesDelDia.tsx`))).toMatch(/enlace: \{ minHeight: 48,/);
    expect(PLAN).toMatch(/areaDelLapiz: \{\s*width: 44,\s*height: 44,/);
  });
});

describe('Objetivos: el título no repite el eje del segmentado (decisión del dueño, 2026-10-05)', () => {
  it('arriba dice «Objetivos» y el eje solo lo dice el segmentado', () => {
    expect(PLAN).toMatch(/accessibilityRole="header"[\s\S]{0,200}>\s*Objetivos\s*<\/Text>/);
    expect(PLAN).not.toContain('{ETIQUETA_EJE[ejeAbierto]}\n            </Text>');
  });
});
