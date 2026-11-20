import { mesVecino, nombreDelMes } from '../../lider-mentores/utils/lecturaDeMentores';
import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';
import type { AccionDeLaEvaluacionApi, EvaluacionPropiaApi, QuienBajaApi } from '../api/mentorSchemas';
import type { IconName } from '../../../components/Icon';

/**
 * Lo que «Mi evaluación» dice además del porcentaje (spec 057 FR-013): la diferencia con el mes anterior, «Qué sigue» y «Quién baja
 * el promedio». Todo viene calculado del servidor; acá solo se escribe en castellano. La app no recalcula ningún porcentaje.
 */

/** «3 puntos más que en octubre», «1 punto menos que en octubre», «igual que en octubre»; `null` si no hay con qué comparar. */
export function diferenciaConElMesAnterior(evaluacion: Pick<EvaluacionPropiaApi, 'mes' | 'porcentaje' | 'porcentajeMesAnterior' | 'estado'>): string | null {
  const { porcentaje, porcentajeMesAnterior } = evaluacion;
  if (evaluacion.estado !== 'CALCULADA' || porcentaje === null || porcentaje === undefined) return null;
  if (porcentajeMesAnterior === null || porcentajeMesAnterior === undefined) return null;
  const puntos = Math.round(porcentaje) - Math.round(porcentajeMesAnterior);
  const mes = nombreDelMes(mesVecino(evaluacion.mes, -1));
  if (puntos === 0) return `Igual que en ${mes}`;
  const n = Math.abs(puntos);
  return `${n} ${n === 1 ? 'punto' : 'puntos'} ${puntos > 0 ? 'más' : 'menos'} que en ${mes}`;
}

/** El color del borde del avatar de quien baja el promedio: rojo bajo 60 %, ámbar de 60 a 79 (las mismas reglas de FR-011 y FR-012). */
export function colorDeQuienBaja(porcentaje: number | null | undefined): ColorSemaforo {
  if (porcentaje === null || porcentaje === undefined) return 'SIN_DATOS';
  return Math.round(porcentaje) < 60 ? 'ROJO' : 'AMARILLO';
}

/** El ícono de cada tipo de acción; un tipo que esta versión no conoce no rompe nada: lleva el de «info». */
export function iconoDeLaAccion(tipo: string): IconName {
  switch (tipo) {
    case 'ESCRIBIR':
      return 'chat';
    case 'REVISAR_GRUPO':
      return 'users';
    case 'VENTANAS':
      return 'alarmClock';
    case 'RECONOCER':
      return 'award';
    default:
      return 'info';
  }
}

/** Solo se muestran las acciones que dicen algo: sin texto no hay qué leer. Como mucho 3 (FR-011). */
export function accionesQueSeMuestran(evaluacion: Pick<EvaluacionPropiaApi, 'acciones'>): AccionDeLaEvaluacionApi[] {
  return (evaluacion.acciones ?? []).filter(a => (a.accion ?? '').trim().length > 0).slice(0, 3);
}

/** Como mucho 5 (FR-012), tal como los manda el servidor: del menor al mayor. */
export function quienBajaQueSeMuestra(evaluacion: Pick<EvaluacionPropiaApi, 'quienBaja'>): QuienBajaApi[] {
  return (evaluacion.quienBaja ?? []).slice(0, 5);
}
