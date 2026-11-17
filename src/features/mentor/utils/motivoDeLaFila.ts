import { destinoDe, type AvisoApi } from '../api/avisosApi';
import type { ColorSemaforo, DiaDelSemaforo } from '../../semaforo/types/semaforo.types';

/**
 * La línea gris bajo el nombre de un aprendiz (spec 055 FR-006): el aviso de acompañamiento vigente más reciente de ESA persona
 * (el que lleva a su ficha, `/mentor/groups/{g}/learners/{u}`) y, si no hay, su estado de la semana: «Cumplió N de 7 días»,
 * «Al día» o «Todavía sin datos». Pura, para probarla sin montar nada.
 */
export const SIN_DATOS_TEXTO = 'Todavía sin datos';

/** El aviso vigente (sin leer) más reciente del aprendiz, o `null`. Un aviso de otra persona no cuenta. */
export function avisoVigenteDe(aprendizId: string, avisos: readonly AvisoApi[]): AvisoApi | null {
  let elegido: AvisoApi | null = null;
  for (const aviso of avisos) {
    if (aviso.readAt !== null) continue;
    if (destinoDe(aviso)?.alumnoId !== aprendizId) continue;
    if (!elegido || Date.parse(aviso.createdAt) > Date.parse(elegido.createdAt)) elegido = aviso;
  }
  return elegido;
}

/** El estado de la semana en palabras, sin aviso. `dias` son los de la ventana (hasta 7). */
export function estadoDeLaSemana(color: ColorSemaforo, dias: readonly Pick<DiaDelSemaforo, 'color'>[], etiqueta: string | null = null): string {
  if (color === 'SIN_DATOS') return SIN_DATOS_TEXTO;
  if (color === 'VERDE') return 'Al día';
  if (dias.length === 0) return etiqueta?.trim() || SIN_DATOS_TEXTO;
  const cumplidos = dias.filter(d => d.color === 'VERDE').length;
  return `Cumplió ${cumplidos} de 7 días`;
}

export function motivoDeLaFila(params: {
  aprendizId: string;
  color: ColorSemaforo;
  dias: readonly Pick<DiaDelSemaforo, 'color'>[];
  etiqueta?: string | null;
  avisos: readonly AvisoApi[];
}): string {
  const aviso = avisoVigenteDe(params.aprendizId, params.avisos);
  return aviso?.body.trim() || estadoDeLaSemana(params.color, params.dias, params.etiqueta ?? null);
}
