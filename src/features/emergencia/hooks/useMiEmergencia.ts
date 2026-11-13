import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

import { leerMiEmergencia } from '../api/emergenciaApi';
import type { MiEmergencia } from '../api/emergenciaSchemas';
import { mostrarAccesoDeEmergencia } from '../utils/pedidoDeEmergencia';

/**
 * El pedido de emergencia del aprendiz (`GET /api/v1/me/emergency-request`, D-244). Se relee cada vez que
 * Yo vuelve a estar a la vista: soporte lo resuelve desde otro teléfono.
 *
 * `visible` es `false` solo para quien no es aprendiz (el servidor responde 403): el acceso no
 * aparece. Un fallo de red conserva lo último que se leyó.
 */
/**
 * `activo` es falso para el personal: el pedido de emergencia es solo de aprendices y el servidor responde 403 a cualquier otro rol
 * (#197). Sin esto, cada apertura de Yo del personal dejaba un 403 en el log.
 */
export function useMiEmergencia(activo = true) {
  const [mia, setMia] = useState<MiEmergencia | null>(null);
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    if (!activo) return;
    const este = ++pedido.current;
    try {
      const leida = await leerMiEmergencia();
      if (este === pedido.current) setMia(leida);
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (este === pedido.current && (status === 404 || status === 403)) setMia(null);
    }
  }, [activo]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  return { mia, visible: mostrarAccesoDeEmergencia(mia), recargar: cargar };
}
