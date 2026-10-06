import type { Expression } from '../rive/phoenixMaster';

/**
 * Los estados de la conversación con SER que el fénix refleja (2026-10-06, pedido del dueño). Son SOLO los que el chat
 * del panel ya tiene (`RenasiaPanel` + `useRenasiaChat` + `useDictado`); no se inventa ninguno:
 *
 * | Estado        | De dónde sale en el chat                                                    |
 * |---------------|------------------------------------------------------------------------------|
 * | `escuchando`  | `dictado.escuchando` (el micrófono del panel, si el teléfono lo tiene)        |
 * | `pensando`    | `enviando` y la burbuja del asistente todavía vacía (esperando la respuesta)  |
 * | `hablando`    | `enviando` y la respuesta ya llegando por el stream (`enProgreso` con texto)  |
 * | `error`       | la última respuesta falló (`error` en la burbuja)                             |
 * | `reposo`      | nada de lo anterior                                                          |
 *
 * La **bienvenida** no es un estado sino un momento: abrir el panel (lo dispara el fénix del panel al montarse).
 * El panel **no lee en voz alta**: «hablando» es la respuesta llegando por escrito. La voz de SER (escuchar y hablar)
 * vive en el orbe de Hoy, que no cambia con este trabajo.
 */
export type EstadoDeSer = 'reposo' | 'escuchando' | 'pensando' | 'hablando' | 'error';

export type UltimaRespuesta = { texto: string; enProgreso?: boolean; error?: string | null } | null;

export function estadoDeLaConversacion(params: {
  escuchando: boolean;
  enviando: boolean;
  ultimaRespuesta: UltimaRespuesta;
}): EstadoDeSer {
  const { escuchando, enviando, ultimaRespuesta } = params;
  if (escuchando) return 'escuchando';
  if (ultimaRespuesta?.error) return 'error';
  if (enviando && ultimaRespuesta?.enProgreso && ultimaRespuesta.texto.length > 0) return 'hablando';
  if (enviando) return 'pensando';
  return 'reposo';
}

/**
 * Qué hace el fénix en cada estado, con los nombres del contrato del `.riv` (§3): `emotion` (expresión), `isTalking`
 * (boca, en su propia capa) y los disparos de una vez (`trgThinking`, `trgRetry`). Al volver a `reposo` la expresión
 * vuelve a neutral y la boca se cierra: lo que queda es el ánimo del semáforo, que va en otra capa (`mood`).
 *
 * Con «reducir movimiento» solo cambia la cara (es información, no movimiento): sin disparos ni boca que se mueve.
 */
export type PlanDelEstado = { expresion: Expression; hablar: boolean; disparo: 'think' | 'retry' | null };

const PLANES: Readonly<Record<EstadoDeSer, PlanDelEstado>> = {
  reposo: { expresion: 'neutral', hablar: false, disparo: null },
  escuchando: { expresion: 'curious', hablar: false, disparo: null },
  pensando: { expresion: 'thinking', hablar: false, disparo: 'think' },
  hablando: { expresion: 'happy', hablar: true, disparo: null },
  error: { expresion: 'concerned', hablar: false, disparo: 'retry' },
};

export function planDelEstado(estado: EstadoDeSer, movimientoReducido: boolean): PlanDelEstado {
  const plan = PLANES[estado];
  return movimientoReducido ? { expresion: plan.expresion, hablar: false, disparo: null } : plan;
}
