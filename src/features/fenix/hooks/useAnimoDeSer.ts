import { useAuth } from '../../auth/context/AuthContext';
import { tieneSemaforoPropio, useColorDelSemaforoVigente } from '../../semaforo/estado/useSemaforoVigente';
import type { PhoenixMood } from '../rive/phoenixMaster';
import { animoDelBotonDeSer } from '../utils/animoDelFenix';

/** El ánimo del fénix de SER: el del semáforo vigente de quien mira (fuente compartida, sin pedidos), o neutral. */
export function useAnimoDeSer(): PhoenixMood {
  const { user } = useAuth();
  return animoDelBotonDeSer(tieneSemaforoPropio(user?.role), useColorDelSemaforoVigente());
}
