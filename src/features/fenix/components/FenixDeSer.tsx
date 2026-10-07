import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { alCumplirUnHabito } from '../../habits/eventos/habitoCumplido';
import { useAnimoDeSer } from '../hooks/useAnimoDeSer';
import type { PhoenixMascotHandle } from '../rive/PhoenixMascot';
import type { PhoenixDirector } from '../rive/phoenixMaster';
import { asentir } from '../utils/asentir';
import { alNivelDelMicrofono } from '../../renasia/events/nivelDelMicrofono';
import { ActuacionDeVoz } from '../utils/actuacionDeVoz';
import type { EstadoDeSer } from '../utils/conversacionDeSer';
import { FenixVivo } from './FenixVivo';

/** Lo que el centro de Hoy le pide al fénix fuera de su estado: la reacción al toque. */
export type FenixDeSerHandle = { tocado: () => void };

/** Una vez por sesión de la app: el saludo es un momento, no algo que se repite al volver a Hoy. */
let yaSaludo = false;

/**
 * El ÚNICO fénix vivo de la app (2026-10-06, pedido del dueño): el del centro de Hoy, que reemplaza al orbe del
 * acompañante. Todo lo animado del fénix ocurre acá; el botón flotante y el panel de SER son foto fija
 * (`FenixDeSerQuieto`). Lo que hace, con la entrega v3.3 completa:
 *
 * - **Ánimo** del semáforo propio (neutral para el staff) y **vida autónoma** (`alive`, `life` 1).
 * - **Voz**: sostiene la fase (`estado`) mientras dura — escuchando (se inclina, te mira, ladea la cabeza), pensando
 *   (mira arriba y a los lados, `trgThinking` repetido), hablando (boca con visemas, `trgExplain`, alas) — y vuelve
 *   suave a su ánimo (`ActuacionDeVoz`).
 * - **Saludo** (`trgWelcome` vía `react('welcome')`) la primera vez que aparece en la sesión.
 * - **Toque**: `trgTap` al apoyar el dedo (`tocado`), además de lo que haga el botón que lo contiene.
 * - **Asiente** 700 ms al cumplir un hábito (`asentir`).
 *
 * Los hitos del día (todos los hábitos, rachas, fase nueva) ya no los celebra él: son la pantalla completa
 * (`PantallaDeCelebracion`, 2026-10-07), y mientras está, este fénix pasa a su foto fija (`OrbeAcompanante`).
 *
 * Con «reducir movimiento»: sin saludo, toque ni asentir; de la voz, una pose quieta por fase.
 */
export const FenixDeSer = forwardRef<
  FenixDeSerHandle,
  { size: number; estado: EstadoDeSer; etiqueta: string; style?: StyleProp<ViewStyle> }
>(function FenixDeSer({ size, estado, etiqueta, style }, ref) {
  const fenix = useRef<PhoenixMascotHandle>(null);
  const animo = useAnimoDeSer();
  const reducido = useReducedMotion();

  useEstadoReflejado(fenix, estado, reducido);
  useMomentosDelFenix(fenix, reducido);
  useImperativeHandle(
    ref,
    () => ({
      tocado: () => {
        if (!reducido) directorDe(fenix)?.trigger('tap');
      },
    }),
    [reducido],
  );

  return (
    <FenixVivo ref={fenix} size={size} animo={animo} life={1} etiqueta={etiqueta} style={style} testID="fenix-de-ser" />
  );
});

function directorDe(fenix: React.RefObject<PhoenixMascotHandle | null>): PhoenixDirector | null {
  return fenix.current?.director() ?? null;
}

/**
 * Sostiene la fase de la voz mientras dura (`ActuacionDeVoz`): postura, vaivén, disparos que se repiten, boca con
 * visemas y, escuchando, el volumen del micrófono. No se aplica al montarse en reposo: no hay nada que deshacer.
 *
 * > **Corregido 2026-10-07.** Aplicaba la fase una sola vez (cara, `isTalking`, un `trgThinking`) y el fénix se veía
 * > igual que en reposo: ver `conversacionDeSer.ts`.
 */
function useEstadoReflejado(fenix: React.RefObject<PhoenixMascotHandle | null>, estado: EstadoDeSer, reducido: boolean) {
  const actuacion = useRef<ActuacionDeVoz | null>(null);
  const anterior = useRef<EstadoDeSer>('reposo');
  useEffect(() => {
    if (estado === anterior.current) return;
    anterior.current = estado;
    const director = directorDe(fenix);
    if (!director) return;
    actuacion.current ??= new ActuacionDeVoz(director);
    actuacion.current.entrar(estado, reducido);
  }, [fenix, estado, reducido]);
  useEffect(() => alNivelDelMicrofono(nivel => actuacion.current?.nivel(nivel)), []);
  useEffect(() => () => actuacion.current?.detener(), []);
}

/** Saludo y asentir: los momentos que no dependen de la voz. Nada con «reducir movimiento». */
function useMomentosDelFenix(fenix: React.RefObject<PhoenixMascotHandle | null>, reducido: boolean) {
  useEffect(() => {
    if (reducido) return;
    if (!yaSaludo && directorDe(fenix)) {
      yaSaludo = true;
      void fenix.current?.react('welcome');
    }
    const sinHabito = alCumplirUnHabito(() => {
      const director = directorDe(fenix);
      if (director) asentir(director);
    });
    return sinHabito;
  }, [fenix, reducido]);
}

/** Solo para pruebas: vuelve a permitir el saludo. */
export function olvidarSaludoParaPruebas(): void {
  yaSaludo = false;
}
