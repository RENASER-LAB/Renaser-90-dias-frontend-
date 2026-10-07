import type { Expression, MasterNumber } from '../rive/phoenixMaster';

/**
 * Las fases de la voz del acompañante que el fénix del centro de Hoy refleja (2026-10-06, pedido del dueño). Son las
 * de `useConversacionPorVoz` (`FaseDeVoz`: reposo, escuchando, pensando, hablando) más `error`, que el plan sabe
 * dibujar (`trgRetry`) aunque la voz de Hoy hoy no lo use como fase. No se inventa ninguna.
 */
export type EstadoDeSer = 'reposo' | 'escuchando' | 'pensando' | 'hablando' | 'error';

/** Valores de los ejes del contrato del `.riv` (§3): `bodyLean`, `headRoll`, `gazeX`… */
export type Capas = Readonly<Partial<Record<MasterNumber, number>>>;

/**
 * Qué hace el fénix MIENTRAS dura cada fase, con los nombres del contrato del `.riv` (§3), combinando capas:
 *
 * - `pose`: la postura que sostiene toda la fase (cuerpo, cabeza, mirada).
 * - `vaiven`: lo que alterna cada `cadaMs` mientras dura (cabeza que se ladea, mirada que va y viene, alas).
 * - `disparo` al entrar y `repetirDisparoMs` para volver a dispararlo mientras dure (un clip dura ~2,7 s).
 * - `hablar`: `isTalking` y además la boca con visemas (`director.speak`).
 * - `miradaAutonoma`: `lifeGaze` mientras dura (bajo = no mira a otro lado); `null` = la de reposo.
 * - `energia`: `energy` mientras dura; `null` = la del ánimo del semáforo.
 * - `nivelDeVoz`: el volumen del micrófono mueve el pecho y las alas (solo la voz en vivo lo da).
 *
 * > **Corregido 2026-10-07 (pedido del dueño: «no se está usando el movimiento cuando te escucha, cuando piensa y
 * > cuando habla»).** El plan era solo `{ expresion, hablar, disparo }`: escuchando = cara `curious` (quieta),
 * > pensando = un `trgThinking` de 2,7 s y después quieto, hablando = `isTalking` solo. Medido sobre el `.riv` con el
 * > runtime web 2.19.8: `isTalking` cambia 0,5 de 255 por píxel (el pico es chico), `curious` no agrega movimiento,
 * > y lo que sí se ve es cabeza, cuerpo y alas (14–17). La vida autónoma, además, seguía mirando a otro lado.
 */
export type PlanDelEstado = {
  expresion: Expression;
  hablar: boolean;
  disparo: 'think' | 'explain' | 'retry' | null;
  repetirDisparoMs: number | null;
  pose: Capas;
  vaiven: { cadaMs: number; pasos: readonly Capas[] } | null;
  parpadeoCadaMs: number | null;
  miradaAutonoma: number | null;
  energia: number | null;
  nivelDeVoz: boolean;
};

/** El reposo del dibujo en los ejes que mueven las fases: al volver, el ánimo (otra capa, `mood`) queda solo. */
export const POSE_DE_REPOSO: Capas = {
  bodyLean: 0, bodyStretch: 0, headPitch: 0, headRoll: 0, gazeX: 0, gazeY: 0, wingL: 0, wingR: 0,
};

const QUIETO = {
  hablar: false, disparo: null, repetirDisparoMs: null, vaiven: null, parpadeoCadaMs: null, miradaAutonoma: null,
  energia: null, nivelDeVoz: false,
} as const;

const PLANES: Readonly<Record<EstadoDeSer, PlanDelEstado>> = {
  reposo: { ...QUIETO, expresion: 'neutral', pose: POSE_DE_REPOSO },
  /** Se inclina hacia la persona, la mira de frente y ladea la cabeza despacio, con parpadeos. */
  escuchando: {
    ...QUIETO,
    expresion: 'curious',
    pose: { ...POSE_DE_REPOSO, bodyLean: 0.5, headPitch: 0.15 },
    vaiven: { cadaMs: 1600, pasos: [{ headRoll: 0.45 }, { headRoll: -0.15 }] },
    parpadeoCadaMs: 3200,
    miradaAutonoma: 0.1,
    energia: 0.55,
    nivelDeVoz: true,
  },
  /** Mira arriba y a un lado (alterna), ladea la cabeza, calmado; `trgThinking` otra vez mientras dure. */
  pensando: {
    ...QUIETO,
    expresion: 'thinking',
    disparo: 'think',
    repetirDisparoMs: 2800,
    pose: { ...POSE_DE_REPOSO, headPitch: 0.4, gazeY: 0.6 },
    vaiven: { cadaMs: 1100, pasos: [{ gazeX: 0.4, headRoll: -0.5 }, { gazeX: -0.4, headRoll: 0.3 }] },
    miradaAutonoma: 0,
    energia: 0.3,
  },
  /** Boca con visemas, gesto de explicar al empezar (y cada tanto), alas que acompañan, mirada al frente. */
  hablando: {
    ...QUIETO,
    expresion: 'happy',
    hablar: true,
    disparo: 'explain',
    repetirDisparoMs: 6500,
    pose: { ...POSE_DE_REPOSO, bodyLean: 0.2 },
    vaiven: {
      cadaMs: 1300,
      pasos: [
        { wingL: 0.45, wingR: 0.15, headPitch: 0.18, headRoll: 0.15 },
        { wingL: 0.15, wingR: 0.42, headPitch: -0.05, headRoll: -0.12 },
      ],
    },
    miradaAutonoma: 0.2,
    energia: 0.7,
  },
  error: { ...QUIETO, expresion: 'concerned', disparo: 'retry', pose: POSE_DE_REPOSO },
};

/**
 * Con «reducir movimiento»: una pose quieta por fase (cara y postura, que son información), sin disparos, sin boca,
 * sin vaivén, sin parpadeos y sin el micrófono.
 */
export function planDelEstado(estado: EstadoDeSer, movimientoReducido: boolean): PlanDelEstado {
  const plan = PLANES[estado];
  return movimientoReducido ? { ...QUIETO, expresion: plan.expresion, pose: plan.pose } : plan;
}
