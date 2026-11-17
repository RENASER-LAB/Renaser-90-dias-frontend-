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

/**
 * El aviso en pocas palabras, sin repetir el nombre que ya va arriba en la fila (pedido del dueño: menos texto). Los dos
 * motivos del servidor (`MotivoAviso`: sin actividad y evidencia vencida) se dicen al revés, con la cifra primero; otro texto
 * queda tal cual, sin el nombre, sin el punto final y en tipo oración.
 */
export function motivoCorto(cuerpo: string, nombre?: string | null): string {
  let t = cuerpo.trim();
  const n = nombre?.trim();
  if (n && t.toLocaleLowerCase('es').startsWith(n.toLocaleLowerCase('es'))) t = t.slice(n.length).trim();
  t = t.replace(/\.$/, '').trim();
  const sinActividad = /^no registra actividad hace (\d+) d[ií]as?$/i.exec(t);
  if (sinActividad) return `${sinActividad[1]} ${sinActividad[1] === '1' ? 'día' : 'días'} sin actividad`;
  const pendientes = /^tiene (\d+) evidencias? pendientes?$/i.exec(t);
  if (pendientes) return pendientes[1] === '1' ? '1 evidencia pendiente' : `${pendientes[1]} evidencias pendientes`;
  return t ? t.charAt(0).toLocaleUpperCase('es') + t.slice(1) : t;
}

export function motivoDeLaFila(params: {
  aprendizId: string;
  nombre?: string | null;
  color: ColorSemaforo;
  dias: readonly Pick<DiaDelSemaforo, 'color'>[];
  etiqueta?: string | null;
  avisos: readonly AvisoApi[];
}): string {
  const aviso = avisoVigenteDe(params.aprendizId, params.avisos);
  const corto = aviso ? motivoCorto(aviso.body, params.nombre) : '';
  return corto || estadoDeLaSemana(params.color, params.dias, params.etiqueta ?? null);
}
