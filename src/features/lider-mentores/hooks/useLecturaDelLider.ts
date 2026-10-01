import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import type { FalloSemaforo } from '../../semaforo/hooks/useMiSemaforo';

/**
 * Una lectura del servidor para las pantallas del líder: datos, cargando y por qué falló, con los
 * mismos motivos que el semáforo para reutilizar `FalloDeLectura` (404 no disponible, 403 sin permiso,
 * sin red, error). Un fallo nunca deja datos viejos que parezcan de ahora.
 *
 * `clave` cambia cuando cambia lo que se pide (otro mentor, otro mes): ahí se vuelve a pedir.
 */
export function useLecturaDelLider<T>(pedir: () => Promise<T>, clave: string) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloSemaforo | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const pedirActual = useRef(pedir);
  pedirActual.current = pedir;
  /* La respuesta de un pedido viejo (otro mes) no pisa la del nuevo. */
  const vigente = useRef(0);

  const cargar = useCallback(async () => {
    const turno = ++vigente.current;
    setCargando(true);
    setFallo(null);
    setDetalle(null);
    try {
      const respuesta = await pedirActual.current();
      if (turno === vigente.current) setDatos(respuesta);
    } catch (e) {
      if (turno !== vigente.current) return;
      setDatos(null);
      setFallo(motivoDelFallo(e));
      setDetalle(mensajeDeError(e, 'No se pudo cargar.'));
    } finally {
      if (turno === vigente.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [clave, cargar]);

  return { datos, cargando, fallo, detalle, recargar: cargar };
}

function motivoDelFallo(e: unknown): FalloSemaforo {
  if (e instanceof ApiError && e.status === 404) return 'no_disponible';
  if (e instanceof ApiError && e.esProhibido) return 'sin_permiso';
  if (e instanceof ApiError && e.esDeRed) return 'sin_red';
  return 'error';
}
