import { useEffect, useState } from 'react';

import { obtenerDetalleAprendiz } from '../api/adminApi';

const DURACION_POR_DEFECTO = 90;

/**
 * Los días del programa de una persona, para acotar «Cambiar día del programa» (spec 022). Si quien abre la pantalla ya los sabe
 * (la ficha los leyó con el detalle) se usan tal cual y no se pide nada; si no (el aviso de emergencia del chat solo trae el día de
 * hoy), se lee el detalle una vez. Mientras se lee, o si la lectura falla, valen los 90 de siempre: el servidor vuelve a acotar el día
 * con la duración de la persona, así que un valor de menos solo avisa antes de enviar.
 */
export function useDuracionDelPrograma(aprendizId: string, conocida: number | null | undefined): number {
  const [leida, setLeida] = useState<number | null>(null);

  useEffect(() => {
    if (typeof conocida === 'number' && conocida > 0) return undefined;
    let vigente = true;
    obtenerDetalleAprendiz(aprendizId).then(
      detalle => {
        if (vigente && typeof detalle.programDuration === 'number' && detalle.programDuration > 0) setLeida(detalle.programDuration);
      },
      () => undefined,
    );
    return () => {
      vigente = false;
    };
  }, [aprendizId, conocida]);

  return typeof conocida === 'number' && conocida > 0 ? conocida : (leida ?? DURACION_POR_DEFECTO);
}
