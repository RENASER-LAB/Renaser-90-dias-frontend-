import { useCallback, useEffect, useState } from 'react';

import { esNoDisponible, esProhibido } from '../api/mentorApi';
import { marcarAvisoLeido, obtenerAvisosDeAcompanamiento, type AvisoApi } from '../api/avisosApi';

/**
 * Los avisos de acompañamiento sin leer.
 *
 * Si la bandeja no está disponible se apaga la sección en silencio: un mentor no puede hacer
 * nada con un error de una lista que es complementaria a su trabajo, y ocupar la pantalla con
 * él solo estorba.
 */
export function useAvisosDeAcompanamiento(activo: boolean) {
  const [avisos, setAvisos] = useState<AvisoApi[]>([]);
  const [disponible, setDisponible] = useState(true);

  const cargar = useCallback(async () => {
    if (!activo) return;
    try {
      setAvisos(await obtenerAvisosDeAcompanamiento());
    } catch (e) {
      setAvisos([]);
      if (esNoDisponible(e) || esProhibido(e)) setDisponible(false);
    }
  }, [activo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* Optimista: se saca de la lista al instante y se avisa al servidor después. Si la llamada
     falla, la próxima carga lo devuelve — es preferible a que el mentor toque y no pase nada. */
  const marcarLeido = useCallback(async (id: number) => {
    setAvisos(previos => previos.filter(a => a.id !== id));
    try {
      await marcarAvisoLeido(id);
    } catch {
      void cargar();
    }
  }, [cargar]);

  const sinLeer = avisos.filter(a => a.readAt === null);
  return { avisos: sinLeer, disponible: disponible && sinLeer.length > 0, marcarLeido, recargar: cargar };
}
