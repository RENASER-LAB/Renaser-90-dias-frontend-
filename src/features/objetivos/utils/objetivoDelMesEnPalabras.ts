import { cifraEscrita, type MesDelPlan, type MotivoSinCifra, type PlanMensualDelEje } from '../api/planMensualApi';

/**
 * El objetivo de UN mes de un eje, dicho en palabras para «Planificar mi mes» (spec 028). Pura: parte de lo que ya trae
 * `GET /rocks/monthly/plan` (la cuenta la hace el servidor, no la app) y decide qué se lee y si la cifra se puede escribir.
 *
 * Tres cosas que importan:
 * - **Propuesto o tuyo**: `editado` dice si la cifra la escribió la persona; si no, la propone el sistema.
 * - **Sin cifra no es un error**: el servidor puede no calcularla (no se mide con un número, ritmo no saludable, lo acompaña el equipo…)
 *   y cada motivo se dice en una línea, sin inventar un número.
 * - **Escribirla necesita unidad**: media meta da 400 (`meta`, `avance` y `unidad` van los tres o ninguno), así que sin unidad en el
 *   eje no se ofrece «Cambiar»: no habría qué guardar.
 */

export const TEXTO_DEL_MOTIVO: Readonly<Record<MotivoSinCifra, string>> = {
  SIN_DATOS: 'Todavía no hay datos para calcular una cifra.',
  SIN_TIPO: 'Tu objetivo no se mide con un número.',
  SIN_RECORRIDO: 'Se calcula cuando haya un recorrido que medir.',
  ACOMPANAMIENTO_CLINICO: 'Tu equipo te acompaña en este objetivo; no lleva cifra.',
  FUERA_DE_ALCANCE: 'La meta está fuera de alcance para este mes.',
  RITMO_NO_SALUDABLE: 'Ese ritmo no es saludable; no se propone una cifra.',
};

export const TEXTO_SIN_CIFRA = 'Este mes no lleva cifra.';
export const TEXTO_SIN_PLAN = 'Todavía no tenemos el plan de este mes.';

export type ObjetivoDelMes =
  | {
      tipo: 'cifra';
      /** `81,6 kg`. */
      cifra: string;
      /** `true` = la escribió la persona; `false` = la propone el sistema. */
      tuyo: boolean;
      yaAlcanzado: boolean;
      /** El día del programa en que cierra el mes (30, 60 o 90). */
      diaDeCierre: number;
      puedeCambiar: boolean;
    }
  | { tipo: 'titulo'; texto: string; tuyo: boolean; diaDeCierre: number; puedeCambiar: boolean }
  | { tipo: 'sin-cifra'; texto: string; diaDeCierre: number; puedeCambiar: boolean }
  | { tipo: 'sin-plan' };

export function objetivoDelMesEnPalabras(mes: MesDelPlan | undefined, plan: PlanMensualDelEje | undefined): ObjetivoDelMes {
  if (!mes || !plan) return { tipo: 'sin-plan' };
  const puedeCambiar = plan.unidad.trim() !== '';
  const base = { diaDeCierre: mes.diaDeCierre, puedeCambiar };
  if (mes.cifra != null && (mes.estado === 'CON_CIFRA' || mes.estado === 'YA_ALCANZADO')) {
    return {
      tipo: 'cifra',
      cifra: cifraEscrita(mes.cifra, plan.unidad, plan.unidadAdelante),
      tuyo: mes.editado,
      yaAlcanzado: mes.estado === 'YA_ALCANZADO',
      ...base,
    };
  }
  if (mes.estado === 'SOLO_TITULO' && mes.titulo?.trim()) {
    return { tipo: 'titulo', texto: mes.titulo.trim(), tuyo: mes.editado, ...base };
  }
  return { tipo: 'sin-cifra', texto: mes.motivo ? TEXTO_DEL_MOTIVO[mes.motivo] : TEXTO_SIN_CIFRA, ...base };
}

/** Lo que dice el botón de la derecha: «Cambiar» si ya hay cifra, «Escribir la cifra» si no. `null` = no se ofrece. */
export function textoDelBotonDelMes(objetivo: ObjetivoDelMes): string | null {
  if (objetivo.tipo === 'sin-plan' || !objetivo.puedeCambiar) return null;
  return objetivo.tipo === 'cifra' ? 'Cambiar' : 'Escribir la cifra';
}
