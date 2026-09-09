import { useAuth } from '../../../context/AuthContext';
import { ROL_MENTOR } from '../types/mentor.types';

/**
 * Si la persona que entró acompaña una célula.
 *
 * El rol viene del backend en `GET /api/v1/auth/me` y es un `string` a propósito: si mañana
 * aparece un rol nuevo, la app no revienta, simplemente no lo reconoce como mentor.
 *
 * Esto decide qué se MUESTRA, nunca qué se puede hacer: quien autoriza es el backend en cada
 * llamada. Un rol falseado en el móvil enseñaría una tarjeta vacía, no datos de nadie.
 */
export function useEsMentor(): boolean {
  const { user } = useAuth();
  const rol = user?.role?.toUpperCase();
  return Boolean(rol && (ROL_MENTOR as readonly string[]).includes(rol));
}
