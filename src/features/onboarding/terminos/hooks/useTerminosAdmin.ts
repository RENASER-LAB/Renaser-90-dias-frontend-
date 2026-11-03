import { useCallback, useEffect, useState } from 'react';

import { mensajeDeError } from '../../../../services/http/apiClient';
import { leerDetalleDeTerminos, listarTerminos } from '../api/terminosApi';
import type { DetalleDeTerminosApi, ResumenDeTerminosApi } from '../api/terminosSchemas';

/** Las tres formaciones con el estado de sus términos (spec 027): cuál tiene versión vigente, cuál «Por revisar» y si hay borrador. */
export function useResumenDeTerminos(): { resumen: ResumenDeTerminosApi[]; cargando: boolean; fallo: string | null; recargar: () => Promise<void> } {
  const [resumen, setResumen] = useState<ResumenDeTerminosApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setResumen(await listarTerminos());
    } catch (e) {
      setFallo(mensajeDeError(e, 'No pudimos leer los términos. Revisa tu conexión.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { resumen, cargando, fallo, recargar };
}

/** Los términos de UNA formación: la vigente, el borrador si hay y el historial de versiones. */
export function useDetalleDeTerminos(formacion: string): {
  detalle: DetalleDeTerminosApi | null;
  cargando: boolean;
  fallo: string | null;
  recargar: () => Promise<DetalleDeTerminosApi | null>;
} {
  const [detalle, setDetalle] = useState<DetalleDeTerminosApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setFallo(null);
    try {
      const lectura = await leerDetalleDeTerminos(formacion);
      setDetalle(lectura);
      return lectura;
    } catch (e) {
      setFallo(mensajeDeError(e, 'No pudimos leer los términos de esta formación. Revisa tu conexión.'));
      return null;
    } finally {
      setCargando(false);
    }
  }, [formacion]);

  useEffect(() => {
    setCargando(true);
    void recargar();
  }, [recargar]);

  return { detalle, cargando, fallo, recargar };
}
