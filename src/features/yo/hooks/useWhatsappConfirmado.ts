import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { leerWhatsappConfirmado, type EstadoDelWhatsapp } from '../api/whatsappConfirmadoApi';

/**
 * Spec 051: el WhatsApp confirmado de la sesión, para la fila de Yo → Ajustes → Perfil.
 *
 * - `null` mientras no se sabe y **si el servidor no lo ofrece** (un backend anterior, la función apagada: 404): la fila no se dibuja.
 * - **Una lectura vieja nunca pisa a una nueva** (cada una toma un turno y solo la última escribe), y otra cuenta no hereda nada de la anterior.
 * - `recargar` vuelve a leer del servidor: tras confirmar, la fila muestra lo que el servidor guardó, no lo que la app supone.
 */
export function useWhatsappConfirmado(): { estado: EstadoDelWhatsapp | null; recargar: () => Promise<void> } {
  const { user, isAuthenticated } = useAuth();
  const cuentaId = isAuthenticated ? (user?.id ?? null) : null;
  const [estado, setEstado] = useState<EstadoDelWhatsapp | null>(null);
  const turno = useRef(0);

  const recargar = useCallback(async () => {
    if (!cuentaId) return;
    const mio = ++turno.current;
    try {
      const nuevo = await leerWhatsappConfirmado();
      if (mio === turno.current) setEstado(nuevo);
    } catch {
      // Sin red o sin la función: se queda lo que ya se sabía (o nada); la fila no inventa un estado.
    }
  }, [cuentaId]);

  useEffect(() => {
    turno.current += 1;
    setEstado(null);
    void recargar();
  }, [cuentaId, recargar]);

  return { estado, recargar };
}
