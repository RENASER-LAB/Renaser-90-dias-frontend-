import { useCallback, useEffect, useState } from 'react';
import { mensajeDeError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import { activarElProgramaDeManana } from '../utils/activacionAlFirmar';
import { AVISO_SIN_RED_AL_ACTIVAR, yaEmpezo } from '../utils/textoDelDiaUno';

/**
 * Lo que ve la pantalla «Tu programa empieza mañana» del onboarding mientras el programa se activa solo (spec 036):
 *  - `activando`: el pedido está en vuelo («Preparando tu programa…»); todavía no se sabe la fecha y no se muestra ninguna;
 *  - `lista`: el servidor respondió; `fecha` es la que dijo (`yyyy-MM-dd`; `null` solo contra un servidor anterior que no la devolvió);
 *  - `ya-empezo`: el programa ya estaba activado y su Día 1 ya llegó (la persona cerró la app sin tocar «Entendido» y volvió días después):
 *    «empieza mañana» sería falso, así que la pantalla sigue directo a la app, como hacía antes con un programa ya activado;
 *  - `error`: no se pudo activar (sin red, 5xx); `mensaje` es el de siempre y `reintentar` vuelve a pedir.
 */
export type EstadoDeLaActivacion =
  | { fase: 'activando' }
  | { fase: 'lista'; fecha: string | null }
  | { fase: 'ya-empezo' }
  | { fase: 'error'; mensaje: string };

export function useActivacionAlFirmar(activa: boolean): EstadoDeLaActivacion & { reintentar: () => void } {
  const [estado, setEstado] = useState<EstadoDeLaActivacion>({ fase: 'activando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    setEstado({ fase: 'activando' });
    activarElProgramaDeManana().then(
      fecha => {
        if (!vigente) return;
        if (fecha && yaEmpezo(fecha)) {
          setEstado({ fase: 'ya-empezo' });
          return;
        }
        tacto.logro();
        setEstado({ fase: 'lista', fecha });
      },
      e => {
        if (!vigente) return;
        setEstado({ fase: 'error', mensaje: mensajeDeError(e, AVISO_SIN_RED_AL_ACTIVAR) });
      },
    );
    return () => {
      vigente = false;
    };
  }, [activa, intento]);

  const reintentar = useCallback(() => setIntento(v => v + 1), []);
  return { ...estado, reintentar };
}
