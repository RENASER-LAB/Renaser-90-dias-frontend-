import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { leerFormacion, listarFormaciones } from '../api/formacionesApi';
import type { DetalleDeFormacion, TarjetaDeFormacion } from '../types/formaciones.types';

/** Qué falló al leer el centro: sin permiso no se ofrece «Reintentar»; lo demás sí. */
export type FalloDelCentro = { mensaje: string; sinPermiso: boolean };

function aFallo(e: unknown, porDefecto: string): FalloDelCentro {
  return { mensaje: mensajeDeError(e, porDefecto), sinPermiso: e instanceof ApiError && e.esProhibido };
}

/**
 * Las tres formaciones para Administración (spec 022). Una lectura al abrir; `recargar` la repite sin vaciar lo que se ve. Un fallo
 * no se convierte en ceros: sin lectura no hay tarjetas, solo el aviso con su «Reintentar».
 */
export function useFormacionesAdmin() {
  const [tarjetas, setTarjetas] = useState<TarjetaDeFormacion[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloDelCentro | null>(null);
  const turno = useRef(0);

  const recargar = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    setFallo(null);
    try {
      const leidas = await listarFormaciones();
      if (mio === turno.current) setTarjetas(leidas);
    } catch (e) {
      if (mio === turno.current) setFallo(aFallo(e, 'No pudimos cargar las formaciones. Revisa tu conexión.'));
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
    return () => {
      turno.current += 1;
    };
  }, [recargar]);

  return { tarjetas, cargando, fallo, recargar };
}

/** El detalle de UNA formación. Cada lectura toma un turno y solo la última escribe. */
export function useDetalleDeFormacion(codigo: string) {
  const [detalle, setDetalle] = useState<DetalleDeFormacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloDelCentro | null>(null);
  const turno = useRef(0);

  const recargar = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    setFallo(null);
    try {
      const leido = await leerFormacion(codigo);
      if (mio !== turno.current) return;
      setDetalle(leido);
      if (!leido) setFallo({ mensaje: 'No pudimos leer esta formación.', sinPermiso: false });
    } catch (e) {
      if (mio === turno.current) setFallo(aFallo(e, 'No pudimos cargar esta formación. Revisa tu conexión.'));
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, [codigo]);

  useEffect(() => {
    void recargar();
    return () => {
      turno.current += 1;
    };
  }, [recargar]);

  return { detalle, cargando, fallo, recargar };
}
