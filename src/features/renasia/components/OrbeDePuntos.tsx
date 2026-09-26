import React, { useEffect, useMemo } from 'react';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import type { SkPaint, SkPicture, SkRect } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { MODES, acquireDotBuffer, buildColorLUT, pickDesignSize, resolvePreset } from 'expo-thinking-orbs';
import type { ColorLUT, DotBuffer, OrbState } from 'expo-thinking-orbs';

import { cuadrosPorDibujo, periodoSuavizado } from '../utils/ritmoDelOrbe';

/**
 * La nube de puntos del orbe del acompañante: el motor de `expo-thinking-orbs` (MIT, Jakub Antalik)
 * con un reloj propio. Reemplaza al `<ThinkingOrb>` del paquete (2026-09-26) porque en el Xiaomi del
 * dueño "se laguea feo". Se ve igual —mismo motor, mismos presets, mismos colores—; cambia CUÁNDO y
 * CUÁNTAS veces se dibuja:
 *
 * 1. **Tope de cuadros por segundo** (`fpsMaximo`). El paquete grababa la nube en cada cuadro de la
 *    pantalla (90/120 por segundo en un Xiaomi), en el hilo de UI, el mismo del scroll. Acá el reloj
 *    avanza igual pero la foto se vuelve a grabar cada N cuadros (`cuadrosPorDibujo`), así que la
 *    velocidad del movimiento no cambia: solo se saltean cuadros intermedios que no se notan.
 * 2. **Se detiene cuando no se ve** (`activo = false`): otra pestaña, app en segundo plano o
 *    "reducir movimiento". El paquete solo se detenía con reducir movimiento.
 * 3. **Una llamada nativa menos por punto** al grabar (`grabarNube`): el color y la transparencia van
 *    juntos en `setColor`, en vez de `setColor` + `setAlphaf`. Con ~200 puntos en reposo y ~570
 *    hablando, son 200–570 llamadas JSI menos por cuadro.
 */
type Props = {
  estado: OrbState;
  tamano: number;
  oscuro: boolean;
  color: string;
  colorHasta: string;
  /** Multiplica la velocidad del preset (el "tempo" de cada fase). */
  velocidad: number;
  /** Grosor de los puntos (el `dotScale` del paquete). */
  escalaDePunto: number;
  fpsMaximo: number;
  /** `false` congela el orbe en su pose: nadie lo ve o se pidió reducir movimiento. */
  activo: boolean;
  /** Con reducir movimiento el color queda fijo a mitad del degradé, como hacía el paquete. */
  movimientoReducido: boolean;
};

/** Mismo tope que el paquete: tras una pausa o un tirón, el reloj avanza a lo sumo esto. */
const DT_MAXIMO_MS = 100;
/** Mismos valores por defecto que el paquete (`colorSpread`, `colorCycleMs`). */
const DISPERSION_DE_COLOR = 0.6;
const CICLO_DE_COLOR_MS = 9000;

/*
 * OJO CON EL ORDEN de este archivo: cada función `'worklet'` se compila a `var f = fabrica({...})`, que
 * NO se eleva, y la fábrica copia en ese momento las funciones que usa. Si `grabarNube` quedara antes
 * que `ordenarPorProfundidad`, copiaría `undefined` (el mismo error del 2026-09-23 con el paquete,
 * `scripts/arreglar-thinking-orbs.js`). Por eso los ayudantes van primero, cada uno antes de quien lo usa,
 * y el componente al final.
 */

type EscenaGlobal = {
  __renaserOrbeDinamica?: {
    amp: number;
    from: number;
    to: number;
    mix: number;
    yaw: number;
    pitch: number;
    roll: number;
    orient: null;
    rMul: number;
  };
  __renaserOrbePintura?: SkPaint;
  __renaserOrbeColor?: Float32Array;
  __renaserOrbeOrden?: Int32Array;
  __renaserOrbeBalde?: Int32Array;
  __renaserOrbeConteos?: Int32Array;
  __renaserOrbeMarco?: SkRect;
  __renaserOrbeMarcoTamano?: number;
};

/**
 * La "dinámica" que el motor recibe por cuadro, sin voz ni inclinación (este orbe no las usa: sin
 * audio y sin giroscopio, igual que como se usaba `<ThinkingOrb>`). Reutilizada, como hace el paquete.
 */
function dinamicaQuieta(escalaDePunto: number) {
  'worklet';
  const g = globalThis as EscenaGlobal;
  let d = g.__renaserOrbeDinamica;
  if (d === undefined) {
    d = { amp: 0, from: 0, to: 0, mix: 1, yaw: 0, pitch: 0, roll: 0, orient: null, rMul: escalaDePunto };
    g.__renaserOrbeDinamica = d;
  }
  d.rMul = escalaDePunto > 0.01 ? escalaDePunto : 0.01;
  return d;
}

const BALDES_DE_PROFUNDIDAD = 1024;

/** Orden por conteo (de lejos a cerca, estable), igual que el paquete: sin comparador ni cierres. */
function ordenarPorProfundidad(buf: DotBuffer): Int32Array {
  'worklet';
  const g = globalThis as EscenaGlobal;
  const n = buf.count;
  const zs = buf.zs;
  let orden = g.__renaserOrbeOrden;
  let balde = g.__renaserOrbeBalde;
  if (orden === undefined || balde === undefined || orden.length < n) {
    orden = new Int32Array(n);
    balde = new Int32Array(n);
    g.__renaserOrbeOrden = orden;
    g.__renaserOrbeBalde = balde;
  }
  let conteos = g.__renaserOrbeConteos;
  if (conteos === undefined) {
    conteos = new Int32Array(BALDES_DE_PROFUNDIDAD);
    g.__renaserOrbeConteos = conteos;
  } else {
    conteos.fill(0);
  }
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const z = zs[i]!;
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  }
  const rango = zMax - zMin;
  const escala = rango > 0 ? (BALDES_DE_PROFUNDIDAD - 1) / rango : 0;
  for (let i = 0; i < n; i++) {
    balde[i] = (zs[i]! - zMin) * escala;
    conteos[balde[i]!]!++;
  }
  let acumulado = 0;
  for (let b = 0; b < BALDES_DE_PROFUNDIDAD; b++) {
    const c = conteos[b]!;
    conteos[b] = acumulado;
    acumulado += c;
  }
  for (let i = 0; i < n; i++) orden[conteos[balde[i]!]!++] = i;
  return orden;
}

/**
 * Ordena los puntos de lejos a cerca y los graba como una foto de Skia. Es `recordPicture` del
 * paquete (MIT) con el degradé de dos colores fijo y UNA diferencia: la transparencia viaja en el
 * cuarto canal del color, así que cada punto cuesta dos llamadas nativas (`setColor`, `drawCircle`)
 * en vez de tres. El resultado en pantalla es el mismo: `setAlphaf` reemplazaba ese mismo canal.
 */
function grabarNube(
  buf: DotBuffer,
  tamano: number,
  lut: ColorLUT,
  lutHasta: ColorLUT,
  rMin: number,
  corrimiento: number,
): SkPicture {
  'worklet';
  const g = globalThis as EscenaGlobal;
  let pintura = g.__renaserOrbePintura;
  if (pintura === undefined) {
    pintura = Skia.Paint();
    pintura.setAntiAlias(true);
    g.__renaserOrbePintura = pintura;
  }
  let color = g.__renaserOrbeColor;
  if (color === undefined) {
    color = new Float32Array(4);
    g.__renaserOrbeColor = color;
  }
  const orden = ordenarPorProfundidad(buf);
  let marco = g.__renaserOrbeMarco;
  if (marco === undefined || g.__renaserOrbeMarcoTamano !== tamano) {
    marco = Skia.XYWHRect(0, 0, tamano, tamano);
    g.__renaserOrbeMarco = marco;
    g.__renaserOrbeMarcoTamano = tamano;
  }

  const grabadora = Skia.PictureRecorder();
  const lienzo = grabadora.beginRecording(marco);
  for (let i = 0; i < buf.count; i++) {
    const d = orden[i]!;
    const alfa = buf.as[d]!;
    if (alfa < 0.02) continue;
    let w = buf.ws[d]!;
    if (w < 0) w = 0;
    else if (w > 1) w = 1;
    const idx = Math.round(w * 255);
    let m = corrimiento + DISPERSION_DE_COLOR * (w - 0.5);
    if (m < 0) m = 0;
    else if (m > 1) m = 1;
    const ca = lut[idx]!;
    const cb = lutHasta[idx]!;
    color[0] = ca[0]! + (cb[0]! - ca[0]!) * m;
    color[1] = ca[1]! + (cb[1]! - ca[1]!) * m;
    color[2] = ca[2]! + (cb[2]! - ca[2]!) * m;
    color[3] = alfa;
    pintura.setColor(color);
    const r = buf.rs[d]!;
    lienzo.drawCircle(buf.xs[d]!, buf.ys[d]!, r < rMin ? rMin : r, pintura);
  }
  return grabadora.finishRecordingAsPicture();
}

function OrbeDePuntosSinMemo(props: Props) {
  const { estado, tamano, oscuro, color, colorHasta, velocidad, escalaDePunto, fpsMaximo, activo, movimientoReducido } =
    props;
  const preset = useMemo(() => resolvePreset(estado, pickDesignSize(tamano)), [estado, tamano]);
  const construir = MODES[preset.mode].build;
  const opciones = preset.opts;
  const datosFijos = useMemo(() => MODES[preset.mode].precompute(opciones), [preset.mode, opciones]);
  const rMin = (opciones.rMin ?? 0.3) * escalaDePunto;
  const lut = useMemo(() => buildColorLUT(oscuro, color), [oscuro, color]);
  const lutHasta = useMemo(() => buildColorLUT(oscuro, colorHasta), [oscuro, colorHasta]);

  const fase = useSharedValue(0);
  const velocidadSV = useSharedValue(preset.speed * velocidad);
  const fpsSV = useSharedValue(fpsMaximo);
  const periodo = useSharedValue(0); // se mide en el primer cuadro
  const cuadrosSinDibujar = useSharedValue(0);
  const msSinDibujar = useSharedValue(0);

  useEffect(() => {
    velocidadSV.set(preset.speed * velocidad);
  }, [preset.speed, velocidad, velocidadSV]);
  useEffect(() => {
    fpsSV.set(fpsMaximo);
  }, [fpsMaximo, fpsSV]);

  const reloj = useFrameCallback(info => {
    'worklet';
    const medido = info.timeSincePreviousFrame ?? 0;
    periodo.set(periodoSuavizado(periodo.get(), medido));
    msSinDibujar.set(msSinDibujar.get() + (medido > DT_MAXIMO_MS ? DT_MAXIMO_MS : medido));
    const cuadros = cuadrosSinDibujar.get() + 1;
    if (cuadros < cuadrosPorDibujo(periodo.get(), fpsSV.get())) {
      cuadrosSinDibujar.set(cuadros);
      return;
    }
    // Todo el tiempo acumulado entra de una vez: la velocidad del orbe no depende del tope.
    fase.set(fase.get() + (msSinDibujar.get() / 1000) * velocidadSV.get());
    cuadrosSinDibujar.set(0);
    msSinDibujar.set(0);
  }, false);

  useEffect(() => {
    reloj.setActive(activo);
  }, [activo, reloj]);

  const foto = useDerivedValue(() => {
    const t = fase.get();
    const buf = acquireDotBuffer(datosFijos.dotCount);
    construir(buf, tamano, t, opciones, datosFijos, dinamicaQuieta(escalaDePunto));
    const corrimiento = movimientoReducido
      ? 0.5
      : 0.5 + 0.5 * Math.sin((t * 2 * Math.PI * 1000) / CICLO_DE_COLOR_MS);
    return grabarNube(buf, tamano, lut, lutHasta, rMin, corrimiento);
  }, [construir, opciones, datosFijos, tamano, escalaDePunto, lut, lutHasta, rMin, movimientoReducido]);

  return (
    <Canvas style={{ width: tamano, height: tamano }}>
      <Picture picture={foto} />
    </Canvas>
  );
}

/**
 * Memo con props primitivas: Hoy se vuelve a pintar con cada trozo de respuesta del acompañante, y
 * el lienzo de Skia no tiene por qué reconciliarse cada vez si nada del orbe cambió.
 */
export const OrbeDePuntos = React.memo(OrbeDePuntosSinMemo);
