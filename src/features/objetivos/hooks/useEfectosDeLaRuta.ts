import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

import { tacto } from '../../../utils/tacto';
import { efectosQueSeDisparan, SIN_EFECTOS, type EfectosDeLaRuta, type FotoDeLaRuta } from '../utils/efectosDeLaRuta';

/**
 * Los efectos de la ruta de Plan (spec 058, FR-014): compara la foto de ahora con la última que se VIO y avisa qué cambió de verdad. `n`
 * sube una vez por cada cambio real, así cada animación se dispara una vez (un redibujado con los mismos datos no cambia nada).
 *
 * - Solo se compara con Plan a la vista (`useIsFocused`): lo que se cumple en Entrenar se celebra al volver, no en un tab que nadie mira.
 * - El háptico de éxito sale con cada cumplido nuevo, también con «Reducir movimiento» (lo que no se anima es el movimiento, no el tacto).
 * - Es solo presentación: no lee ni escribe nada del servidor y no toca ningún botón, así que no afecta a «un toque, un pedido».
 */
export function useEfectosDeLaRuta(foto: FotoDeLaRuta): { n: number; efectos: EfectosDeLaRuta } {
  const enfocada = useIsFocused();
  const ultima = useRef<FotoDeLaRuta | null>(null);
  const [disparo, setDisparo] = useState<{ n: number; efectos: EfectosDeLaRuta }>({ n: 0, efectos: SIN_EFECTOS });
  const llave = JSON.stringify(foto);

  useEffect(() => {
    if (!enfocada) return;
    const efectos = efectosQueSeDisparan(ultima.current, foto);
    if (foto.cargada) ultima.current = foto;
    if (efectos === SIN_EFECTOS) return;
    if (efectos.popDe.length > 0) tacto.logro();
    setDisparo(anterior => ({ n: anterior.n + 1, efectos }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llave, enfocada]);

  return disparo;
}
