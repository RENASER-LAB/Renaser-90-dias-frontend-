import { useCallback, useRef, useState } from 'react';

import { useConversacionEnVivo } from './useConversacionEnVivo';
import { useConversacionPorVoz, type ConversacionPorVoz } from './useConversacionPorVoz';

/**
 * Cuánto se deja de intentar la voz en vivo después de que falló al abrir (cuota agotada, backend
 * sin la voz en vivo, sin red). Antes se descartaba para siempre, hasta recargar la pantalla
 * (E-241): con la cuota agotada un rato, el orbe quedaba en el modo anterior el resto del día y
 * sin decir por qué. Con la cuota agotada, reintentar es barato: el backend rechaza antes de abrir
 * Gemini.
 */
export const PAUSA_TRAS_FALLO_MS = 2 * 60_000;

/**
 * La voz del orbe de Hoy (D-162): la conversación en vivo si se puede y, si no, la de siempre.
 *
 * Se usa la de siempre (STT, chat y TTS) cuando el binario no trae el módulo de audio nuevo,
 * cuando el backend no tiene la voz en vivo prendida, cuando se acabó la cuota del día o cuando
 * no hay conexión. El cambio pasa en el mismo toque: la persona no tiene que volver a intentar.
 * Mientras dura la pausa, el aviso de la voz en vivo (por ejemplo, la cuota) se sigue mostrando.
 */
export function useVozDelOrbe(): ConversacionPorVoz {
  const clasica = useConversacionPorVoz();
  const enVivo = useConversacionEnVivo();
  const [descartadaHastaMs, setDescartadaHastaMs] = useState(0);
  const enVivoActivaRef = useRef(false);

  const enPausa = Date.now() < descartadaHastaMs;
  const usarEnVivo = enVivo.disponible && !enPausa;
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
      setDescartadaHastaMs(Date.now() + PAUSA_TRAS_FALLO_MS);
      clasica.tocar();
    });
  }, [clasica, enSesion, enVivo, usarEnVivo]);

  const actual = usarEnVivo && (enSesion || enVivo.respuesta || enVivo.error) ? enVivo : clasica;
  return {
    ...actual,
    disponible: clasica.disponible || enVivo.disponible,
    // En la pausa se muestra por qué se cayó la voz en vivo, aunque ya se esté usando la de siempre.
    error: actual.error ?? (enPausa ? enVivo.error : null),
    tocar,
  };
}
