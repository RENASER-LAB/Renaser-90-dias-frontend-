import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import { cambiarCodigoRenaserEnFichas, leerCodigoRenaserEnFichas, type CodigoRenaserEnFichasApi } from '../api/codigoRenaserEnFichasApi';

export type FalloDelCodigoRenaser = 'sin_permiso' | 'no_disponible' | 'sin_red' | 'error';

function falloDe(error: unknown): FalloDelCodigoRenaser {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'sin_permiso';
    if (error.status === 404) return 'no_disponible';
    if (error.status === 0) return 'sin_red';
  }
  return 'error';
}

/**
 * Lo que sabe la pantalla «Código Renaser en las fichas» (spec 034): el estado que dice el servidor y cambiarlo.
 *
 * - **El servidor es la verdad**: el interruptor no se mueve solo; mientras el cambio viaja (`guardando`) se queda donde
 *   estaba y, si el servidor lo rechaza, no se movió (el estado se conserva y se dice qué pasó, con `reintentar`).
 * - Se lee al abrir la pantalla (`activo`), no antes: Administración monta sus hooks siempre.
 * - Un cambio hecho dos veces seguidas manda un solo pedido (`guardando` lo frena).
 */
export function useCodigoRenaserEnFichas(activo = true) {
  const [estado, setEstado] = useState<CodigoRenaserEnFichasApi | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<FalloDelCodigoRenaser | null>(null);
  /** El cambio que falló, para «Reintentar» (`null` si falló la lectura). */
  const [cambioPendiente, setCambioPendiente] = useState<boolean | null>(null);
  const enVuelo = useRef(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    setCambioPendiente(null);
    try {
      setEstado(await leerCodigoRenaserEnFichas());
    } catch (error) {
      setFallo(falloDe(error));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (activo) void cargar();
  }, [activo, cargar]);

  /** @returns el estado nuevo si el servidor lo aceptó; `null` si no (el fallo queda en `fallo`). */
  const cambiar = useCallback(async (visible: boolean): Promise<CodigoRenaserEnFichasApi | null> => {
    if (enVuelo.current) return null;
    enVuelo.current = true;
    setGuardando(true);
    setFallo(null);
    setCambioPendiente(null);
    try {
      const nuevo = await cambiarCodigoRenaserEnFichas(visible);
      setEstado(nuevo);
      return nuevo;
    } catch (error) {
      setFallo(falloDe(error));
      setCambioPendiente(visible);
      return null;
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  }, []);

  /** «Reintentar»: vuelve a pedir lo que falló (el cambio, o la lectura). */
  const reintentar = useCallback(async () => {
    if (cambioPendiente !== null) return cambiar(cambioPendiente);
    await cargar();
    return null;
  }, [cambioPendiente, cambiar, cargar]);

  return { estado, cargando, guardando, fallo, cambiar, reintentar };
}
