import type { AvisoApi } from '../api/avisosApi';
import type { ColorSemaforo, SemaforoDelGrupo } from '../../semaforo/types/semaforo.types';
import type { AlumnoConEstado } from '../types/mentor.types';
import { motivoDeLaFila } from './motivoDeLaFila';
import { ordenDeAprendices } from './ordenDeAprendices';

/** Lo que dibuja cada fila de «Mi grupo». */
export interface FilaDeMiGrupo {
  aprendizId: string;
  nombre: string | null;
  avatarUrl: string | null;
  color: ColorSemaforo;
  motivo: string;
  /** El aprendiz tal como está en el padrón del grupo; `undefined` si ya no está (la fila no abre ficha). */
  alumno: AlumnoConEstado | undefined;
}

/**
 * Las filas de «Mi grupo», todas y en su orden (spec 055 FR-004 a FR-006). Con el semáforo del grupo salen de ahí (color,
 * porcentaje, foto); si el servidor no lo tiene (404 o 403) se cae a la lista simple del padrón, sin colores inventados: todos
 * «sin datos», que es neutro y no dice nada falso.
 */
export function filasDeMiGrupo(params: {
  semaforo: SemaforoDelGrupo | null;
  padron: readonly AlumnoConEstado[];
  avisos: readonly AvisoApi[];
}): FilaDeMiGrupo[] {
  const { semaforo, padron, avisos } = params;
  const delPadron = (id: string) => padron.find(a => a.participanteId === id);

  if (semaforo) {
    return ordenDeAprendices(semaforo.aprendices).map(a => ({
      aprendizId: a.aprendizId,
      nombre: a.nombre,
      avatarUrl: a.avatarUrl,
      color: a.color,
      motivo: motivoDeLaFila({ aprendizId: a.aprendizId, nombre: a.nombre, color: a.color, dias: a.dias, etiqueta: a.etiqueta, avisos }),
      alumno: delPadron(a.aprendizId),
    }));
  }
  return ordenDeAprendices(padron.map(a => ({ a, color: 'SIN_DATOS' as const, porcentaje: null, nombre: a.nombre }))).map(({ a }) => ({
    aprendizId: a.participanteId,
    nombre: a.nombre,
    avatarUrl: null,
    color: 'SIN_DATOS' as const,
    motivo: motivoDeLaFila({ aprendizId: a.participanteId, nombre: a.nombre, color: 'SIN_DATOS', dias: [], avisos }),
    alumno: a,
  }));
}
