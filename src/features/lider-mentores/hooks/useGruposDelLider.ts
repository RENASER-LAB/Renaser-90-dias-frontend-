import { obtenerGruposDelLider } from '../api/gruposDelLiderApi';
import { useLecturaDelLider } from './useLecturaDelLider';

/** Los grupos de las formaciones del líder (spec 056 FR-006), leídos del servidor; un fallo no deja grupos viejos a la vista. */
export function useGruposDelLider() {
  const lectura = useLecturaDelLider(obtenerGruposDelLider, 'grupos');
  return { grupos: lectura.datos, cargando: lectura.cargando, fallo: lectura.fallo, detalle: lectura.detalle, recargar: lectura.recargar };
}
