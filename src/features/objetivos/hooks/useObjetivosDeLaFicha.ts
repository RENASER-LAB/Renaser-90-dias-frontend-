import { useEffect, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import type { CargarObjetivos, ObjetivosDeLaPersona } from '../../lider-mentores/types/objetivosDeLaPersona.types';

/**
 * Lo que se ve de los objetivos de otra persona (spec 056 FR-016, FR-027): `cargando` y `oculta` no dibujan nada —ni marco ni mensaje—;
 * `lista` trae los objetivos. **Cualquier error es «oculta»** (salvo el 404 con `SIN_PROGRAMA_ACTIVO`, que dice «Todavía no tiene objetivos»): un 404 (backend sin la ruta), un 403 (otro rol, fuera de su alcance) o
 * un fallo de red dejan la ficha como estaba; los objetivos son un dato de más, no lo que la ficha necesita para mostrar a la persona.
 */
export type VistaDeLosObjetivos =
  | { tipo: 'cargando' }
  | { tipo: 'oculta' }
  /** Spec 057 FR-003/FR-004: 404 con `codigo: SIN_PROGRAMA_ACTIVO` (sin programa, Día 0 o suspendido): una línea, no un hueco. */
  | { tipo: 'sin-programa' }
  | { tipo: 'lista'; objetivos: ObjetivosDeLaPersona };

export const CODIGO_SIN_PROGRAMA_ACTIVO = 'SIN_PROGRAMA_ACTIVO';

/** Cuántos objetivos tiene: los del programa y el del mes (la semana se cuenta aparte, en acciones). */
export function cuantosObjetivos(o: ObjetivosDeLaPersona): number {
  return o.noventaDias.length + (o.mes ? 1 : 0);
}

/** `true` si no hay nada que mostrar: ni objetivos ni semana. */
export function sinObjetivos(o: ObjetivosDeLaPersona): boolean {
  return cuantosObjetivos(o) === 0 && !o.semana;
}

/**
 * Lee los objetivos una vez al montar (y de nuevo si cambia `cargar`, que cada ficha arma con `useMemo` por persona). Sin `cargar` no
 * hay sección y no se pide nada.
 */
export function useObjetivosDeLaFicha(cargar: CargarObjetivos | null): VistaDeLosObjetivos {
  const [vista, setVista] = useState<VistaDeLosObjetivos>(cargar ? { tipo: 'cargando' } : { tipo: 'oculta' });

  useEffect(() => {
    if (!cargar) {
      setVista({ tipo: 'oculta' });
      return;
    }
    let vigente = true;
    setVista({ tipo: 'cargando' });
    cargar().then(
      objetivos => {
        if (vigente) setVista(sinObjetivos(objetivos) ? { tipo: 'oculta' } : { tipo: 'lista', objetivos });
      },
      error => {
        const sinPrograma = error instanceof ApiError && error.status === 404 && error.codigo === CODIGO_SIN_PROGRAMA_ACTIVO;
        if (vigente) setVista({ tipo: sinPrograma ? 'sin-programa' : 'oculta' });
      },
    );
    return () => {
      vigente = false;
    };
  }, [cargar]);

  return vista;
}
