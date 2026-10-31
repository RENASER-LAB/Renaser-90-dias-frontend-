import { useCapacidades } from '../../admin/hooks/useCapacidades';
import { useAuth } from '../../auth/context/AuthContext';
import { puedeModerarElMuro, rolModeraElMuro } from '../utils/moderacionDelMuro';

/**
 * ¿Esta cuenta ve el «…» de moderación del Muro? Solo ADMIN y ALCHEMIST, y solo si el servidor lo confirma
 * (`canAdminister` de `GET /mentor/context`, la misma condición que muestra Administración): un fallo de la
 * consulta, un backend anterior o cualquier otro rol (líder, mentor, guía, aprendiz) lo dejan en `false`.
 *
 * La consulta solo se hace si el rol PODRÍA moderar (`activo`): el aprendiz que abre Comunidad no suma un pedido.
 */
export function usePuedeModerarElMuro(): boolean {
  const { user } = useAuth();
  const rol = user?.role;
  const { capacidades } = useCapacidades({ activo: rolModeraElMuro(rol) });
  return puedeModerarElMuro({ rol, administrar: capacidades.administrar });
}
