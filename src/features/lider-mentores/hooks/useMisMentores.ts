import { obtenerPadron, obtenerPorResolver } from '../api/liderMentoresApi';
import { useLecturaDelLider } from './useLecturaDelLider';

/**
 * Lo que «Mis mentores» lee (spec 056 FR-001 a FR-005): el padrón con el cupo y los colores de cada mentor, y «Por resolver». Son dos
 * lecturas aparte a propósito: si «Por resolver» falla (un servidor anterior no la tiene), el padrón se ve igual y la sección simplemente no
 * aparece; si falla el padrón no hay nada que listar y se dice por qué.
 */
export function useMisMentores() {
  const padron = useLecturaDelLider(obtenerPadron, 'padron');
  const porResolver = useLecturaDelLider(obtenerPorResolver, 'por-resolver');
  return {
    padron: padron.datos,
    cargando: padron.cargando,
    fallo: padron.fallo,
    detalle: padron.detalle,
    porResolver: porResolver.datos,
    recargar: () => {
      void padron.recargar();
      void porResolver.recargar();
    },
  };
}
