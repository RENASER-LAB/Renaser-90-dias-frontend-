import { useCallback, useRef, useState } from 'react';

import { enModoSoloLectura } from '../../../services/http/apiClient';
import { useFuncionalidad } from '../../plataforma/estado/useFuncionalidad';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
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
 *
 * Con la voz en vivo abierta, tocar ya no la cierra (E-458): es «ya terminé» o «cállate». Se cierra
 * con `terminar` (mantener presionado el orbe).
 */
export function useVozDelOrbe(): ConversacionPorVoz {
  const clasica = useConversacionPorVoz();
  const enVivo = useConversacionEnVivo();
  const [descartadaHastaMs, setDescartadaHastaMs] = useState(0);
  const enVivoActivaRef = useRef(false);
  /** La persona la cerró mientras se abría: eso no es un fallo, no se pasa al modo de siempre. */
  const cerradaAdredeRef = useRef(false);

  const enPausa = Date.now() < descartadaHastaMs;
  /* Spec 002, US2: con «IA → voz» apagada no se abre la voz en vivo (el servidor la cerraría con 1013): se usa la de
     siempre, cuyo audio el servidor manda a la voz del teléfono (204). */
  const vozDeSer = useFuncionalidad(CLAVES.iaVoz);
  // Fase 2: la voz que todavía no le toca a esta cuenta se trata como apagada (el orbe sigue con la voz del teléfono).
  // «Ver como» (D-270): la voz en vivo responde 403 en el handshake; ni se intenta.
  const usarEnVivo = enVivo.disponible && !enPausa && vozDeSer.prendida && vozDeSer.disponible && !enModoSoloLectura();
  const enSesion = enVivo.fase !== 'reposo';

  const tocar = useCallback(() => {
    if (enSesion || enVivoActivaRef.current) {
      enVivo.tocar();
      return;
    }
    if (!usarEnVivo) {
      clasica.tocar();
      return;
    }
    enVivoActivaRef.current = true;
    cerradaAdredeRef.current = false;
    void enVivo.empezar().then(ok => {
      enVivoActivaRef.current = false;
      if (ok || cerradaAdredeRef.current) return;
      setDescartadaHastaMs(Date.now() + PAUSA_TRAS_FALLO_MS);
      clasica.tocar();
    });
  }, [clasica, enSesion, enVivo, usarEnVivo]);

  const terminarEnVivo = enVivo.terminar;
  const terminar = useCallback(() => {
    enVivoActivaRef.current = false;
    cerradaAdredeRef.current = true;
    terminarEnVivo();
  }, [terminarEnVivo]);

  const actual = usarEnVivo && (enSesion || enVivo.respuesta || enVivo.error) ? enVivo : clasica;
  return {
    ...actual,
    terminar: enSesion ? terminar : undefined,
    disponible: clasica.disponible || enVivo.disponible,
    // En la pausa se muestra por qué se cayó la voz en vivo, aunque ya se esté usando la de siempre.
    error: actual.error ?? (enPausa ? enVivo.error : null),
    tocar,
  };
}
