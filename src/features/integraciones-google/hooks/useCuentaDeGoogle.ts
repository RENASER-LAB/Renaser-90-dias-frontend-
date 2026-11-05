import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { ApiError } from '../../../services/http/apiClient';
import {
  desconectarLaCuentaDeGoogle,
  empezarLaConexionConGoogle,
  leerLaCuentaDeGoogle,
  type CuentaDeGoogleApi,
} from '../api/cuentaDeGoogleApi';

export type FalloDeLaCuenta = 'sin_permiso' | 'no_disponible' | 'sin_red' | 'error';

function falloDe(error: unknown): FalloDeLaCuenta {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'sin_permiso';
    if (error.status === 404) return 'no_disponible';
    if (error.status === 0) return 'sin_red';
  }
  return 'error';
}

/**
 * Lo que sabe la pantalla «Cuenta de Google» (spec 040): el estado que dice el servidor, conectar y desconectar.
 *
 * - **El servidor es la verdad**: conectar abre la dirección de Google en el navegador y NO cambia nada acá; cuando la persona vuelve a
 *   Renaser (la app pasa a primer plano) se relee el estado. Nunca se da por conectada una cuenta sin que el servidor lo diga.
 * - Desconectar manda un solo pedido aunque se toque dos veces.
 * - Se lee al abrir la pantalla (`activo`), no antes.
 */
export function useCuentaDeGoogle(activo = true) {
  const [cuenta, setCuenta] = useState<CuentaDeGoogleApi | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [trabajando, setTrabajando] = useState(false);
  const [fallo, setFallo] = useState<FalloDeLaCuenta | null>(null);
  /** Se abrió el navegador y todavía no se volvió: la pantalla dice «Termina en el navegador…». */
  const [esperandoAGoogle, setEsperandoAGoogle] = useState(false);
  const enVuelo = useRef(false);

  const cargar = useCallback(async (enSilencio = false) => {
    if (!enSilencio) setCargando(true);
    setFallo(null);
    try {
      setCuenta(await leerLaCuentaDeGoogle());
    } catch (error) {
      setFallo(falloDe(error));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (activo) void cargar();
  }, [activo, cargar]);

  // Al volver del navegador se relee en silencio (sin vaciar lo que se ve).
  useEffect(() => {
    if (!activo) return;
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'active') {
        setEsperandoAGoogle(false);
        void cargar(true);
      }
    });
    return () => suscripcion.remove();
  }, [activo, cargar]);

  /** @returns `true` si se abrió Google. */
  const conectar = useCallback(async (): Promise<boolean> => {
    if (enVuelo.current) return false;
    enVuelo.current = true;
    setTrabajando(true);
    setFallo(null);
    try {
      const url = await empezarLaConexionConGoogle();
      await Linking.openURL(url);
      setEsperandoAGoogle(true);
      return true;
    } catch (error) {
      setFallo(error instanceof ApiError ? falloDe(error) : 'error');
      return false;
    } finally {
      enVuelo.current = false;
      setTrabajando(false);
    }
  }, []);

  /** @returns `true` si el servidor desconectó la cuenta. */
  const desconectar = useCallback(async (): Promise<boolean> => {
    if (enVuelo.current) return false;
    enVuelo.current = true;
    setTrabajando(true);
    setFallo(null);
    try {
      await desconectarLaCuentaDeGoogle();
      await cargar(true);
      return true;
    } catch (error) {
      setFallo(falloDe(error));
      return false;
    } finally {
      enVuelo.current = false;
      setTrabajando(false);
    }
  }, [cargar]);

  return { cuenta, cargando, trabajando, fallo, esperandoAGoogle, conectar, desconectar, recargar: cargar };
}
