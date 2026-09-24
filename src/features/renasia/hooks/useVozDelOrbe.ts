import { useCallback, useRef, useState } from 'react';

import { useConversacionEnVivo } from './useConversacionEnVivo';
import { useConversacionPorVoz, type ConversacionPorVoz } from './useConversacionPorVoz';

/**
 * La voz del orbe de Hoy (D-162): la conversación en vivo si se puede y, si no, la de siempre.
 *
 * Se usa la de siempre (STT, chat y TTS) cuando el binario no trae el módulo de audio nuevo,
 * cuando el backend no tiene la voz en vivo prendida, cuando se acabó la cuota del día o cuando
 * no hay conexión. El cambio pasa en el mismo toque: la persona no tiene que volver a intentar.
 */
export function useVozDelOrbe(): ConversacionPorVoz {
  const clasica = useConversacionPorVoz();
  const enVivo = useConversacionEnVivo();
  const [descartada, setDescartada] = useState(false);
  const enVivoActivaRef = useRef(false);

  const usarEnVivo = enVivo.disponible && !descartada;
  const enSesion = enVivo.fase !== 'reposo';

  const tocar = useCallback(() => {
    if (enSesion || enVivoActivaRef.current) {
      enVivoActivaRef.current = false;
      enVivo.tocar();
      return;
    }
    if (!usarEnVivo) {
      clasica.tocar();
      return;
    }
    enVivoActivaRef.current = true;
    void enVivo.empezar().then(ok => {
      if (ok) return;
      enVivoActivaRef.current = false;
      setDescartada(true);
      clasica.tocar();
    });
  }, [clasica, enSesion, enVivo, usarEnVivo]);

  const actual = usarEnVivo && (enSesion || enVivo.respuesta || enVivo.error) ? enVivo : clasica;
  return { ...actual, disponible: clasica.disponible || enVivo.disponible, tocar };
}
