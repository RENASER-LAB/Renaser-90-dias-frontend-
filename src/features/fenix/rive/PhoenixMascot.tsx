/**
 * PhoenixMascot — el fénix vivo de Renaser (Rive), tomado de la entrega del diseñador PHOENIX_MASTER v3.3
 * (`rn/PhoenixMascot.tsx`). Contrato y orden de arranque sin cambios (§8.3): al recibir `PHOENIX_READY` →
 * resync → life / reduceMotion / alive → ánimo al instante → acción en cola → celebrateShort en cola → onReady.
 *
 * Adaptado al repo (2026-10-06) en tres cosas, nada más:
 * - **Solo la variante `master`.** La entrega trae además `v1` y `2.5d`, cuyos `.riv` no vinieron ni se usan; con ellas
 *   se fueron sus caminos de degradación (`react` → `play`, etc.). El Director (`phoenixMaster.ts`) es el original.
 * - **La vista Rive entra por `vistaRive`** (`.native.tsx` en el teléfono, nada en la web). En la web
 *   `rive-react-native` revienta al importarse, así que no basta con no montarlo: no se importa.
 * - **Imágenes de respaldo de 512 px** (`png_512/` de la misma entrega) en vez de las de 1024: se ven a ≤ 200 px y
 *   pesan un tercio.
 *
 * El fénix SIEMPRE es el rig vivo. Las imágenes fijas son solo respaldo: si el `.riv` no carga (onError) y en la web.
 * Con «reducir movimiento» el rig sigue montado y quieto.
 */
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import type { RiveGeneralEvent, RiveOpenUrlEvent, RiveRef, RNRiveError } from 'rive-react-native';

import {
  PhoenixDirector,
  normalizeMood,
  type Expression,
  type LookTarget,
  type MasterBool,
  type MasterNumber,
  type PhoenixMood,
  type PhoenixMoodInput,
} from './phoenixMaster';
import { measureView, usePhoenixTargets, type WindowRect } from './PhoenixTargets';
import { MAQUINA_DE_ESTADOS, VistaRiveDelFenix } from './vistaRive';

/** Contrato con el `.riv` (§3): inputs y eventos v1 que usa el componente. */
export const PHOENIX_RIVE = {
  inputs: { isSpeaking: 'isSpeaking', progress: 'progress', onDarkBackground: 'onDarkBackground' },
  events: { ready: 'PHOENIX_READY', actionComplete: 'PHOENIX_ACTION_COMPLETE', tapped: 'PHOENIX_TAPPED' },
} as const;

/** Respaldo de emergencia (§8.6): la imagen del ánimo actual; sin ánimo conocido, `fallback`. */
export const PHOENIX_STATIC_IMAGES: Readonly<Record<PhoenixMood | 'fallback', ImageSourcePropType>> = {
  fallback: require('../../../../assets/rive/phoenix_fallback.png'),
  neutral: require('../../../../assets/rive/phoenix_neutral.png'),
  alegre: require('../../../../assets/rive/phoenix_alegre.png'),
  serio: require('../../../../assets/rive/phoenix_serio.png'),
  triste: require('../../../../assets/rive/phoenix_triste.png'),
};

export type PhoenixLookTarget = string | { dx: number; dy: number } | 'user';
export type PhoenixReaction = 'success' | 'retry' | 'welcome' | 'explain' | 'think' | 'encourage' | 'celebrate' | 'surprise';

export type PhoenixMascotProps = {
  speaking?: boolean;
  /** 0–100. Sube sutilmente el brillo dorado y la postura. */
  progress?: number;
  /** Lado del cuadrado en px. */
  size?: number;
  /** Halo y brillo cálido para fondos oscuros (`#0C0B09`). */
  onDarkBackground?: boolean;
  /** Si false, el fénix ignora toques: el toque es de quien lo contiene. */
  interactive?: boolean;
  /** Micro-conductas autónomas tras PHOENIX_READY. Por defecto true. */
  alive?: boolean;
  /** Accesibilidad: sin vida autónoma ni fuego; el rig sigue montado y quieto. */
  reduceMotion?: boolean;
  /** Ánimo vivo (§8.2). undefined = no cambia el actual. */
  mood?: PhoenixMoodInput;
  /** Amplitud de la vida del `.riv` (0–1). Por defecto 1; en «Hoy», ~0.4. */
  life?: number;
  onReady?: () => void;
  onActionComplete?: () => void;
  onTap?: () => void;
  onError?: (error: RNRiveError) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

export type PhoenixMascotHandle = {
  /** Controlador semántico (null tras desmontar). */
  director: () => PhoenixDirector | null;
  lookAt: (target: PhoenixLookTarget) => Promise<void>;
  glance: (target: PhoenixLookTarget, opts?: { hold?: number; tilt?: boolean }) => Promise<void>;
  react: (kind: PhoenixReaction) => Promise<void>;
  expression: (e: Expression) => void;
  talk: (on: boolean) => void;
  alive: (on: boolean) => void;
  reduceMotion: (on: boolean) => void;
  mood: (m: PhoenixMoodInput) => void;
  /** Celebración corta (≤ 2,5 s). Antes de READY queda en cola; con error o web resuelve al instante. */
  celebrateShort: () => Promise<void>;
  set: (numbers: Partial<Record<MasterNumber, number>>, bools?: Partial<Record<MasterBool, boolean>>) => void;
  measure: () => Promise<WindowRect | null>;
};

const clampProgress = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

const PhoenixMascotInner = forwardRef<PhoenixMascotHandle, PhoenixMascotProps>(function PhoenixMascot(
  {
    speaking = false,
    progress = 0,
    size = 220,
    onDarkBackground = false,
    interactive = true,
    alive = true,
    reduceMotion = false,
    mood,
    life = 1,
    onReady,
    onActionComplete,
    onTap,
    onError,
    style,
    testID = 'phoenix-mascot',
    accessibilityLabel = 'Fénix de Renaser',
  },
  ref,
) {
  const riveRef = useRef<RiveRef>(null);
  const viewRef = useRef<View>(null);
  const readyRef = useRef(false);
  const targets = usePhoenixTargets();
  const directorRef = useRef<PhoenixDirector | null>(null);
  const [failed, setFailed] = useState(false);
  const failedRef = useRef(false);
  const [shownMood, setShownMood] = useState<PhoenixMood | null>(() => (mood == null ? null : normalizeMood(mood)));
  const moodRef = useRef<PhoenixMood | null>(shownMood);
  const pendingShort = useRef<Array<() => void>>([]);

  const cbs = useRef({ onReady, onActionComplete, onTap, onError });
  cbs.current = { onReady, onActionComplete, onTap, onError };

  const setInput = useCallback((name: string, value: boolean | number) => {
    if (!readyRef.current || !riveRef.current) return;
    riveRef.current.setInputState(MAQUINA_DE_ESTADOS, name, value);
  }, []);

  const latest = useRef({ speaking, progress, onDarkBackground, alive, reduceMotion, life });
  latest.current = { speaking, progress, onDarkBackground, alive, reduceMotion, life };

  const applyLife = useCallback(() => {
    const dd = directorRef.current;
    if (!dd || !readyRef.current) return;
    const { alive: a, reduceMotion: rm, life: l } = latest.current;
    dd.lifeLevel(l);
    dd.reduceMotion(rm);
    dd.alive(a && !rm);
  }, []);

  const applyMood = useCallback((instant: boolean) => {
    const dd = directorRef.current;
    const m = moodRef.current;
    if (dd && m && readyRef.current) dd.mood(m, { instant });
  }, []);

  const setMood = useCallback(
    (m: PhoenixMoodInput) => {
      const n = normalizeMood(m);
      moodRef.current = n;
      setShownMood(n);
      applyMood(false);
    },
    [applyMood],
  );

  const flushShort = useCallback((run: boolean) => {
    const q = pendingShort.current.splice(0);
    if (!q.length) return;
    const done = () => {
      for (const r of q) r();
    };
    const dd = directorRef.current;
    if (run && dd) void dd.celebrateShort().then(done, done);
    else done();
  }, []);

  const syncInputs = useCallback(() => {
    const { speaking: s, progress: p, onDarkBackground: d } = latest.current;
    setInput(PHOENIX_RIVE.inputs.isSpeaking, s);
    setInput(PHOENIX_RIVE.inputs.progress, clampProgress(p));
    setInput(PHOENIX_RIVE.inputs.onDarkBackground, d);
    directorRef.current?.resync();
    applyLife();
    applyMood(true);
  }, [setInput, applyLife, applyMood]);

  const marcarListo = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    syncInputs();
    flushShort(true);
    cbs.current.onReady?.();
  }, [syncInputs, flushShort]);

  const handleEvent = useCallback(
    (event: RiveGeneralEvent | RiveOpenUrlEvent) => {
      directorRef.current?.onEvent(event.name);
      if (event.name === PHOENIX_RIVE.events.ready) marcarListo();
      else if (event.name === PHOENIX_RIVE.events.actionComplete) cbs.current.onActionComplete?.();
      else if (event.name === PHOENIX_RIVE.events.tapped) cbs.current.onTap?.();
    },
    [marcarListo],
  );

  const handleError = useCallback(
    (error: RNRiveError) => {
      readyRef.current = false;
      failedRef.current = true;
      setFailed(true);
      flushShort(false);
      cbs.current.onError?.(error);
    },
    [flushShort],
  );

  if (directorRef.current == null && VistaRiveDelFenix) {
    directorRef.current = new PhoenixDirector({
      setNumber: (name, v) => setInput(name, v),
      setBool: (name, v) => setInput(name, v),
      fire: trigger => {
        if (readyRef.current && riveRef.current) riveRef.current.fireState(MAQUINA_DE_ESTADOS, trigger);
      },
    });
  }
  useEffect(
    () => () => {
      directorRef.current?.dispose();
      directorRef.current = null;
      readyRef.current = false;
      flushShort(false);
    },
    [flushShort],
  );

  const resolveTarget = useCallback(
    async (target: PhoenixLookTarget): Promise<LookTarget | null> => {
      if (target === 'user') return 'user';
      if (typeof target !== 'string') return target;
      const [me, it] = await Promise.all([
        measureView(viewRef.current),
        targets ? targets.measure(target) : Promise.resolve(null),
      ]);
      if (!me || !it) return null;
      return { dx: it.x + it.width / 2 - (me.x + me.width / 2), dy: it.y + it.height / 2 - (me.y + me.height * 0.42) };
    },
    [targets],
  );

  useImperativeHandle(
    ref,
    (): PhoenixMascotHandle => {
      const d = () => directorRef.current;
      return {
        director: d,
        lookAt: async t => {
          const r = await resolveTarget(t);
          if (r) d()?.lookAt(r);
        },
        glance: async (t, o) => {
          const r = await resolveTarget(t);
          if (r) await d()?.glance(r, o);
        },
        react: async k => {
          await d()?.react(k);
        },
        expression: e => d()?.expression(e),
        talk: on => d()?.talk(on),
        alive: on => d()?.alive(on),
        reduceMotion: on => d()?.reduceMotion(on),
        mood: m => setMood(m),
        celebrateShort: async () => {
          const dd = d();
          if (!dd || failedRef.current) return;
          if (!readyRef.current) return new Promise<void>(r => { pendingShort.current.push(r); });
          await dd.celebrateShort();
        },
        set: (nums, bools) => {
          const dd = d();
          if (!dd) return;
          dd.actTo(nums);
          if (bools) for (const [k, v] of Object.entries(bools)) dd.setBool(k as MasterBool, !!v);
        },
        measure: () => measureView(viewRef.current),
      };
    },
    [resolveTarget, setMood],
  );

  useEffect(() => setInput(PHOENIX_RIVE.inputs.isSpeaking, speaking), [speaking, setInput]);
  useEffect(() => setInput(PHOENIX_RIVE.inputs.progress, clampProgress(progress)), [progress, setInput]);
  useEffect(() => setInput(PHOENIX_RIVE.inputs.onDarkBackground, onDarkBackground), [onDarkBackground, setInput]);
  useEffect(() => applyLife(), [alive, reduceMotion, life, applyLife]);
  useEffect(() => {
    if (mood != null) setMood(mood);
  }, [mood, setMood]);

  const box = { width: size, height: size };
  const Vista = failed ? null : VistaRiveDelFenix;

  return (
    <View
      ref={viewRef}
      collapsable={false}
      style={[styles.container, box, style]}
      pointerEvents={interactive ? 'auto' : 'none'}
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {Vista ? (
        <Vista ref={riveRef} style={box} onPlay={marcarListo} onRiveEventReceived={handleEvent} onError={handleError} />
      ) : (
        <Image
          testID={`${testID}-imagen`}
          source={PHOENIX_STATIC_IMAGES[shownMood ?? 'fallback']}
          style={box}
          resizeMode="contain"
        />
      )}
    </View>
  );
});

export const PhoenixMascot = memo(PhoenixMascotInner);
export default PhoenixMascot;

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', overflow: 'visible' },
});
