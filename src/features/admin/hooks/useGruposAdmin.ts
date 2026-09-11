import { useCallback, useEffect, useMemo, useState } from 'react';

import { listarCohortes, listarGruposDeCohorte } from '../api/adminApi';
import type { CohorteAdminApi, GrupoResumenApi } from '../api/adminSchemas';
import type { GrupoAdmin } from '../types/admin.types';
import { mensajeDeFallo } from '../utils/mensajes';

export type FiltroGrupos = 'vigentes' | 'programados' | 'cerrados' | 'todos';

/**
 * Todos los grupos, de todas las cohortes.
 *
 * `GET /admin/cells` EXIGE `cohortId` — no existe un listado suelto — así que se recorren las
 * cohortes. Son pocas y su cantidad no crece con el padrón, a diferencia de los aprendices; por
 * eso esto no es el N+1 que en otras pantallas sí habría que evitar.
 *
 * El filtro se aplica sobre `status`, que lo calcula el SERVIDOR en la zona del programa. Que lo
 * decidiera el teléfono significaría que dos administradores en husos distintos ven cerrar el
 * mismo grupo en días distintos.
 */
export function useGruposAdmin() {
  const [cohortes, setCohortes] = useState<CohorteAdminApi[]>([]);
  const [grupos, setGrupos] = useState<GrupoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroGrupos>('vigentes');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const listaDeCohortes = await listarCohortes();
      setCohortes(listaDeCohortes);
      const porCohorte = await Promise.all(listaDeCohortes.map(co => listarGruposDeCohorte(co.id)));
      setGrupos(porCohorte.flat().map(aGrupoAdmin));
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudieron cargar los grupos.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const porEstado = grupos.filter(g => {
      if (filtro === 'todos') return true;
      if (filtro === 'vigentes') return g.estado === 'VIGENTE' || g.estado === 'SIN_PERIODO';
      if (filtro === 'programados') return g.estado === 'PROGRAMADO';
      return g.estado === 'CERRADO';
    });
    // Vigentes primero y, dentro de cada tramo, el que cierra antes: es el que necesita decisión.
    return porEstado.sort((a, b) => {
      const fa = a.periodoFin ?? '9999-12-31';
      const fb = b.periodoFin ?? '9999-12-31';
      return fa === fb ? a.nombre.localeCompare(b.nombre) : fa.localeCompare(fb);
    });
  }, [grupos, filtro]);

  return { cohortes, grupos: visibles, total: grupos.length, cargando, error, filtro, setFiltro, recargar: cargar };
}

export function aGrupoAdmin(api: GrupoResumenApi): GrupoAdmin {
  return {
    id: api.id,
    nombre: api.name,
    cohorteId: api.cohortId,
    mentorNombre: api.mentor?.fullName ?? null,
    especialidadMentor: null,
    periodoInicio: api.periodStart ?? null,
    periodoFin: api.periodEnd ?? null,
    estado: api.status ?? null,
    tipo: api.type ?? null,
    aprendices: api.learnerCount ?? api.memberCount ?? null,
    cupo: api.capacity ?? null,
  };
}
