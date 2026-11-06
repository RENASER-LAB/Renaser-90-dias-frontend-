import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { obtenerMiSobrenombre, type MiSobrenombre } from '../api/sobrenombreApi';

/**
 * Spec 046: el sobrenombre de la sesión, compartido por Hoy (la fila del día 7) y Yo (Ajustes → Perfil): elegirlo en uno se ve en el
 * otro sin volver a pedirlo. `null` mientras no se sabe o si el servidor no lo ofrece (un backend anterior): no se muestra nada.
 */
let estado: { usuarioId: string | null; mio: MiSobrenombre | null } = { usuarioId: null, mio: null };
const oyentes = new Set<() => void>();

function publicar(nuevo: typeof estado) {
  estado = nuevo;
  for (const o of [...oyentes]) o();
}

function suscribir(o: () => void) {
  oyentes.add(o);
  return () => {
    oyentes.delete(o);
  };
}

const leer = () => estado;

export function guardarMiSobrenombreLeido(usuarioId: string, mio: MiSobrenombre): void {
  publicar({ usuarioId, mio });
}

export function reiniciarMiSobrenombreParaPruebas(): void {
  estado = { usuarioId: null, mio: null };
  oyentes.clear();
}

export function useMiSobrenombre(): { mio: MiSobrenombre | null; recargar: () => void; actualizar: (m: MiSobrenombre) => void } {
  const { user, isAuthenticated } = useAuth();
  const usuarioId = isAuthenticated ? (user?.id ?? null) : null;
  const actual = useSyncExternalStore(suscribir, leer, leer);

  const recargar = useCallback(() => {
    if (!usuarioId) return;
    obtenerMiSobrenombre()
      .then(mio => publicar({ usuarioId, mio }))
      .catch(() => undefined);
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId) return;
    if (estado.usuarioId !== usuarioId) {
      publicar({ usuarioId, mio: null });
      recargar();
    }
  }, [usuarioId, recargar]);

  const actualizar = useCallback(
    (mio: MiSobrenombre) => {
      if (usuarioId) publicar({ usuarioId, mio });
    },
    [usuarioId],
  );

  return { mio: actual.usuarioId === usuarioId ? actual.mio : null, recargar, actualizar };
}
