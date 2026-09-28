import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

import { leerMiCaja } from '../api/cajaApi';
import type { MiCaja } from '../api/cajaSchemas';
import { etiquetaParaElAprendiz } from '../utils/estadosDeCaja';

/**
 * La caja del aprendiz (`GET /api/v1/me/caja`). Se relee cada vez que Yo vuelve a estar a la vista:
 * el Admin la mueve desde otro teléfono y el aviso puede llegar con la pestaña abierta.
 *
 * `visible` es `false` mientras no hay nada que mostrarle (antes del día 8, en pausa, fuera de la app)
 * y también si el servidor no la tiene o no es para esta cuenta (404/403, staff): la tarjeta no
 * aparece. Un fallo de red conserva lo último que se leyó.
 */
export function useMiCaja() {
  const [caja, setCaja] = useState<MiCaja | null>(null);
  const [cargando, setCargando] = useState(true);
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    const este = ++pedido.current;
    setCargando(true);
    try {
      const leida = await leerMiCaja();
      if (este === pedido.current) setCaja(leida);
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (este === pedido.current && (status === 404 || status === 403)) setCaja(null);
    } finally {
      if (este === pedido.current) setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  return { caja, visible: !!caja && etiquetaParaElAprendiz(caja.estado) !== null, cargando, recargar: cargar };
}
