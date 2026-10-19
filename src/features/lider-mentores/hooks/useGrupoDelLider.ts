import { useLecturaPorSemana, type InicioSemanal, type LecturaDelGrupo } from '../../semaforo/hooks/useLecturaPorSemana';
import { obtenerTablaDelLider } from '../api/cumplimientoDelLiderApi';

/**
 * La lista de personas de un grupo para el líder (spec 005; `GET /leadership/groups/{g}/semaforo`).
 *
 * Es la misma lectura por semanas que la tabla del mentor y la de administración
 * (`useLecturaPorSemana`): arranca en la ventana vigente o donde se la indique `inicio` (la semana en que
 * estaba el resumen por grupos), se mueve con la misma navegación, descarta la respuesta de una semana que
 * ya no se mira y vacía los datos al cambiar de semana. `grupoId` `null` = no se pregunta nada.
 *
 * El orden de las filas lo pone el servidor (rojo, amarillo, sin datos, verde, «no se mide»; menor %
 * primero): la app no reordena.
 */
export function useGrupoDelLider(grupoId: string | null, inicio?: InicioSemanal): LecturaDelGrupo {
  return useLecturaPorSemana(
    semanaHasta => (grupoId ? obtenerTablaDelLider(grupoId, semanaHasta) : Promise.reject(new Error('Sin grupo'))),
    grupoId ? `lider:${grupoId}` : null,
    inicio,
  );
}
