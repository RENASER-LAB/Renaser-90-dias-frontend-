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
/** Desde el 2026-10-31 la pantalla principal de Plan se arma con estos dos (reemplazan a TarjetaPlanSemanal y TarjetaAccionesDelDia). */
const TARJETAS = sinComentarios(leer(`${OBJETIVOS}/TarjetasDelPlan.tsx`));
const DE_PLAN = ['screens/PlanScreen.tsx', ...HOJAS, `${OBJETIVOS}/TarjetasDelPlan.tsx`, `${OBJETIVOS}/PlanDelEje.tsx`];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe('Plan: la sub-vista muerta «Hábitos 7 días»', () => {
  it('ya no existe, ni sus formularios', () => {
    for (const viejo of ["'habitos'", 'HÁBITOS (7 DÍAS)', 'Crear Hábito', 'CREAR NUEVO HÁBITO', 'REUBICAR HÁBITO', 'HoraPickerModal', 'RenombrarHabitoModal', 'usePlanHabitos']) {
      expect(PLAN).not.toContain(viejo);
    }
    // La sub-vista «Objetivos» (con su flecha de volver) se integró a la pantalla principal el 2026-10-31.
    expect(PLAN).not.toMatch(/activeSubView|setActiveSubView/);
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
    expect(TARJETAS).toContain('Tu objetivo de 90 días');
  });

  it('la cabecera: «Plan» y debajo, en dorado, «Tu dirección en 90 días»; sin la diana de la maqueta', () => {
    expect(PLAN).toContain('<ScreenHeader title="Plan" />');
    expect(PLAN).toMatch(/color: c\.goldInk,[^}]*\}\]\}>Tu dirección en 90 días<\/Text>/);
    expect(PLAN).not.toContain('Tu mapa de los próximos 90 días');
    // La diana de la maqueta no hace nada: no se dibuja (el ScreenHeader solo pinta un botón con ícono y acción).
    expect(PLAN).not.toMatch(/<ScreenHeader[^>]*right=/);
  });

  it('el estado vacío del objetivo entra en dos renglones', () => {
    expect(PLAN).not.toContain('Si se puede medir con un número, agrégalo');
    expect(TARJETAS).toContain('Todavía no lo definiste. Toca los tres puntos y escribe a dónde quieres llegar.');
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
  it('el selector lleva el ícono de su eje; la acción lleva el del eje, el candado o el ✓ de línea', () => {
    expect(PLAN).toMatch(/icono: iconoDelEje\(eje\),/);
    expect(TARJETAS).toMatch(/accion\.completada \? 'checkCircle' : accion\.bloqueada \? 'lock' : iconoDelEje\(accion\.eje\)/);
    expect(TARJETAS).not.toMatch(/>✓</);
    expect(TARJETAS).toMatch(/<Icon name="chevron" size=\{TAMANO_ICONO\.chico\} color=\{c\.chevron\} \/>/);
  });

  it('objetivo con bandera, lápiz de línea en la cifra del mes y tres puntos para las opciones', () => {
    for (const fuente of [PLAN, TARJETAS]) expect(fuente).not.toContain('name="trophy"');
    expect(TARJETAS).toMatch(/<Icon name="flag" size=\{TAMANO_ICONO\.chico\}/);
    expect(TARJETAS).toMatch(/<Icon name="pencil" size=\{TAMANO_ICONO\.chico\}/);
    expect(TARJETAS).toMatch(/<Icon name="dots" size=\{TAMANO_ICONO\.normal\}/);
  });

  it('la semana con `calendar` dorado y «Tu 80/20» con las tres barras', () => {
    expect(TARJETAS).toMatch(/<Icon name="calendar" size=\{TAMANO_ICONO\.chico\} color=\{c\.goldInk\} \/>/);
    expect(TARJETAS).toMatch(/<Icon name="chartNoAxesColumn"/);
    expect(TARJETAS).not.toContain('name="zap"');
  });

});

describe('Plan: el eje y su objetivo', () => {
  it('se cambia de eje arriba, en el orden de las prioridades, con el ícono de cada eje', () => {
    expect(PLAN).toMatch(/<ControlSegmentado\s+opciones=\{ejesOrdenados\.map\(eje => \(\{\s*valor: eje,\s*etiqueta: ETIQUETA_CORTA_EJE\[eje\],/);
    expect(PLAN).toMatch(/onCambiar=\{cambiarEje\}/);
    expect(PLAN).toMatch(/achicarTexto/);
  });

  it('Fase actual, Prioridades clave, las acciones de hoy por eje y la sub-vista de Objetivos ya no están', () => {
    for (const viejo of ['Fase actual', 'Prioridades clave', 'TarjetaAccionesDeHoyPorEje', 'NivelesDelPlan', 'faseEnCurso', 'abrirObjetivoDe']) {
      expect(PLAN).not.toContain(viejo);
    }
  });

  it('«Arquitectura de tiempo» ya no está en Plan (2026-10-31, pedido del dueño: ya está en Yo) y no deja nada sin uso', () => {
    expect(PLAN).not.toContain('Arquitectura de tiempo');
    expect(PLAN).not.toMatch(/tramosDeLasFases|tramoEnCurso|rielDeFases|estiloTramo|filaDeFase|marcaDeFase/);
    expect(fs.existsSync(path.join(RAIZ, 'features/objetivos/utils/arquitecturaDeTiempo.ts'))).toBe(false);
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
  it('las acciones, «Tu 80/20» y los tres puntos se hunden al tocarlos (Presionable)', () => {
    expect(TARJETAS).toMatch(/<Presionable\s+onPress=\{alAbrirOpciones\}/);
    expect(TARJETAS).toMatch(/<Presionable key=\{accion\.id\} onPress=\{\(\) => alTocarUna\(accion, esDeHoy\)\}/);
    expect(TARJETAS).toMatch(/<Presionable\s+onPress=\{alAbrir\}/);
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

  it('«Agendar otro día», «Este mes» y los tres puntos tienen área propia de 48', () => {
    expect(TARJETAS).toMatch(/enlace: \{ minHeight: 48,/);
    expect(TARJETAS).toMatch(/esteMes: \{ minHeight: 48,/);
    expect(TARJETAS).toMatch(/puntos: \{ width: 48, height: 48,/);
  });
});

describe('Plan: el botón de abajo', () => {
  it('«Organizar mi semana ›» es el botón dorado de siempre, a todo el ancho y en tipo oración', () => {
    const eje = sinComentarios(leer(`${OBJETIVOS}/PlanDelEje.tsx`));
    expect(eje).toMatch(/<GoldButton label="Organizar mi semana" onPress=\{organizarMiSemana\} icon="chevron"/);
    expect(eje).toMatch(/textoDelBoton: \{ fontSize: 16, letterSpacing: 0 \}/);
  });
});
