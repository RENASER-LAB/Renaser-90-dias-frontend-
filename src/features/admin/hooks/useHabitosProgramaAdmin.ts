import { useCallback, useEffect, useState } from 'react';

import { esDeRed, esProhibido } from '../../mentor/api/mentorApi';
import { leerHabitosDelPrograma, leerRolesElegibles } from '../api/habitosProgramaApi';
import type { HabitoDelProgramaApi, RolElegibleApi } from '../api/habitosProgramaSchemas';

export type FalloDeHabitos = 'sin_permiso' | 'sin_red' | 'error';

/**
 * El catálogo global y los roles elegibles, en paralelo. `reemplazar` y `quitar` ponen en su lugar lo
 * que devuelve cada cambio, sin volver a pedir la lista entera.
 *
 * Los roles fallan aparte a propósito: un backend anterior a D-264 no tiene `GET /roles` (404), y la
 * lista igual se muestra —todo «Para todos», sin filtro por rol—.
 */
export function useHabitosProgramaAdmin(activo = true) {
  const [habitos, setHabitos] = useState<HabitoDelProgramaApi[] | null>(null);
  const [roles, setRoles] = useState<RolElegibleApi[]>([]);
  const [cargando, setCargando] = useState(activo);
  const [fallo, setFallo] = useState<FalloDeHabitos | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    const [catalogo, elegibles] = await Promise.allSettled([leerHabitosDelPrograma(), leerRolesElegibles()]);
    if (catalogo.status === 'fulfilled') {
      setHabitos(catalogo.value);
    } else {
      const e = catalogo.reason;
      setFallo(esProhibido(e) ? 'sin_permiso' : esDeRed(e) ? 'sin_red' : 'error');
    }
    if (elegibles.status === 'fulfilled') setRoles(elegibles.value);
    setCargando(false);
  }, []);

  /* Solo cuando la pantalla se abre: Administración monta el hook siempre. */
  useEffect(() => {
    if (activo) void cargar();
  }, [activo, cargar]);

  const reemplazar = useCallback((habito: HabitoDelProgramaApi) => {
    setHabitos(actuales => {
      if (!actuales) return [habito];
      return actuales.some(h => h.id === habito.id)
        ? actuales.map(h => (h.id === habito.id ? habito : h))
        : [...actuales, habito];
    });
  }, []);

  const quitar = useCallback((id: string) => {
    setHabitos(actuales => (actuales ? actuales.filter(h => h.id !== id) : actuales));
  }, []);

  return { habitos, roles, cargando, fallo, recargar: cargar, reemplazar, quitar };
}
