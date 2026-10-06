/**
 * PHOENIX_MASTER v3 — semantic behaviour controller.
 *
 * La app NO controla huesos: da órdenes semánticas (lookAt, react, expression, enter, pointTo, pose…)
 * y el Director las convierte en parámetros de PhoenixSM con ACTUACIÓN:
 *   ojos primero → cabeza +50 ms → cuerpo +120 ms → alas +170 ms → cola (resorte, follow-through).
 *
 * Sin dependencias de React Native: se puede testear en Node con un reloj falso.
 *
 * v3.3 — ánimo VIVO según el semáforo: mood(m) escribe `mood` (entero, al instante; el .riv anima la pose), lleva
 * `energy` al valor del ánimo, suma una actitud 2.5D sutil sobre los ejes (capa de ánimo del Director, con el mismo
 * escalonado de actuación) y re-sintoniza alive() (pesos, pausas, tempo y micro-conductas propias de cada ánimo).
 */

// ---------------------------------------------------------------------------------------------
// Contrato del .riv (phoenix_master_v3.riv) — extiende, no reemplaza, el contrato v1.
// ---------------------------------------------------------------------------------------------
export const MASTER_NUMBERS = {
  headYaw: 0, headPitch: 0, headRoll: 0,
  gazeX: 0, gazeY: 0,
  bodyTurn: 0, bodyLean: 0, bodySquash: 0, bodyStretch: 0,
  wingL: 0, wingR: 0, wingSpreadL: 0, wingSpreadR: 0, wingFoldL: 0, wingFoldR: 0,
  tailSwing: 0,
  energy: 0.5,
  emotion: 0,
  mouth: 1,
  positionX: 0, positionY: 0, scale: 1, rotation: 0,
  /** 1 = mira a la derecha (dibujo original) · -1 = espejo (mira a la izquierda). */
  facing: 1,
  // v3.2 — vida autónoma dentro del .riv (0..1). Un .riv v3.1 no los tiene: resync() sólo los envía si cambian.
  /** Amplitud de las capas de vida (respiración, peso, cabeza ±5°, ruido de alas/cola/cresta, parpadeos extra). 0 = idle quieto de v3.1. */
  life: 1,
  /** Miradas autónomas (sacadas de pupilas + leve giro de cara). El Director lo baja a 0 mientras dirige la mirada. */
  lifeGaze: 1,
  /** Opacidad del fuego (brasas + brillo cálido; la intensidad ya sigue a progress / onDarkBackground). 0 = sin FX. */
  fire: 1,
  // v3.3 — ánimo según el semáforo. Un .riv v3.2 no lo tiene: resync() sólo lo envía si cambia.
  /**
   * Ánimo (pose de reposo + cara): 0 neutral · 1 alegre · 2 serio · 3 triste (ver MOODS). Siempre ENTERO e instantáneo:
   * la transición (≤ 400 ms, interrumpible) y el gesto al mejorar los anima el .riv. Usar director.mood(): además
   * lleva energy, la actitud 2.5D y la vida autónoma de ese ánimo (set({ mood }) también pasa por ahí).
   */
  mood: 0,
} as const;
export type MasterNumber = keyof typeof MASTER_NUMBERS;

export const MASTER_BOOLS = { isTalking: false, isFlying: false, isHovering: false } as const;
export type MasterBool = keyof typeof MASTER_BOOLS;

export const MASTER_TRIGGERS = {
  // v1 (sin cambios)
  welcome: 'trgWelcome', explain: 'trgExplain', think: 'trgThinking', success: 'trgSuccess', encourage: 'trgEncourage',
  retry: 'trgRetry', tap: 'trgTap', flyIn: 'trgFlyIn', flyOut: 'trgFlyOut',
  // v3
  celebrate: 'trgCelebrate', pointLeft: 'trgPointLeft', pointRight: 'trgPointRight', wave: 'trgWave', jump: 'trgJump',
  takeOff: 'trgTakeOff', land: 'trgLand', peek: 'trgPeek',
  enterLeft: 'trgEnterLeft', enterRight: 'trgEnterRight', enterTop: 'trgEnterTop', enterBottom: 'trgEnterBottom',
  exitLeft: 'trgExitLeft', exitRight: 'trgExitRight', exitTop: 'trgExitTop', exitBottom: 'trgExitBottom',
  blink: 'trgBlink', blinkLeft: 'trgBlinkLeft', blinkRight: 'trgBlinkRight',
  // v3.3 — celebración corta (≤ 2,5 s, termina en reposo, emite PHOENIX_ACTION_COMPLETE)
  celebrateShort: 'trgCelebrateShort',
} as const;
export type MasterTrigger = keyof typeof MASTER_TRIGGERS;

/** emotion (number input) = índice en esta lista. */
export const EXPRESSIONS = ['neutral', 'happy', 'excited', 'curious', 'thinking', 'proud', 'encouraging', 'surprised',
  'sleepy', 'concerned', 'retry',
  // v3.3 (agregadas al final; 0–10 no cambian)
  'serious', 'sad'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Boca: 0 cerrada, 1 pequeña (dibujo base), 2 media, 3 abierta. Preparado para visemas (valores intermedios). */
export const MOUTH = { closed: 0, smallOpen: 1, mediumOpen: 2, wideOpen: 3 } as const;
export type MouthShape = keyof typeof MOUTH;

export type Side = 'left' | 'right' | 'top' | 'bottom';

// ---------------------------------------------------------------------------------------------
// v3.3 — Ánimo según el semáforo (fuente de verdad: el servidor)
// ---------------------------------------------------------------------------------------------
/** mood (number input) = índice en esta lista. */
export const MOODS = ['neutral', 'alegre', 'serio', 'triste'] as const;
export type PhoenixMood = (typeof MOODS)[number];
/** Ánimo por nombre o por su valor numérico en el .riv. */
export type PhoenixMoodInput = PhoenixMood | 0 | 1 | 2 | 3;
/** Semáforo de la app (lo calcula el servidor: promedio de los últimos 7 días con algo programado, 1 decimal). */
export type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_DATOS';

/**
 * Semáforo → ánimo. VERDE → alegre · AMARILLO → serio · ROJO → triste · SIN_DATOS (o cualquier otro valor, null,
 * undefined) → neutral: NUNCA alegre por falta de datos. Tolera minúsculas y espacios ('verde ').
 */
export function moodFromSemaforo(s: Semaforo | (string & {}) | null | undefined): PhoenixMood {
  switch (typeof s === 'string' ? s.trim().toUpperCase() : '') {
    case 'VERDE': return 'alegre';
    case 'AMARILLO': return 'serio';
    case 'ROJO': return 'triste';
    default: return 'neutral';
  }
}

/**
 * Promedio (%) → semáforo, con las reglas del servidor: ≥ 80 VERDE · ≥ 60 AMARILLO · < 60 ROJO · null/NaN SIN_DATOS.
 * Redondea a 1 decimal antes de comparar (79,9 → AMARILLO; 59,9 → ROJO). SÓLO para mocks y tests: en la app el
 * semáforo lo manda el servidor.
 */
export function semaforoFromPercent(avg: number | null | undefined): Semaforo {
  if (avg == null || !Number.isFinite(avg)) return 'SIN_DATOS';
  const v = Math.round(avg * 10) / 10;
  return v >= 80 ? 'VERDE' : v >= 60 ? 'AMARILLO' : 'ROJO';
}

/** Normaliza un ánimo: número → acotado a [0, 3] y redondeado; nombre desconocido / NaN / null → 'neutral'. */
export function normalizeMood(m: PhoenixMoodInput | number | string | null | undefined): PhoenixMood {
  if (typeof m === 'number') return Number.isFinite(m) ? MOODS[Math.max(0, Math.min(3, Math.round(m)))] : 'neutral';
  return (MOODS as readonly string[]).includes(m as string) ? (m as PhoenixMood) : 'neutral';
}

/** Cómo vive cada ánimo (el .riv pone la pose y la cara; el Director pone la actitud 2.5D y el ritmo). */
export type MoodProfile = {
  /** energy objetivo (el Director la lleva con un tween de ~350 ms). */
  energy: number;
  /**
   * Actitud 2.5D de reposo: desplazamiento que el Director SUMA a los ejes (capa de ánimo). Pesa entero en reposo y se
   * desvanece a medida que la app / alive llevan el eje a su extremo (las poses ±1 llegan exactas). Nunca toca la mirada.
   */
  attitude: Readonly<Partial<Record<MasterNumber, number>>>;
  /** Tempo de actuación: escala retardos y duraciones del escalonado (1 normal · > 1 más lento). */
  tempo: number;
  /** Amplitud de las micro-conductas de alive(). */
  amp: number;
  /** Curva para la actitud y las micro-conductas (por defecto la de cada canal). */
  ease?: Ease;
  /** alive(): peso de cada micro-conducta (las que no figuran no se usan en este ánimo). */
  weights: Readonly<Partial<Record<AliveBehaviour, number>>>;
  /** alive(): pausa mínima / máxima entre micro-conductas (ms) cuando la app no pasa minGapMs / maxGapMs. */
  minGapMs: number;
  maxGapMs: number;
};

export const MOOD_PROFILES: Readonly<Record<PhoenixMood, MoodProfile>> = {
  /** El reposo de v3.2 tal cual: sin actitud, alive con sus pesos y pausas de siempre. */
  neutral: {
    energy: 0.5, attitude: {}, tempo: 1, amp: 1,
    weights: { glance: 3, doubleBlink: 3, curious: 2, shuffle: 2, stretch: 1 }, minGapMs: 5000, maxGapMs: 11000,
  },
  /** Cabeza un poco hacia el usuario (3/4 abierto), barbilla y pecho arriba, alas apenas abiertas; vivaz y elástico. */
  alegre: {
    energy: 0.65, attitude: { headYaw: -0.2, headPitch: 0.1, headRoll: 0.06, bodyStretch: 0.1, wingSpreadL: 0.06, wingSpreadR: 0.06 },
    tempo: 0.85, amp: 1.1,
    weights: { glance: 3, curious: 3, flutter: 3, stretch: 2, doubleBlink: 2, shuffle: 1 }, minGapMs: 4000, maxGapMs: 8000,
  },
  /** De frente al usuario (cabeza y algo de cuerpo), alas un poco plegadas, quieto y atento: «tú puedes», no enojo. */
  serio: {
    energy: 0.4, attitude: { headYaw: -0.45, bodyTurn: -0.2, wingFoldL: 0.2, wingFoldR: 0.2 },
    tempo: 1.3, amp: 0.6, ease: 'outCubic',
    weights: { glance: 3, doubleBlink: 2, shuffle: 1 }, minGapMs: 8000, maxGapMs: 14000,
  },
  /** Cabeza un poco baja, alas algo caídas, lento; de vez en cuando «intenta levantarse» (lookUp). Ánimo, no culpa. */
  triste: {
    energy: 0.2, attitude: { headPitch: -0.25, wingL: -0.2, wingR: -0.2, bodySquash: 0.05 },
    tempo: 1.6, amp: 0.7, ease: 'inOutCubic',
    weights: { lookUp: 3, shuffle: 2, doubleBlink: 1, glance: 1 }, minGapMs: 9000, maxGapMs: 15000,
  },
};

/** Ejes que usa la capa de ánimo (unión de todas las actitudes). */
const MOOD_AXES: readonly MasterNumber[] = [...new Set(Object.values(MOOD_PROFILES).flatMap(p => Object.keys(p.attitude) as MasterNumber[]))];

// ---------------------------------------------------------------------------------------------
// Pose library — configuraciones del MISMO rig (no imágenes).
// ---------------------------------------------------------------------------------------------
export type PoseSpec = {
  numbers?: Partial<Record<MasterNumber, number>>;
  bools?: Partial<Record<MasterBool, boolean>>;
  expression?: Expression;
  trigger?: MasterTrigger;
};

export const POSES = {
  /** El dibujo original tal cual (reposo). */
  NEUTRAL: { numbers: { facing: 1, headYaw: 0, headPitch: 0, headRoll: 0, gazeX: 0, gazeY: 0, bodyTurn: 0, bodyLean: 0, rotation: 0 } },
  FRONT: { numbers: { headYaw: -1, bodyTurn: -1, gazeX: 0, gazeY: 0, headPitch: 0 } },
  LEFT_3Q: { numbers: { facing: -1, headYaw: 1, bodyTurn: 1, gazeX: 0.3, headPitch: 0 } },
  RIGHT_3Q: { numbers: { facing: 1, headYaw: 1, bodyTurn: 1, gazeX: 0.3, headPitch: 0 } },
  LOOK_UP: { numbers: { headPitch: 1, gazeY: 1, wingL: 0.2, wingR: 0.2 }, expression: 'curious' },
  LOOK_DOWN: { numbers: { headPitch: -1, gazeY: -1 } },
  FLY_LEFT: { numbers: { facing: -1, bodyTurn: 1, headYaw: 1, bodyLean: 0.8, wingSpreadL: 0.6, wingSpreadR: 0.6, gazeX: 0.6 }, bools: { isFlying: true } },
  FLY_RIGHT: { numbers: { facing: 1, bodyTurn: 1, headYaw: 1, bodyLean: 0.8, wingSpreadL: 0.6, wingSpreadR: 0.6, gazeX: 0.6 }, bools: { isFlying: true } },
  POINT_LEFT: { numbers: { facing: -1, headYaw: 0.6, bodyTurn: 0.6, gazeX: 1 }, expression: 'encouraging', trigger: 'pointRight' },
  POINT_RIGHT: { numbers: { facing: 1, headYaw: 0.6, bodyTurn: 0.6, gazeX: 1 }, expression: 'encouraging', trigger: 'pointRight' },
  WELCOME: { numbers: { headYaw: 0, bodyTurn: 0, gazeX: 0, gazeY: 0 }, expression: 'happy', trigger: 'welcome' },
  THINK: { numbers: { headRoll: -0.5 }, expression: 'thinking', trigger: 'think' },
  CELEBRATE: { expression: 'excited', trigger: 'celebrate' },
  ENCOURAGE: { numbers: { headRoll: 0.35 }, expression: 'encouraging', trigger: 'encourage' },
  RETRY: { expression: 'retry', trigger: 'retry' },
  LAND: { numbers: { bodyLean: 0, rotation: 0 }, bools: { isFlying: false, isHovering: false }, trigger: 'land' },
  HOVER: { numbers: { wingSpreadL: 0.3, wingSpreadR: 0.3 }, bools: { isHovering: true, isFlying: false } },
  PEEK: { numbers: { gazeX: 0.5 }, expression: 'curious', trigger: 'peek' },
} as const satisfies Record<string, PoseSpec>;
export type PoseName = keyof typeof POSES;

// ---------------------------------------------------------------------------------------------
// Timing (anticipation → action → overshoot → settle → follow-through)
// ---------------------------------------------------------------------------------------------
export const CHANNELS: Record<MasterNumber, { group: 'eyes' | 'head' | 'body' | 'wings' | 'tail' | 'stage' | 'face'; delay: number; dur: number; ease: Ease }> = {
  gazeX: { group: 'eyes', delay: 0, dur: 140, ease: 'outCubic' },
  gazeY: { group: 'eyes', delay: 0, dur: 140, ease: 'outCubic' },
  headYaw: { group: 'head', delay: 50, dur: 320, ease: 'outBack' },
  headPitch: { group: 'head', delay: 50, dur: 300, ease: 'outBack' },
  headRoll: { group: 'head', delay: 70, dur: 340, ease: 'outBack' },
  bodyTurn: { group: 'body', delay: 120, dur: 380, ease: 'inOutBack' },
  bodyLean: { group: 'body', delay: 120, dur: 360, ease: 'inOutBack' },
  bodySquash: { group: 'body', delay: 0, dur: 160, ease: 'outCubic' },
  bodyStretch: { group: 'body', delay: 0, dur: 160, ease: 'outCubic' },
  wingL: { group: 'wings', delay: 170, dur: 360, ease: 'outBack' },
  wingR: { group: 'wings', delay: 190, dur: 360, ease: 'outBack' },
  wingSpreadL: { group: 'wings', delay: 170, dur: 340, ease: 'outBack' },
  wingSpreadR: { group: 'wings', delay: 190, dur: 340, ease: 'outBack' },
  wingFoldL: { group: 'wings', delay: 170, dur: 340, ease: 'inOutCubic' },
  wingFoldR: { group: 'wings', delay: 190, dur: 340, ease: 'inOutCubic' },
  tailSwing: { group: 'tail', delay: 240, dur: 520, ease: 'outBack' },
  energy: { group: 'body', delay: 0, dur: 400, ease: 'inOutCubic' },
  emotion: { group: 'face', delay: 0, dur: 0, ease: 'linear' },
  mouth: { group: 'face', delay: 0, dur: 70, ease: 'linear' },
  positionX: { group: 'stage', delay: 0, dur: 600, ease: 'inOutCubic' },
  positionY: { group: 'stage', delay: 0, dur: 600, ease: 'inOutCubic' },
  scale: { group: 'stage', delay: 0, dur: 500, ease: 'outBack' },
  rotation: { group: 'stage', delay: 60, dur: 420, ease: 'inOutCubic' },
  facing: { group: 'body', delay: 60, dur: 90, ease: 'linear' },
  life: { group: 'body', delay: 0, dur: 400, ease: 'inOutCubic' },
  lifeGaze: { group: 'eyes', delay: 0, dur: 160, ease: 'inOutCubic' },
  fire: { group: 'stage', delay: 0, dur: 400, ease: 'inOutCubic' },
  /** v3.3: instantáneo SIEMPRE (también con set({ mood }, { dur })): el .riv anima la transición. */
  mood: { group: 'face', delay: 0, dur: 0, ease: 'linear' },
};

export type Ease = 'linear' | 'outCubic' | 'inOutCubic' | 'outBack' | 'inOutBack';
export const EASE: Record<Ease, (t: number) => number> = {
  linear: t => t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutBack: t => {
    const c2 = 1.3 * 1.525;
    return t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
};

// ---------------------------------------------------------------------------------------------
// Director
// ---------------------------------------------------------------------------------------------
export type PhoenixSink = {
  setNumber: (name: MasterNumber, value: number) => void;
  setBool: (name: MasterBool, value: boolean) => void;
  fire: (trigger: string) => void;
};

export type Clock = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (h: unknown) => void;
  requestFrame: (fn: () => void) => unknown;
  cancelFrame: (h: unknown) => void;
};

export const defaultClock = (): Clock => ({
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: h => clearTimeout(h as ReturnType<typeof setTimeout>),
  requestFrame: fn => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16)),
  cancelFrame: h => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(h as number) : clearTimeout(h as ReturnType<typeof setTimeout>)),
});

/** Dirección hacia algo, relativa al centro del fénix: dx,dy en px de pantalla (y hacia abajo). */
export type LookTarget = { dx: number; dy: number } | 'user';

type Tween = { from: number; to: number; start: number; dur: number; ease: (t: number) => number };

const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const RANGE: Partial<Record<MasterNumber, [number, number]>> = {
  bodySquash: [0, 1], bodyStretch: [0, 1], wingSpreadL: [0, 1], wingSpreadR: [0, 1], wingFoldL: [0, 1], wingFoldR: [0, 1],
  energy: [0, 1], emotion: [0, EXPRESSIONS.length - 1], mouth: [0, 3], scale: [0.2, 2], rotation: [-180, 180], facing: [-1, 1],
  life: [0, 1], lifeGaze: [0, 1], fire: [0, 1],
  mood: [0, MOODS.length - 1],
};

/** Opciones del Director. lifeInputs=false para usar este controlador con un .riv anterior a v3.2. */
export type DirectorOptions = { lifeInputs?: boolean };

/** Canales ambientales (vida/FX del .riv): no cuentan como "actuar" para alive(). */
const AMBIENT: ReadonlySet<MasterNumber> = new Set<MasterNumber>(['life', 'lifeGaze', 'fire']);
/** Bajar lifeGaze al dirigir la mirada: rápido, antes de que los ojos lleguen (ojos = 140 ms). */
const GAZE_GATE_MS = 120;
/** |gaze| por debajo de esto = mirando al usuario. */
const GAZE_EPS = 1e-3;
/** Tras cualquier acción, alive() espera este margen antes de actuar. */
const IDLE_GRACE_MS = 1000;
/** Reintento del planificador de alive() cuando el personaje está ocupado. */
const ALIVE_RETRY_MS = 1000;
/** Triggers de clip (no parpadeos) disparados sin await: se consideran ocupados este tiempo. */
const TRIGGER_BUSY_MS = 2500;

/** v3.3: tween de energy al cambiar de ánimo. */
const MOOD_ENERGY_MS = 350;
/** v3.3: al cambiar de ánimo el .riv transiciona (≤ 400 ms) y, si mejora, hace un gesto (≤ 1 s): alive() espera. */
const MOOD_SETTLE_MS = 1000;
/** v3.3: timeout de seguridad de celebrateShort (el clip dura ≤ 2,5 s). */
const CELEBRATE_SHORT_TIMEOUT_MS = 3500;
/** v3.3: la actitud 2.5D se relaja durante celebrateShort con este tempo (~200 ms) y vuelve al terminar. */
const SHORT_RELAX_TEMPO = 0.5;
/** Pausas por defecto de alive() en neutral (las de v3.2); los demás ánimos las escalan (ver MOOD_PROFILES). */
const NEUTRAL_GAPS = { min: 5000, max: 11000 };

/**
 * Micro-conductas autónomas de alive(). v3.2: glance, curious, doubleBlink, stretch, shuffle.
 * v3.3: flutter (aleteo feliz, alegre) y lookUp («intenta levantarse», triste).
 */
export type AliveBehaviour = 'glance' | 'curious' | 'doubleBlink' | 'stretch' | 'shuffle' | 'flutter' | 'lookUp';
export type AliveOptions = {
  /**
   * Pausa mínima / máxima entre micro-conductas (ms) en neutral. Por defecto 5000–11000 (y la del ánimo actual: ver
   * MOOD_PROFILES). Si se pasan, los otros ánimos las escalan en la misma proporción (alegre más seguido, triste menos).
   */
  minGapMs?: number;
  maxGapMs?: number;
  /** Generador aleatorio inyectable (tests deterministas). Por defecto Math.random. */
  rng?: () => number;
  /** Aviso opcional cada vez que alive() ejecuta una micro-conducta (logs / tests). */
  onBehaviour?: (kind: AliveBehaviour) => void;
};

export class PhoenixDirector {
  private values: Record<MasterNumber, number> = { ...MASTER_NUMBERS };
  private sent: Partial<Record<MasterNumber, number>> = {};
  private bools: Record<MasterBool, boolean> = { ...MASTER_BOOLS };
  private tweens: Partial<Record<MasterNumber, Tween>> = {};
  private timers = new Set<unknown>();
  private frame: unknown = null;
  private disposed = false;
  // procedural follow-through for the tail (damped spring driven by turn / travel velocity)
  private tail = { x: 0, v: 0, base: 0, lastTurn: 0, lastPosX: 0, lastT: 0, travelVx: 0, tween: null as Tween | null };
  private waiters: Array<(name: string) => void> = [];
  // ocupado (alive() no interviene): acciones async en curso + margen tras acciones síncronas / triggers / visemas
  private busyCount = 0;
  private busyUntil = 0;
  // mirada dirigida: 'directed' (lifeGaze → 0) · 'returning' (vuelve al usuario) · 'user' (lifeGaze en reposo)
  private gaze: 'user' | 'directed' | 'returning' = 'user';
  private restLifeGaze = 1;
  private reduced = false;
  // alive(): planificador de micro-conductas autónomas
  private aliveOn = false;
  private aliveTimers = new Set<unknown>();
  private aliveCfg: { minGapMs?: number; maxGapMs?: number; rng: () => number; onBehaviour?: (kind: AliveBehaviour) => void } = { rng: Math.random };
  private aliveLast: AliveBehaviour | null = null;
  private aliveRun: { rest: Partial<Record<MasterNumber, number>>; mine: Partial<Record<MasterNumber, number>>; emotion?: { prev: number; mine: number } } | null = null;
  // v3.3: capa de ánimo (actitud 2.5D sumada a los ejes, con sus propios tweens escalonados)
  private moodOff: Partial<Record<MasterNumber, number>> = {};
  private moodTweens: Partial<Record<MasterNumber, Tween>> = {};
  // v3.3: celebración corta en curso (una llamada repetida comparte la promesa) y ánimo pedido mientras dura
  private short: { promise: Promise<void>; release: () => void } | null = null;
  private pendingMood: { i: number; instant: boolean } | null = null;
  // v3.3: nivel de `life` en reposo (lifeLevel); reduceMotion(false) vuelve a este valor
  private restLife = 1;

  /**
   * opts.lifeInputs (default true): false = el .riv NO tiene las entradas v3.2 life/lifeGaze/fire (p. ej. el .riv v3.1).
   * El Director sigue funcionando igual pero nunca escribe esas entradas (en Android una entrada inexistente puede
   * llegar a onError y activar el PNG de respaldo).
   */
  constructor(private sink: PhoenixSink, private clock: Clock = defaultClock(), private opts: DirectorOptions = {}) {}

  /** Llamar con cada evento Rive recibido (PHOENIX_ACTION_COMPLETE, …). */
  onEvent(name: string) { for (const w of this.waiters.slice()) w(name); }

  dispose() {
    this.disposed = true;
    for (const t of this.timers) this.clock.clearTimeout(t);
    this.timers.clear();
    this.aliveOn = false;
    this.aliveTimers.clear();
    this.aliveRun = null;
    if (this.frame != null) this.clock.cancelFrame(this.frame);
    this.frame = null;
    this.tweens = {};
    this.moodTweens = {};
    this.tail.tween = null;
    this.waiters = [];
    // v3.3: una celebrateShort en curso resuelve (no queda colgada al desmontar)
    const short = this.short;
    this.short = null;
    this.pendingMood = null;
    short?.release();
  }

  /** Valor que recibe el rig (con la actitud del ánimo sumada; en neutral = el valor pedido). */
  get(name: MasterNumber) { return this.out(name); }

  /** Re-envía todo el estado (tras PHOENIX_READY o tras remontar la vista Rive). */
  resync() {
    if (this.disposed) return;
    this.sent = {};
    for (const k of Object.keys(this.values) as MasterNumber[]) {
      const v = this.out(k);
      if (v !== MASTER_NUMBERS[k]) this.push(k); else this.sent[k] = v;
    }
    for (const b of Object.keys(this.bools) as MasterBool[]) if (this.bools[b]) this.sink.setBool(b, true);
  }

  // ------------------------------------------------------------------ low level
  set(numbers: Partial<Record<MasterNumber, number>>, opts: { instant?: boolean; dur?: number; delay?: number; ease?: Ease } = {}) {
    if (this.disposed) return;
    const now = this.clock.now();
    for (const k of Object.keys(numbers) as MasterNumber[]) {
      // v3.3: el ánimo nunca se interpola y siempre viaja con su energía, actitud y vida (ver mood())
      if (k === 'mood') { this.mood(numbers.mood as PhoenixMoodInput, { instant: opts.instant }); continue; }
      const target = this.clampValue(k, numbers[k] as number);
      if (k === 'tailSwing') { this.tail.tween = null; this.tail.base = target; this.markBusy(IDLE_GRACE_MS); this.kick(); continue; }
      const ch = CHANNELS[k];
      const dur = opts.instant ? 0 : opts.dur ?? ch.dur;
      if (!AMBIENT.has(k)) this.markBusy((dur > 0 ? (opts.delay ?? ch.delay) + dur : 0) + IDLE_GRACE_MS);
      if (dur <= 0 || k === 'emotion') { delete this.tweens[k]; this.values[k] = target; this.push(k); continue; }
      this.tweens[k] = { from: this.values[k], to: target, start: now + (opts.delay ?? ch.delay), dur, ease: EASE[opts.ease ?? ch.ease] };
    }
    if ('gazeX' in numbers || 'gazeY' in numbers) this.gateGaze();
    this.kick();
  }

  setBool(name: MasterBool, value: boolean) {
    if (this.disposed || this.bools[name] === value) return;
    this.bools[name] = value; this.sink.setBool(name, value);
  }

  trigger(name: MasterTrigger) {
    if (this.disposed) return;
    this.markBusy(name.startsWith('blink') ? 300 : TRIGGER_BUSY_MS);
    this.sink.fire(MASTER_TRIGGERS[name]);
  }

  /** Espera un evento Rive (con timeout de seguridad). */
  waitEvent(name: string, timeoutMs = 4000): Promise<boolean> {
    return new Promise(resolve => {
      let done = false;
      const finish = (ok: boolean) => { if (done) return; done = true; this.waiters = this.waiters.filter(w => w !== fn); resolve(ok); };
      const fn = (n: string) => { if (n === name) finish(true); };
      this.waiters.push(fn);
      this.after(timeoutMs, () => finish(false));
    });
  }

  wait(ms: number): Promise<void> { return new Promise(r => this.after(ms, r)); }

  // ------------------------------------------------------------------ semantic API
  expression(e: Expression) { const i = EXPRESSIONS.indexOf(e); if (i >= 0) this.set({ emotion: i }); }

  pose(name: PoseName, opts: { dur?: number } = {}) {
    const p: PoseSpec = POSES[name];
    if (p.bools) for (const [k, v] of Object.entries(p.bools)) this.setBool(k as MasterBool, v as boolean);
    if (p.expression) this.expression(p.expression);
    if (p.numbers) this.actTo(p.numbers, opts.dur);
    if (p.trigger) this.trigger(p.trigger);
  }

  /**
   * Mover varios canales con el escalonado de actuación (ojos → cabeza → cuerpo → alas → cola).
   * durScale: duración de referencia (400 = normal). ease (v3.3, opcional): curva para todos los canales.
   */
  actTo(numbers: Partial<Record<MasterNumber, number>>, durScale?: number, ease?: Ease) {
    const k = durScale ? durScale / 400 : 1;
    for (const name of Object.keys(numbers) as MasterNumber[]) {
      const ch = CHANNELS[name];
      this.set({ [name]: numbers[name] } as Partial<Record<MasterNumber, number>>, { dur: ch.dur * k, delay: ch.delay * k, ...(ease ? { ease } : {}) });
    }
  }

  /** Lado hacia el que mira el personaje en pantalla (1 derecha, -1 izquierda/espejo). */
  get facing(): 1 | -1 { return this.values.facing < 0 ? -1 : 1; }

  /**
   * Darse la vuelta (espejo de todo el personaje) con actuación: parpadeo + pequeño squash ocultan el cambio.
   * El dibujo original mira a la derecha; mirando a la izquierda se ve el mismo dibujo en espejo.
   */
  face(dir: -1 | 1) {
    if (this.disposed || this.facing === dir) return;
    this.trigger('blink');
    this.set({ bodySquash: 0.35 }, { dur: 90, delay: 0 });
    this.set({ facing: dir }, { dur: 80, delay: 70, ease: 'linear' });
    this.after(170, () => this.set({ bodySquash: 0 }, { dur: 220, ease: 'outBack' }));
  }

  /**
   * Mirar algo: ojos primero, la cabeza acompaña, el cuerpo sólo si está muy al costado; si está detrás, se da vuelta.
   * Con un ánimo, "mirar al usuario" vuelve a la actitud de ese ánimo (la capa de ánimo sigue sumada).
   * v3.3: durScale / ease opcionales (como actTo) para mirar más lento o sin rebote.
   */
  lookAt(target: LookTarget, opts: { body?: boolean; turn?: boolean; durScale?: number; ease?: Ease } = {}) {
    if (target === 'user') { this.actTo({ gazeX: 0, gazeY: 0, headYaw: 0, headPitch: 0, ...(opts.body ? { bodyTurn: 0 } : {}) }, opts.durScale, opts.ease); return; }
    if (opts.turn !== false && target.dx * this.facing < -220) this.face(target.dx < 0 ? -1 : 1);
    const dx = target.dx * this.facing, dy = target.dy;      // coordenadas locales del personaje
    const dist = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, dist / 110);
    const gx = clamp((dx / dist) * reach), gy = clamp((-dy / dist) * reach);
    const hy = clamp(dx / 260) * 0.9, hp = clamp(-dy / 320) * 0.8;
    const n: Partial<Record<MasterNumber, number>> = { gazeX: gx, gazeY: gy, headYaw: hy, headPitch: hp };
    if (opts.body !== false && Math.abs(dx) > 220) n.bodyTurn = clamp(dx / 600) * 0.6;
    this.actTo(n, opts.durScale, opts.ease);
  }

  /** "mira al usuario → mira el objetivo → vuelve al usuario → pequeña inclinación". */
  glance(target: LookTarget, opts: { hold?: number; tilt?: boolean } = {}): Promise<void> {
    return this.acting(async () => {
      this.lookAt(target, { turn: false });
      await this.wait(opts.hold ?? 900);
      this.lookAt('user', { body: true });
      if (opts.tilt !== false) {
        this.set({ headRoll: 0.35 }, { delay: 120 });
        await this.wait(650);
        this.set({ headRoll: 0 });
      }
    });
  }

  pointTo(target: { dx: number; dy: number }): Promise<void> {
    return this.acting(async () => {
      const dir: -1 | 1 = target.dx < 0 ? -1 : 1;
      this.expression('encouraging');
      this.face(dir);                                      // se gira hacia el objetivo y señala con el ala cercana
      await this.wait(this.values.facing === dir ? 0 : 180);
      this.lookAt(target, { body: false, turn: false });
      this.actTo({ bodyTurn: 0.6, headYaw: 0.6 });
      await this.wait(120);
      this.trigger('pointRight');
      await this.waitEvent('PHOENIX_ACTION_COMPLETE', 2600);
      this.lookAt('user', { body: true });
    });
  }

  /** Reacciones con micro-historia. */
  react(kind: 'success' | 'retry' | 'welcome' | 'explain' | 'think' | 'encourage' | 'celebrate' | 'surprise'): Promise<void> {
    return this.acting(async () => {
      switch (kind) {
        case 'celebrate': return this.celebrate();
        case 'surprise':
          this.expression('surprised'); this.set({ bodyStretch: 0.6 }); await this.wait(220); this.set({ bodyStretch: 0 });
          this.trigger('blink'); return;
        case 'think': this.pose('THINK'); await this.waitEvent('PHOENIX_ACTION_COMPLETE', 3000); this.expression('neutral'); this.lookAt('user'); this.set({ headRoll: 0 }); return;
        case 'success':
          this.expression('excited'); this.lookAt('user'); this.trigger('success');
          await this.waitEvent('PHOENIX_ACTION_COMPLETE', 2600); this.expression('happy'); return;
        case 'retry': this.expression('retry'); this.trigger('retry'); await this.waitEvent('PHOENIX_ACTION_COMPLETE', 2600); this.expression('encouraging'); return;
        case 'welcome': this.pose('WELCOME'); await this.waitEvent('PHOENIX_ACTION_COMPLETE', 2600); return;
        case 'explain': this.expression('happy'); this.trigger('explain'); await this.waitEvent('PHOENIX_ACTION_COMPLETE', 3000); return;
        case 'encourage': this.pose('ENCOURAGE'); await this.waitEvent('PHOENIX_ACTION_COMPLETE', 2600); this.set({ headRoll: 0 }); return;
      }
    });
  }

  /**
   * Micro-historia de logro: mira el indicador → ojos se agrandan → anticipa → salta → alas → vuela
   * → celebra → aterriza → mira al usuario → idle.
   */
  celebrate(indicator?: { dx: number; dy: number }): Promise<void> {
    return this.acting(async () => {
      if (indicator) { this.lookAt(indicator); await this.wait(420); }
      this.expression('surprised');                       // ojos se agrandan
      this.set({ bodySquash: 0.5 }, { dur: 140 });        // anticipación
      await this.wait(160);
      this.set({ bodySquash: 0 }, { dur: 90 });
      this.expression('excited');
      this.lookAt('user');
      this.trigger('celebrate');                          // salto, alas, vuelo corto, aterrizaje (clip)
      await this.waitEvent('PHOENIX_ACTION_COMPLETE', 3200);
      this.expression('happy');
      await this.wait(1200);
      this.expression('neutral');
    });
  }

  /** Entrar / salir por un lado (dentro del artboard). Para recorrer la pantalla usar PhoenixStage. */
  enter(side: Side): Promise<void> {
    return this.acting(async () => {
      const dir = side === 'left' ? 1 : side === 'right' ? -1 : 0;   // dirección de viaje en x (pantalla)
      if (dir) { this.set({ facing: dir }, { instant: true }); this.actTo({ bodyTurn: 0.9, headYaw: 0.9, gazeX: 0.5 }, 120); }
      this.trigger(('enter' + cap(side)) as MasterTrigger);
      await this.waitEvent('PHOENIX_ACTION_COMPLETE', 2400);
      this.lookAt('user', { body: true });
    });
  }

  exit(side: Side): Promise<void> {
    return this.acting(async () => {
      const dir = side === 'left' ? -1 : side === 'right' ? 1 : 0;
      if (dir) { this.face(dir as -1 | 1); this.actTo({ bodyTurn: 0.9, headYaw: 0.9, gazeX: 0.6 }); }
      await this.wait(dir && this.values.facing !== dir ? 320 : 140);
      this.trigger(('exit' + cap(side)) as MasterTrigger);
      await this.waitEvent('PHOENIX_ACTION_COMPLETE', 2000);
    });
  }

  talk(on: boolean) { this.setBool('isTalking', on); if (!on) this.set({ mouth: 1 }); }
  mouth(shape: MouthShape | number) { this.set({ mouth: typeof shape === 'number' ? shape : MOUTH[shape] }); }

  /** Visemas futuros: [{t: ms, mouth: 0..3}] — corre en paralelo a cualquier animación del cuerpo. */
  speak(track: Array<{ t: number; mouth: number }>) {
    this.setBool('isTalking', false);
    for (const k of track) this.after(k.t, () => this.set({ mouth: k.mouth }));
    const end = track.length ? track[track.length - 1].t + 120 : 0;
    if (!this.disposed) this.markBusy(end + IDLE_GRACE_MS);
    this.after(end, () => this.set({ mouth: 1 }));
  }

  /** Volar (dir = dirección en pantalla): mira hacia donde va, se inclina hacia delante, alas abiertas. */
  fly(on: boolean, dir: -1 | 0 | 1 = 0) {
    this.setBool('isFlying', on);
    if (on && dir) { this.face(dir as -1 | 1); this.actTo({ bodyTurn: 1, headYaw: 1, bodyLean: 0.8, gazeX: 0.6, wingSpreadL: 0.5, wingSpreadR: 0.5 }); }
    if (!on) this.actTo({ bodyLean: 0, rotation: 0, wingSpreadL: 0, wingSpreadR: 0 });
  }
  hover(on: boolean) { this.setBool('isHovering', on); }
  takeOff(): Promise<void> { return this.acting(async () => { this.trigger('takeOff'); await this.waitEvent('PHOENIX_ACTION_COMPLETE', 2000); }); }
  land(): Promise<void> {
    return this.acting(async () => { this.setBool('isFlying', false); this.setBool('isHovering', false); this.trigger('land'); await this.waitEvent('PHOENIX_ACTION_COMPLETE', 2400); });
  }

  /** Pista de velocidad horizontal (px/s) mientras PhoenixStage mueve la vista: alimenta la inercia de la cola. */
  travelHint(vx: number) { this.tail.travelVx = vx; if (!this.disposed) this.markBusy(IDLE_GRACE_MS); this.kick(); }

  /** Pequeño "aterrizaje" al llegar a un punto (squash + follow-through). */
  settle(): Promise<void> {
    return this.acting(async () => {
      this.set({ bodySquash: 0.55 }, { dur: 110 });
      await this.wait(120);
      this.set({ bodySquash: 0 }, { dur: 260, ease: 'outBack' });
    });
  }

  // ------------------------------------------------------------------ v3.2: vida autónoma
  /** true mientras el planificador de micro-conductas autónomas está activo. */
  get isAlive() { return this.aliveOn; }

  /**
   * Vida autónoma: cada 5–11 s (aleatorio; según el ánimo, ver MOOD_PROFILES) una micro-conducta — glance, curious,
   * doubleBlink, stretch, shuffle (+ flutter en alegre, lookUp en triste) — nunca la misma dos veces seguidas. Sólo
   * actúa con el personaje en reposo (sin acción en curso, sin hablar, sin volar/flotar, sin mirada dirigida, sin
   * viajar); si está ocupado, reintenta. Usa sólo el reloj inyectado.
   * alive(false) cancela todo lo pendiente y devuelve a su valor previo los canales que tocó.
   * Con reduceMotion activo no arranca (guarda las opciones; volver a encenderlo queda a cargo de quien llama).
   */
  alive(on = true, opts: AliveOptions = {}) {
    if (this.disposed) return;
    if (!on) {
      this.aliveOn = false;
      for (const h of this.aliveTimers) { this.clock.clearTimeout(h); this.timers.delete(h); }
      this.aliveTimers.clear();
      this.aliveRelease();
      return;
    }
    if (Object.keys(opts).length) {                      // sin opciones se conserva la configuración anterior
      const minGapMs = opts.minGapMs == null ? undefined : Math.max(0, opts.minGapMs);
      this.aliveCfg = { minGapMs, maxGapMs: opts.maxGapMs, rng: opts.rng ?? Math.random, onBehaviour: opts.onBehaviour };
    }
    if (this.aliveOn || this.reduced) return;            // ya activo: no reinicia · reduceMotion: sin movimiento autónomo
    this.aliveOn = true;
    this.aliveAfter(this.aliveGap(), () => this.aliveStep());
  }

  /**
   * Accesibilidad (reduce motion): on → alive(false) y life/lifeGaze/fire a 0. off → los devuelve a 1 (life a su
   * nivel de reposo, ver lifeLevel); alive queda a cargo de quien llama. El ánimo se sigue aplicando (sin transición
   * del Director: la pose se pone al instante).
   */
  reduceMotion(on: boolean) {
    if (this.disposed || (!on && !this.reduced)) return;
    this.reduced = on;
    if (on) this.alive(false);
    const v = on ? 0 : 1;
    this.restLifeGaze = v;
    this.set({ life: on ? 0 : this.restLife, fire: v });
    if (on || this.gaze === 'user') this.set({ lifeGaze: v });   // con mirada dirigida se restaura al volver al usuario
  }

  /**
   * v3.3: amplitud de reposo de la vida del .riv (`life`, 0–1, por defecto 1). P. ej. 0.4 en la tarjeta «Hoy»:
   * respira y se mueve, pero sin distraer. Con reduceMotion queda en 0 y vuelve a este valor al apagarlo.
   */
  lifeLevel(v: number) {
    if (this.disposed) return;
    this.restLife = this.clampValue('life', v);
    if (!this.reduced && this.target('life') !== this.restLife) this.set({ life: this.restLife });
  }

  // ------------------------------------------------------------------ v3.3: ánimo vivo y celebración corta
  /** Ánimo que muestra el rig ahora (durante una celebrateShort, un cambio pedido queda pendiente hasta que termina). */
  get currentMood(): PhoenixMood { return MOODS[this.values.mood] ?? 'neutral'; }

  /**
   * Ánimo según el semáforo (ver moodFromSemaforo). Nunca es una imagen fija: es el mismo rig, vivo, con otra actitud.
   * - `mood` al instante, ENTERO (0 neutral · 1 alegre · 2 serio · 3 triste; números acotados y redondeados, nombre
   *   desconocido = neutral). El .riv anima la transición de pose (≤ 400 ms) y el gesto al mejorar.
   * - `energy` → la del ánimo (alegre 0.65 · serio 0.4 · triste 0.2 · neutral 0.5) en ~350 ms.
   * - Actitud 2.5D de reposo (MOOD_PROFILES.attitude) con el escalonado de actuación y el tempo del ánimo.
   * - alive() se re-sintoniza: pesos, pausas, tempo, amplitud y micro-conductas propias; la micro-conducta en curso
   *   se suelta y alive espera a que el .riv termine la transición.
   * Con reduceMotion (u opts.instant, p. ej. al aparecer) energía y actitud se ponen al instante. Repetir el mismo
   * ánimo no hace nada. Durante una celebrateShort no cambia: lo guarda y lo aplica al terminar (el último pedido gana).
   */
  mood(m: PhoenixMoodInput, opts: { instant?: boolean } = {}) {
    if (this.disposed) return;
    const i = MOODS.indexOf(normalizeMood(m));
    if (this.short) { this.pendingMood = { i, instant: !!opts.instant }; return; }
    this.applyMood(i, !!opts.instant);
  }

  /**
   * Celebración corta (trgCelebrateShort, ≤ 2,5 s, termina en reposo): resuelve con PHOENIX_ACTION_COMPLETE (timeout de
   * seguridad 3,5 s). Cuenta como acción en curso para alive(). No toca `mood`: la capa de ánimo del .riv sigue debajo
   * y al terminar el fénix ya está en su ánimo; la actitud 2.5D del Director se relaja durante el clip y vuelve al
   * terminar. Con reduceMotion no anima y resuelve al instante. Si ya hay una en curso devuelve la misma promesa.
   */
  celebrateShort(): Promise<void> {
    if (this.disposed || this.reduced) return Promise.resolve();
    if (this.short) return this.short.promise;
    let release: () => void = () => {};
    const cut = new Promise<void>(r => { release = r; });
    const run: { promise: Promise<void>; release: () => void } = { promise: Promise.resolve(), release: () => release() };
    this.short = run;
    run.promise = this.acting(async () => {
      this.attitudeTo({}, SHORT_RELAX_TEMPO);
      this.trigger('celebrateShort');
      await Promise.race([this.waitEvent('PHOENIX_ACTION_COMPLETE', CELEBRATE_SHORT_TIMEOUT_MS), cut]);
    }).finally(() => {
      if (this.short === run) this.short = null;
      const pend = this.pendingMood;
      this.pendingMood = null;
      if (this.disposed) return;
      const p = this.profile();
      this.attitudeTo(p.attitude, this.reduced ? 0 : p.tempo, p.ease);   // vuelve a la actitud de su ánimo
      if (pend) this.applyMood(pend.i, pend.instant);                     // y aplica el ánimo pedido durante el clip
    });
    return run.promise;
  }

  // ------------------------------------------------------------------ internals
  /** Perfil del ánimo actual. */
  private profile(): MoodProfile { return MOOD_PROFILES[MOODS[this.values.mood] ?? 'neutral']; }

  private applyMood(i: number, instant: boolean) {
    if (this.disposed || this.values.mood === i) return;               // mismo ánimo: nada que hacer
    this.values.mood = i;
    delete this.tweens.mood;
    this.push('mood');                                                 // al instante y entero: el .riv anima la pose
    const p = this.profile();
    const still = instant || this.reduced;
    this.set({ energy: p.energy }, still ? { instant: true } : { dur: MOOD_ENERGY_MS });
    this.attitudeTo(p.attitude, still ? 0 : p.tempo, p.ease);
    this.aliveRelease();                                               // suelta la micro-conducta del ánimo anterior
    this.markBusy(MOOD_SETTLE_MS + IDLE_GRACE_MS);                     // no interrumpe la transición ni el gesto del .riv
    if (this.aliveOn) this.aliveReschedule();                          // el ritmo nuevo rige desde ya
  }

  /**
   * Lleva la capa de ánimo a una actitud (ejes que no figuran → 0) con el escalonado de actuación × tempo.
   * tempo 0 = al instante. Interrumpible: cada eje parte de donde está.
   */
  private attitudeTo(att: Readonly<Partial<Record<MasterNumber, number>>>, tempo: number, ease?: Ease) {
    if (this.disposed) return;
    const now = this.clock.now();
    for (const k of MOOD_AXES) {
      const to = att[k] ?? 0;
      const from = this.moodOff[k] ?? 0;
      if (tempo <= 0) {
        delete this.moodTweens[k];
        if (from !== to) { this.moodOff[k] = to; this.push(k); }
        continue;
      }
      const tw = this.moodTweens[k];
      if (tw ? tw.to === to : from === to) continue;                    // ya está (o ya va) ahí
      const ch = CHANNELS[k];
      this.moodTweens[k] = { from, to, start: now + ch.delay * tempo, dur: ch.dur * tempo, ease: EASE[ease ?? ch.ease] };
    }
    this.kick();
  }

  /**
   * Valor de salida de un canal: valor pedido + actitud del ánimo, ponderada por cuánto le queda al eje hasta su
   * extremo (en reposo pesa entera; con el eje en ±1 desaparece, así las poses extremas llegan exactas).
   */
  private out(k: MasterNumber) {
    const v = this.values[k];
    const o = this.moodOff[k];
    if (!o) return v;
    return this.clampValue(k, v + o * (1 - Math.min(1, Math.abs(v))));
  }

  /** Única puerta de lifeGaze (la llama set() cuando cambia gazeX/gazeY): mirada dirigida → 0; de vuelta al usuario → reposo. */
  private gateGaze() {
    const away = Math.abs(this.target('gazeX')) > GAZE_EPS || Math.abs(this.target('gazeY')) > GAZE_EPS;
    if (away) {
      this.gaze = 'directed';
      if (this.target('lifeGaze') !== 0) this.set({ lifeGaze: 0 }, { dur: GAZE_GATE_MS });
    } else if (this.gaze === 'directed') {
      this.gaze = 'returning';                           // tick() restaura lifeGaze cuando terminan ojos y cabeza
    }
  }

  /** Valor final hacia el que va un canal (el del tween en curso, si hay). */
  private target(k: MasterNumber) {
    if (k === 'tailSwing') return this.tail.tween?.to ?? this.tail.base;
    return this.tweens[k]?.to ?? this.values[k];
  }

  private markBusy(ms: number) { this.busyUntil = Math.max(this.busyUntil, this.clock.now() + ms); }

  /** Envuelve una acción async: mientras dura (y un margen después) alive() no interviene. */
  private async acting(fn: () => Promise<void>): Promise<void> {
    this.busyCount++;
    try { await fn(); } finally { this.busyCount--; if (!this.disposed) this.markBusy(IDLE_GRACE_MS); }
  }

  private isIdle() {
    return this.busyCount === 0 && this.clock.now() >= this.busyUntil && this.gaze === 'user' && this.tail.travelVx === 0
      && !this.bools.isTalking && !this.bools.isFlying && !this.bools.isHovering;
  }

  /** Base de la cola animada (el resorte de follow-through sigue sumándose encima). */
  private tailTo(to: number, dur: number, delay = 0) {
    if (this.disposed) return;
    const ch = CHANNELS.tailSwing;
    this.tail.tween = { from: this.tail.base, to: clamp(to), start: this.clock.now() + delay, dur, ease: EASE[ch.ease] };
    this.markBusy(delay + dur + IDLE_GRACE_MS);
    this.kick();
  }

  private aliveAfter(ms: number, fn: () => void) {
    if (this.disposed || !this.aliveOn) return;
    const h = this.clock.setTimeout(() => {
      this.timers.delete(h); this.aliveTimers.delete(h);
      if (!this.disposed && this.aliveOn) fn();
    }, ms);
    this.timers.add(h); this.aliveTimers.add(h);
  }

  /**
   * Pausa hasta la próxima micro-conducta, según el ánimo. Si la app pasó minGapMs/maxGapMs, ésas son las de neutral y
   * los demás ánimos las escalan en la misma proporción que sus pausas por defecto.
   */
  private aliveGap() {
    const { minGapMs, maxGapMs, rng } = this.aliveCfg;
    const p = this.profile();
    const min = (minGapMs ?? NEUTRAL_GAPS.min) * (p.minGapMs / NEUTRAL_GAPS.min);
    const max = Math.max(min, (maxGapMs ?? Math.max(minGapMs ?? 0, NEUTRAL_GAPS.max)) * (p.maxGapMs / NEUTRAL_GAPS.max));
    return min + (max - min) * rng();
  }

  private aliveStep() {
    if (!this.isIdle()) { this.aliveAfter(ALIVE_RETRY_MS, () => this.aliveStep()); return; }
    const kind = this.alivePick();
    this.aliveLast = kind;
    const ms = this.aliveBehave(kind);
    this.aliveCfg.onBehaviour?.(kind);
    this.aliveAfter(ms + this.aliveGap(), () => this.aliveStep());
  }

  /** v3.3: al cambiar de ánimo el planificador vuelve a empezar con el ritmo nuevo. */
  private aliveReschedule() {
    for (const h of this.aliveTimers) { this.clock.clearTimeout(h); this.timers.delete(h); }
    this.aliveTimers.clear();
    this.aliveAfter(this.aliveGap(), () => this.aliveStep());
  }

  /** Elección ponderada (pesos del ánimo actual), nunca la misma que la anterior. */
  private alivePick(): AliveBehaviour {
    const w = this.profile().weights;
    const all = (Object.keys(w) as AliveBehaviour[]).filter(k => (w[k] ?? 0) > 0);
    const others = all.filter(k => k !== this.aliveLast);
    const pool = others.length ? others : all;
    const total = pool.reduce((s, k) => s + (w[k] ?? 0), 0);
    let r = this.aliveCfg.rng() * total;
    for (const k of pool) { r -= w[k] ?? 0; if (r < 0) return k; }
    return pool[pool.length - 1];
  }

  /**
   * Ejecuta una micro-conducta; devuelve su duración aproximada (ms). Tiempos × tempo y amplitudes × amp del ánimo
   * (neutral: 1 y 1, idéntico a v3.2).
   */
  private aliveBehave(kind: AliveBehaviour): number {
    const rng = this.aliveCfg.rng;
    const between = (a: number, b: number) => a + (b - a) * rng();
    const sign = () => (rng() < 0.5 ? -1 : 1);
    const { tempo: t, amp: a, ease } = this.profile();
    switch (kind) {
      case 'glance': {                                    // mira algo cercano y vuelve al usuario (serio: corto y lento)
        const hold = between(600, 1100) * t;
        this.aliveTake(['gazeX', 'gazeY', 'headYaw', 'headPitch', 'bodyTurn']);
        this.lookAt({ dx: sign() * between(80, 220) * a, dy: between(-89, 89) * a }, { turn: false, durScale: 400 * t, ease });
        this.aliveMark();
        this.aliveLater(hold, () => this.aliveRelease(400 * t));
        return hold + 450 * t;
      }
      case 'curious': {                                   // ladea la cabeza, ojos un poco arriba, cara de curiosidad
        this.aliveTake(['headRoll', 'gazeY'], true);
        this.actTo({ headRoll: sign() * between(0.3, 0.45) * a, gazeY: between(0.15, 0.3) * a }, 400 * t, ease);
        this.expression('curious');
        this.aliveMark();
        this.aliveLater(1200 * t, () => this.aliveRelease(400 * t));
        return 1650 * t;
      }
      case 'doubleBlink':                                 // triste: el segundo parpadeo llega más tarde (pesado)
        this.trigger('blink');
        this.aliveAfter(between(170, 220) * t, () => this.trigger('blink'));
        return 300 * t;
      case 'stretch':                                     // estira cuerpo y abre alas (~350 ms), sostiene 300 ms, vuelve (~500 ms)
        this.aliveTake(['bodyStretch', 'wingSpreadL', 'wingSpreadR']);
        this.actTo({ bodyStretch: 0.35 * a, wingSpreadL: 0.55 * a, wingSpreadR: 0.55 * a }, 270 * t, ease);
        this.aliveMark();
        this.aliveLater(650 * t, () => this.aliveRelease(380 * t));
        return 1200 * t;
      case 'shuffle': {                                   // cambio de peso: el cuerpo se inclina, la cola compensa
        const s = sign();
        const ch = CHANNELS.tailSwing;
        this.aliveTake(['bodyLean', 'tailSwing']);
        this.actTo({ bodyLean: 0.2 * s * a }, 400 * t, ease);
        this.tailTo(-0.4 * s * a, ch.dur * 0.8 * t, ch.delay * 0.5 * t);
        this.aliveMark();
        this.aliveLater(700 * t, () => this.aliveRelease(400 * t));
        return 1400 * t;
      }
      case 'flutter': {                                   // v3.3 alegre: aleteo feliz, dos sacudidas cortas con el pecho arriba
        this.aliveTake(['wingL', 'wingR', 'bodyStretch']);
        this.actTo({ wingL: 0.45 * a, wingR: 0.45 * a, bodyStretch: 0.15 * a }, 150 * t, ease);
        this.aliveMark();
        this.aliveLater(240 * t, () => this.aliveNudge({ wingL: 0.1 * a, wingR: 0.1 * a }, 150 * t, ease));
        this.aliveLater(480 * t, () => this.aliveNudge({ wingL: 0.4 * a, wingR: 0.4 * a }, 150 * t, ease));
        this.aliveLater(760 * t, () => this.aliveRelease(260 * t));
        return 1250 * t;
      }
      case 'lookUp': {                                    // v3.3 triste: «intenta levantarse» — cabeza y mirada arriba ~1,2 s, se asienta
        this.aliveTake(['headPitch', 'gazeY', 'wingL', 'wingR', 'bodyStretch']);
        this.actTo({ headPitch: 0.5 * a, gazeY: 0.6 * a, wingL: 0.2 * a, wingR: 0.2 * a, bodyStretch: 0.15 * a }, 400 * t, ease);
        this.aliveMark();
        this.aliveLater(1200, () => this.aliveRelease(480 * t));
        return 1200 + 900 * t;
      }
    }
  }

  /** Como aliveAfter, pero sólo si sigue en curso la misma micro-conducta (un ánimo nuevo o alive(false) la cortan). */
  private aliveLater(ms: number, fn: () => void) {
    const run = this.aliveRun;
    this.aliveAfter(ms, () => { if (run && this.aliveRun === run) fn(); });
  }

  /** Paso intermedio de una micro-conducta: mueve sólo los canales que siguen siendo de alive. */
  private aliveNudge(numbers: Partial<Record<MasterNumber, number>>, durScale: number, ease?: Ease) {
    const run = this.aliveRun;
    if (!run || this.disposed) return;
    const own: Partial<Record<MasterNumber, number>> = {};
    for (const k of Object.keys(numbers) as MasterNumber[]) {
      const mine = run.mine[k];
      if (mine !== undefined && Math.abs(this.target(k) - mine) < 1e-6) own[k] = numbers[k];
    }
    if (!Object.keys(own).length) return;
    this.actTo(own, durScale, ease);
    for (const k of Object.keys(own) as MasterNumber[]) run.mine[k] = this.target(k);
  }

  /** Guarda el valor previo de los canales que va a tocar una micro-conducta. */
  private aliveTake(keys: MasterNumber[], emotion = false) {
    const rest: Partial<Record<MasterNumber, number>> = {};
    for (const k of keys) rest[k] = this.target(k);
    this.aliveRun = { rest, mine: {}, ...(emotion ? { emotion: { prev: this.values.emotion, mine: this.values.emotion } } : {}) };
  }

  /** Tras aplicarla: anota los objetivos que puso alive (para no pisar después lo que haya ordenado la app). */
  private aliveMark() {
    const run = this.aliveRun;
    if (!run) return;
    for (const k of Object.keys(run.rest) as MasterNumber[]) run.mine[k] = this.target(k);
    if (run.emotion) run.emotion.mine = this.values.emotion;
  }

  /** Devuelve a su valor previo sólo los canales que siguen siendo de alive (si la app los cambió, manda la app). */
  private aliveRelease(durScale?: number) {
    const run = this.aliveRun;
    this.aliveRun = null;
    if (!run || this.disposed) return;
    const back: Partial<Record<MasterNumber, number>> = {};
    for (const k of Object.keys(run.mine) as MasterNumber[]) {
      const mine = run.mine[k] as number, rest = run.rest[k] as number;
      if (mine !== rest && Math.abs(this.target(k) - mine) < 1e-6) back[k] = rest;
    }
    if (back.tailSwing !== undefined) {
      const ch = CHANNELS.tailSwing, k = durScale ? durScale / 400 : 1;
      this.tailTo(back.tailSwing, ch.dur * k, ch.delay * k * 0.5);
      delete back.tailSwing;
    }
    if (Object.keys(back).length) this.actTo(back, durScale);
    if (run.emotion && this.values.emotion === run.emotion.mine && run.emotion.prev !== run.emotion.mine) this.set({ emotion: run.emotion.prev });
  }
  private clampValue(k: MasterNumber, v: number) {
    const r = RANGE[k] ?? [-1, 1];
    const c = Math.max(r[0], Math.min(r[1], Number.isFinite(v) ? v : MASTER_NUMBERS[k]));
    return k === 'mood' ? Math.round(c) : c;                // mood es un índice: siempre entero
  }

  private after(ms: number, fn: () => void) {
    if (this.disposed) return;
    const h = this.clock.setTimeout(() => { this.timers.delete(h); if (!this.disposed) fn(); }, ms);
    this.timers.add(h);
  }

  private push(k: MasterNumber, force = false) {
    const v = this.out(k);
    const last = this.sent[k];
    if (this.opts.lifeInputs === false && AMBIENT.has(k)) { this.sent[k] = v; return; }   // .riv sin entradas v3.2
    if (last === undefined || (force ? last !== v : Math.abs(last - v) > 0.0015)) { this.sent[k] = v; this.sink.setNumber(k, v); }
  }

  private kick() {
    if (this.disposed || this.frame != null) return;
    this.tail.lastT = this.clock.now();
    this.frame = this.clock.requestFrame(() => this.tick());
  }

  private tick() {
    this.frame = null;
    if (this.disposed) return;
    const now = this.clock.now();
    let busy = false;
    // v3.3: capa de ánimo primero (los canales que también tienen tween de la app se envían una sola vez, abajo)
    const moodMoved = new Map<MasterNumber, boolean>();
    for (const k of Object.keys(this.moodTweens) as MasterNumber[]) {
      const tw = this.moodTweens[k]!;
      if (now < tw.start) { busy = true; continue; }
      const t = Math.min(1, (now - tw.start) / tw.dur);
      this.moodOff[k] = t >= 1 ? tw.to : tw.from + (tw.to - tw.from) * tw.ease(t);
      moodMoved.set(k, t >= 1);
      if (t >= 1) delete this.moodTweens[k]; else busy = true;
    }
    for (const k of Object.keys(this.tweens) as MasterNumber[]) {
      const tw = this.tweens[k]!;
      if (now < tw.start) { busy = true; continue; }
      const t = Math.min(1, (now - tw.start) / tw.dur);
      this.values[k] = t >= 1 ? tw.to : tw.from + (tw.to - tw.from) * tw.ease(t);
      this.push(k, t >= 1 || moodMoved.get(k) === true);
      moodMoved.delete(k);
      if (t >= 1) delete this.tweens[k]; else busy = true;
    }
    for (const [k, done] of moodMoved) this.push(k, done);
    // la mirada terminó de volver al usuario (ojos + cabeza): las miradas autónomas del .riv vuelven a su reposo
    if (this.gaze === 'returning' && !this.tweens.gazeX && !this.tweens.gazeY && !this.tweens.headYaw && !this.tweens.headPitch) {
      this.gaze = 'user';
      if (this.target('lifeGaze') !== this.restLifeGaze) {
        const ch = CHANNELS.lifeGaze;
        this.tweens.lifeGaze = { from: this.values.lifeGaze, to: this.restLifeGaze, start: now, dur: ch.dur, ease: EASE[ch.ease] };
        busy = true;
      }
    }
    // base de la cola animada (micro-conductas de alive); el resorte se suma encima
    const tt = this.tail.tween;
    if (tt) {
      if (now >= tt.start) {
        const t = Math.min(1, (now - tt.start) / tt.dur);
        this.tail.base = t >= 1 ? tt.to : tt.from + (tt.to - tt.from) * tt.ease(t);
        if (t >= 1) this.tail.tween = null;
      }
      if (this.tail.tween) busy = true;
    }
    // tail spring: drag opposite to body-turn / travel velocity, then overshoot and settle
    const dt = Math.max(0.001, Math.min(0.05, (now - this.tail.lastT) / 1000));
    this.tail.lastT = now;
    const turn = this.out('bodyTurn');                    // incluye la actitud del ánimo (serio gira un poco el cuerpo)
    const turnV = (turn - this.tail.lastTurn) / dt;
    const posV = (this.values.positionX - this.tail.lastPosX) / dt;
    this.tail.lastTurn = turn; this.tail.lastPosX = this.values.positionX;
    // drag opposite to the motion, in the character's local frame (mirrored when facing left)
    const force = -(turnV * 0.55 + (posV * 0.8 + this.tail.travelVx / 900) * this.facing);
    const k = 70, c = 9;
    this.tail.v += (force * 9 - k * this.tail.x - c * this.tail.v) * dt;
    this.tail.x += this.tail.v * dt;
    if (Math.abs(this.tail.x) < 0.002 && Math.abs(this.tail.v) < 0.01 && Math.abs(force) < 0.01) { this.tail.x = 0; this.tail.v = 0; } else busy = true;
    this.values.tailSwing = clamp(this.tail.base + this.tail.x);
    this.push('tailSwing', this.tail.x === 0);
    if (busy) this.frame = this.clock.requestFrame(() => this.tick());
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
