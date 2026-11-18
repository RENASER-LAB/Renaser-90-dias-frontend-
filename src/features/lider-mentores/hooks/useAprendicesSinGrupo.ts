import { useCallback } from 'react';

import { aprendicesDisponibles } from '../../admin/api/adminApi';
import type { AprendizCandidatoApi } from '../../admin/api/adminSchemas';
import { useLecturaDelLider } from './useLecturaDelLider';

/**
 * Los aprendices sin grupo de las formaciones del líder (spec 056 FR-008, FR-009): `GET /admin/cells/aprendices-disponibles` trae a todos los activos
 * e inscritos, con grupo o sin él (`cellId`); acá solo quedan los que no tienen ninguno. El servidor ya acota la lista a las formaciones del líder.
 * `activo` apagado = no se pide nada (la hoja que lo usa está cerrada).
 */
export function useAprendicesSinGrupo(activo: boolean, clave: string) {
  const pedir = useCallback(async (): Promise<AprendizCandidatoApi[]> => {
    if (!activo) return [];
    return (await aprendicesDisponibles()).filter(a => !a.cellId);
  }, [activo]);
  const lectura = useLecturaDelLider(pedir, `${activo ? 'si' : 'no'}|${clave}`);
  return { aprendices: lectura.datos, cargando: lectura.cargando && activo, fallo: lectura.fallo, detalle: lectura.detalle, recargar: lectura.recargar };
}
