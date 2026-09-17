import { useCallback, useEffect, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import * as celulaApi from '../api/celulaApi';
import type { CellMember, MiCelulaInfo } from '../types/community.types';

/**
 * Estado real de "mi célula" contra el backend Java — mentor asignado + integrantes de la
 * célula, usados en la pantalla principal de Comunidad (sección MENTOR / TRIBU PRIVADA). Mismo
 * patrón que `useWallFeed`: la pantalla no arma llamadas de red sueltas, las pide acá.
 *
 * Las dos llamadas (`/me/cell` y `/me/cell/members`) se piden en paralelo: son independientes
 * entre sí (una puede fallar sin tumbar la otra tendría más sentido, pero acá se optó por
 * `Promise.all` porque en la práctica ambas fallan o funcionan juntas — comparten el mismo guard
 * de autorización en el backend, `requireActorActivo`).
 */
export function useMiCelula() {
  const [miCelula, setMiCelula] = useState<MiCelulaInfo | null>(null);
  const [miembros, setMiembros] = useState<CellMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [celula, companeros] = await Promise.all([
        celulaApi.obtenerMiCelula(),
        celulaApi.obtenerMisCompaneros(),
      ]);
      setMiCelula(celula);
      setMiembros(companeros);
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar tu grupo. Revisa tu conexión e inténtalo de nuevo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { miCelula, miembros, loading, error, recargar };
}
