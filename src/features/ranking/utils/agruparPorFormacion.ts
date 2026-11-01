import type { EntradaRankingDto } from '../api/rankingApi';
import { ordenDeFormaciones } from '../../formaciones/utils/opcionesDeLaComunidad';

/**
 * El ranking de la Comunidad cuando Administración, Alquimista o Soporte TI lo leen en «Todas» (spec 024): cada formación compara solo
 * a los suyos y la posición de cada fila es DENTRO de su formación, así que la tabla se agrupa con un encabezado por formación.
 *
 * Puro. No calcula ni reordena nada: dentro de cada grupo las filas quedan en el orden en que llegan (el del servidor) y
 * `posicion` es la que mandó el servidor. Esta función solo las reparte.
 */
export type GrupoDeRanking = { formacion: string; entradas: EntradaRankingDto[] };

/** Lo que se agrupa por defecto una fila que no dice su formación: lo que existía antes de las formaciones es de la Escuela. */
const FORMACION_SIN_DATO = 'ESCUELA';

function formacionDeLaFila(entrada: EntradaRankingDto): string | null {
  return typeof entrada.formation === 'string' && entrada.formation.trim() ? entrada.formation.trim() : null;
}

/**
 * Reparte las filas por formación (la Escuela primero, luego el Diplomado y la Certificación). Devuelve `null` cuando NINGUNA fila trae
 * formación (un servidor anterior, o una lectura de una sola formación): ahí la tabla se pinta como siempre, sin encabezados.
 */
export function agruparPorFormacion(entradas: readonly EntradaRankingDto[]): GrupoDeRanking[] | null {
  if (entradas.length === 0) return null;
  if (!entradas.some(e => formacionDeLaFila(e) !== null)) return null;
  const porFormacion = new Map<string, EntradaRankingDto[]>();
  for (const entrada of entradas) {
    const formacion = formacionDeLaFila(entrada) ?? FORMACION_SIN_DATO;
    const grupo = porFormacion.get(formacion);
    if (grupo) grupo.push(entrada);
    else porFormacion.set(formacion, [entrada]);
  }
  return ordenDeFormaciones([...porFormacion.keys()]).map(formacion => ({ formacion, entradas: porFormacion.get(formacion) ?? [] }));
}
