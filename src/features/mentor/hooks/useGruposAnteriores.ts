import { useCallback, useEffect, useRef, useState } from 'react';

import { obtenerGruposAnteriores } from '../api/mentorApi';
import type { GrupoAnterior } from '../types/mentor.types';

/**
 * Los grupos que el mentor acompañó y ya no (spec 057 FR-020, FR-022). Se lee una vez al activarse y otra al pedir `recargar`.
 *
 * **Cualquier error es «no hay anteriores»**: un 404 (backend sin la ruta), un 403 o la red dejan «Mis grupos» como estaba (sin título
 * vacío), porque los anteriores son un dato de más, no lo que la pantalla necesita para mostrar sus grupos de hoy. Mientras llega
 * la primera lectura `listo` es `false`: quien decide si entra directo a un único grupo espera a saber si hay anteriores.
 * Solo la última lectura escribe (una lectura vieja nunca pisa a la nueva).
 */
export function useGruposAnteriores(activo: boolean) {
  const [anteriores, setAnteriores] = useState<GrupoAnterior[]>([]);
  const [listo, setListo] = useState(!activo);
  const ultima = useRef(0);

  const cargar = useCallback(async () => {
    if (!activo) return;
    const peticion = ++ultima.current;
    try {
      const lista = await obtenerGruposAnteriores();
      if (peticion === ultima.current) setAnteriores(lista);
    } catch {
      if (peticion === ultima.current) setAnteriores([]);
    } finally {
      if (peticion === ultima.current) setListo(true);
    }
  }, [activo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { anteriores, hayAnteriores: anteriores.length > 0, listo, recargar: cargar };
}
