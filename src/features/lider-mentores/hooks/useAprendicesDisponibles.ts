import { useEffect, useState } from 'react';

import { obtenerAprendicesDelLider } from '../api/aprendicesDelLiderApi';

/**
 * ¿Ofrece el servidor «Todos los aprendices»? (2026-10-31). Se sabe pidiendo una página mínima del listado: con 200 la
 * fila de Hoy → «Mis mentores» se dibuja; con 404 o 403 (un backend anterior, u otro rol) o con cualquier otro fallo, no.
 * Nunca se dibuja una entrada que no se pudo confirmar, y mientras se pregunta (`null`) tampoco: sin parpadeo.
 *
 * Lo monta quien tiene Hoy (no la fila): al volver de la lista la fila no desaparece mientras se vuelve a preguntar.
 *
 * @param activo `false` = no se pregunta nada (quien no lidera mentores no paga un pedido).
 */
export function useAprendicesDisponibles(activo: boolean): boolean | null {
  const [disponible, setDisponible] = useState<boolean | null>(null);

  useEffect(() => {
    if (!activo) {
      setDisponible(null);
      return;
    }
    let vigente = true;
    obtenerAprendicesDelLider({ pagina: 0, tamano: 1 })
      .then(() => {
        if (vigente) setDisponible(true);
      })
      .catch(() => {
        if (vigente) setDisponible(false);
      });
    return () => {
      vigente = false;
    };
  }, [activo]);

  return activo ? disponible : null;
}
