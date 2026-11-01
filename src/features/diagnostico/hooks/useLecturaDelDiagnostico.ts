import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import type { LecturaDelDiagnostico } from '../types/diagnostico.types';

export type CargarLecturaDelDiagnostico = () => Promise<LecturaDelDiagnostico>;

/**
 * Lo que se ve de la lectura de un diagnóstico (spec 026, contrato §4):
 * - `cargando`: todavía no se sabe. Quien la dibuja en una ficha NO pinta nada mientras tanto (un marco que se retira con un 404
 *   sería un parpadeo);
 * - `oculta`: no hay nada que mostrar —403 (otro rol o ya no la acompaña), 404 (backend sin la ruta u otra formación), la ficha
 *   estándar o ningún diagnóstico asignado—;
 * - `error`: un fallo de red o del servidor, con «Reintentar»;
 * - `lista`: la lectura.
 */
export type VistaDeLaLectura =
  | { tipo: 'cargando' }
  | { tipo: 'oculta' }
  | { tipo: 'error'; sinRed: boolean; reintentando: boolean }
  | { tipo: 'lista'; lectura: LecturaDelDiagnostico };

/** Con la ficha estándar o sin diagnóstico (`NO_APLICA`) no hay nada que leer. */
export function lecturaSinDiagnostico(lectura: LecturaDelDiagnostico): boolean {
  return lectura.ficha !== 'CON_DIAGNOSTICO' || lectura.estado === 'NO_APLICA';
}

/**
 * Lee el diagnóstico una vez al montar (y de nuevo si cambia `cargar`, que cada ficha arma con `useMemo` por persona). Sin
 * `cargar` no hay sección: una ficha sin a quién preguntarle no hace ningún pedido.
 */
export function useLecturaDelDiagnostico(cargar: CargarLecturaDelDiagnostico | null) {
  const [vista, setVista] = useState<VistaDeLaLectura>(cargar ? { tipo: 'cargando' } : { tipo: 'oculta' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!cargar) {
      setVista({ tipo: 'oculta' });
      return;
    }
    let vigente = true;
    setVista(previa => (previa.tipo === 'error' ? { ...previa, reintentando: true } : { tipo: 'cargando' }));
    cargar().then(
      lectura => {
        if (vigente) setVista(lecturaSinDiagnostico(lectura) ? { tipo: 'oculta' } : { tipo: 'lista', lectura });
      },
      (e: unknown) => {
        if (!vigente) return;
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) setVista({ tipo: 'oculta' });
        else setVista({ tipo: 'error', sinRed: e instanceof ApiError && e.status === 0, reintentando: false });
      },
    );
    return () => {
      vigente = false;
    };
  }, [cargar, intento]);

  const reintentar = useCallback(() => setIntento(n => n + 1), []);
  return { vista, reintentar };
}
