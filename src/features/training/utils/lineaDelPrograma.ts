import { faseEnCurso } from '../../home/utils/faseEnCurso';

export const DIAS_DEL_PROGRAMA_EN_TRAINING = 90;

/**
 * La línea bajo «TRAINING»: «El Espejo · Día 3 de 90». La fase la dice el servidor (`fase` de `/home`) y el nombre
 * sale de la única tabla de fases de la app; sin fase conocida queda solo el día, y sin día (programa sin arrancar)
 * no se dibuja nada: nada se inventa.
 */
export function lineaDelPrograma(fase: string | null | undefined, diaPrograma: number | null | undefined): string | null {
  if (diaPrograma == null || !Number.isFinite(diaPrograma) || diaPrograma < 1) return null;
  const dia = `Día ${diaPrograma} de ${DIAS_DEL_PROGRAMA_EN_TRAINING}`;
  const nombre = faseEnCurso(fase, diaPrograma)?.nombre;
  return nombre ? `${nombre} · ${dia}` : dia;
}
