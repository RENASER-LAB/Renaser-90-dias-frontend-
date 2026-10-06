import type { Expression } from '../rive/phoenixMaster';

/**
 * Las fases de la voz del acompañante que el fénix del centro de Hoy refleja (2026-10-06, pedido del dueño). Son las
 * de `useConversacionPorVoz` (`FaseDeVoz`: reposo, escuchando, pensando, hablando) más `error`, que el plan sabe
 * dibujar (`trgRetry`) aunque la voz de Hoy hoy no lo use como fase. No se inventa ninguna.
 */
export type EstadoDeSer = 'reposo' | 'escuchando' | 'pensando' | 'hablando' | 'error';

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
