import { useColorDelSemaforoVigente } from '../../semaforo/estado/useSemaforoVigente';
import type { PhoenixMood } from '../rive/phoenixMaster';
import { animoDelSemaforo } from '../utils/animoDelFenix';

/**
 * El ánimo del fénix de SER: el del semáforo vigente de quien mira (fuente compartida, sin pedidos), o neutral si no hay.
 * No depende del rol: un administrador o un líder que hace su programa personal tiene su semáforo y su fénix lo refleja
 * (E-576: con el semáforo en rojo el fénix de un administrador seguía neutral, que se ve alegre).
 */
export function useAnimoDeSer(): PhoenixMood {
  return animoDelSemaforo(useColorDelSemaforoVigente());
}
