import { useCallback, useEffect, useState } from 'react';

import { leerCaja } from '../api/cajaApi';
import type { DetalleDeCaja } from '../api/cajaSchemas';
import { falloDe, type FalloDeCaja } from './useCajasAdmin';

/**
 * El detalle de una caja. Toda operación del Admin devuelve el detalle entero: `actualizar` lo pone
 * en su lugar sin volver a pedirlo.
 */
export function useDetalleDeCaja(aprendizId: string) {
  const [detalle, setDetalle] = useState<DetalleDeCaja | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloDeCaja | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDetalle(await leerCaja(aprendizId));
    } catch (error) {
      setFallo(falloDe(error));
    } finally {
      setCargando(false);
    }
  }, [aprendizId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const actualizar = useCallback((nuevo: DetalleDeCaja) => {
    setDetalle(nuevo);
    setFallo(null);
  }, []);

  return { detalle, cargando, fallo, recargar: cargar, actualizar };
}
