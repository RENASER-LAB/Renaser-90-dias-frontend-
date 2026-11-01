import { useEffect, useState } from 'react';

import { obtenerHabitosDeTodos } from '../api/habitosDeTodosApi';

/**
 * ¿Ofrece el servidor «Hábitos de todos»? (spec 029). Se sabe pidiendo el día de hoy: con 200, la fila de Yo → «Mis mentores» se
 * dibuja; con 404 o 403 (un backend anterior, u otro rol) o con cualquier otro fallo, no. Nunca se dibuja una entrada que no se pudo
 * confirmar, y mientras se pregunta (`null`) tampoco: sin parpadeo. La misma regla de «Todos los aprendices».
 *
 * Lo monta quien tiene Yo (no la fila): al volver de la pantalla la fila no desaparece mientras se vuelve a preguntar.
 *
 * @param activo `false` = no se pregunta nada (quien no lidera mentores no paga un pedido).
 */
export function useHabitosDeTodosDisponibles(activo: boolean): boolean | null {
  const [disponible, setDisponible] = useState<boolean | null>(null);

  useEffect(() => {
    if (!activo) {
      setDisponible(null);
      return;
    }
    let vigente = true;
    obtenerHabitosDeTodos({ fecha: null, grupo: null, formacion: null, categoria: null })
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
