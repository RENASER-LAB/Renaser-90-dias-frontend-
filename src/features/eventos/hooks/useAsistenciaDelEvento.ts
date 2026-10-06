import { useCallback, useEffect, useState } from 'react';

import * as asistenciaApi from '../api/asistenciaApi';
import type { ListaDeAsistencia } from '../types/asistencia.types';

/**
 * La lista de una fecha de un evento, para la tarjeta «Asistencia» del detalle (D-256).
 *
 * **Si no se puede leer, la tarjeta no existe.** Un backend sin estos endpoints responde 404, uno que
 * no autoriza responde 403, y sin red no hay nada útil que mostrar: en los tres casos `lista` queda en
 * `null` y quien la usa no dibuja nada. Así la app nueva contra un backend viejo sigue igual que antes.
 * Solo se pide cuando `habilitado` (quien puede verla, `puedeVerAsistencia`): al aprendiz no se le
 * hace un pedido que el servidor le negaría.
 */
/** La lista, o `null` si no se puede leer (404 de un backend viejo, 403, sin red): la tarjeta no se dibuja. */
export async function leerListaParaLaTarjeta(eventoId: string, inicioOcurrencia: string): Promise<ListaDeAsistencia | null> {
  try {
    return await asistenciaApi.verLista(eventoId, inicioOcurrencia);
  } catch {
    return null;
  }
}

export function useAsistenciaDelEvento(eventoId: string, inicioOcurrencia: string, habilitado: boolean) {
  const [lista, setLista] = useState<ListaDeAsistencia | null>(null);

  const leer = useCallback(async () => {
    setLista(await leerListaParaLaTarjeta(eventoId, inicioOcurrencia));
  }, [eventoId, inicioOcurrencia]);

  useEffect(() => {
    if (!habilitado) {
      setLista(null);
      return;
    }
    let vivo = true;
    void leerListaParaLaTarjeta(eventoId, inicioOcurrencia).then(l => vivo && setLista(l));
    return () => {
      vivo = false;
    };
  }, [eventoId, inicioOcurrencia, habilitado]);

  return { lista, recargar: leer };
}
