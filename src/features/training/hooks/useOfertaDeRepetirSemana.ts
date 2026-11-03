import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import * as habitsApi from '../../habits/api/habitsApi';
import type { OfertaDeRepetirApi, ResultadoDeRepetirApi } from '../../habits/types/habits.types';
import { aFechaIso } from '../../habits/utils/semanaDelPlan';
import {
  descarteDe,
  leerDescarte,
  leerSemanaRepetida,
  ofertaQueSeMuestra,
  repetidaVigente,
  type DescarteDeLaOferta,
  type SemanaRepetida,
} from '../utils/ofertaDeRepetir';

/**
 * La oferta de repetir la semana en curso en la siguiente (spec 028, `GET /habit-preferences/week-repeat`) y lo que se hace con ella:
 * repetir, «Ahora no» y deshacer. Vive en «Tus prácticas».
 *
 * - **Sin parpadeo.** Mientras no se sabe (`lectura === 'cargando'`) no se dibuja nada; si la lectura falla, o el servidor no tiene
 *   oferta (204) o es uno anterior, tampoco: nada que mostrar y nada que se rompa (FR-021).
 * - **Un solo pedido en vuelo.** Dos lecturas seguidas comparten el pedido; dos toques en «Repetir» mandan UNA repetición (el servidor
 *   además es idempotente).
 * - **«Ahora no»** se guarda por cuenta en el teléfono (`renaser.habitos.repetirSemana.descartada.<cuenta>`) con el par de semanas y la
 *   huella de la modelo: no reaparece mientras sea la misma y vuelve si la modelo cambia (FR-012). Un almacenamiento roto no tumba nada.
 * - **«Volver al plan de siempre» más tarde.** La última semana repetida se recuerda
 *   (`renaser.habitos.repetirSemana.hecha.<cuenta>`) hasta que esa semana termina, para poder deshacerla después de salir (FR-013).
 */

export const clavesDeRepetirSemana = {
  descartada: (userId: string) => `renaser.habitos.repetirSemana.descartada.${userId}`,
  hecha: (userId: string) => `renaser.habitos.repetirSemana.hecha.${userId}`,
};

export type ResultadoDeRepetir =
  | { ok: true; resultado: ResultadoDeRepetirApi }
  /** El servidor pide confirmar antes de reemplazar cambios propios de la semana siguiente (409). */
  | { ok: false; motivo: 'confirmar' }
  | { ok: false; motivo: 'error'; mensaje: string };

export interface UsoDeLaOferta {
  /** `cargando` hasta la primera lectura; no se dibuja nada hasta `lista`. */
  lectura: 'cargando' | 'lista';
  /** La oferta que se muestra (la leída, salvo que la persona ya la descartó); `null` si no hay. */
  oferta: OfertaDeRepetirApi | null;
  /** La semana repetida que todavía se puede devolver al plan de siempre, o `null`. */
  repetida: SemanaRepetida | null;
  enviando: boolean;
  recargar: () => Promise<void>;
  repetir: (replace: boolean) => Promise<ResultadoDeRepetir>;
  descartar: () => Promise<void>;
  /** Devuelve la semana repetida al plan de siempre. `true` si salió bien. */
  deshacer: () => Promise<{ ok: true } | { ok: false; mensaje: string }>;
}

async function leerGuardado(clave: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(clave);
  } catch {
    return null;
  }
}

async function guardar(clave: string, valor: string | null): Promise<void> {
  try {
    if (valor === null) await AsyncStorage.removeItem(clave);
    else await AsyncStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento solo se pierde el recuerdo; la oferta y el deshacer de esta sesión siguen funcionando.
  }
}

/**
 * @param activo `false` = no leer nada (el programa no arrancó, o no se pudo confirmar).
 * @param alCambiarLaSemana se llama tras repetir o deshacer, para poner al día las alarmas de este teléfono.
 */
export function useOfertaDeRepetirSemana(
  userId: string | undefined,
  activo: boolean,
  alCambiarLaSemana?: () => Promise<unknown>,
): UsoDeLaOferta {
  const [lectura, setLectura] = useState<'cargando' | 'lista'>('cargando');
  const [leida, setLeida] = useState<OfertaDeRepetirApi | null>(null);
  const [descarte, setDescarte] = useState<DescarteDeLaOferta | null>(null);
  const [repetida, setRepetida] = useState<SemanaRepetida | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enVuelo = useRef<Promise<void> | null>(null);
  const enviandoRef = useRef(false);
  const montado = useRef(true);
  const alCambiar = useRef(alCambiarLaSemana);
  alCambiar.current = alCambiarLaSemana;

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recargar = useCallback((): Promise<void> => {
    if (!userId || !activo) return Promise.resolve();
    if (enVuelo.current) return enVuelo.current;
    const pedido = (async () => {
      const [crudoDescarte, crudoRepetida] = await Promise.all([
        leerGuardado(clavesDeRepetirSemana.descartada(userId)),
        leerGuardado(clavesDeRepetirSemana.hecha(userId)),
      ]);
      let oferta: OfertaDeRepetirApi | null = null;
      try {
        oferta = await habitsApi.obtenerOfertaDeRepetir();
      } catch {
        // Sin red, sin sesión o un servidor anterior: no hay oferta. Nunca un error en pantalla por esto.
        oferta = null;
      }
      if (!montado.current) return;
      setDescarte(leerDescarte(crudoDescarte));
      setRepetida(repetidaVigente(leerSemanaRepetida(crudoRepetida), aFechaIso(new Date())));
      setLeida(oferta);
      setLectura('lista');
    })().finally(() => {
      enVuelo.current = null;
    });
    enVuelo.current = pedido;
    return pedido;
  }, [userId, activo]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const repetir = useCallback(
    async (replace: boolean): Promise<ResultadoDeRepetir> => {
      const oferta = leida;
      if (!userId || !oferta) return { ok: false, motivo: 'error', mensaje: 'Ya no hay nada que repetir.' };
      // Doble toque: un solo envío.
      if (enviandoRef.current) return { ok: false, motivo: 'error', mensaje: 'Ya lo estamos guardando.' };
      enviandoRef.current = true;
      setEnviando(true);
      try {
        const resultado = await habitsApi.repetirLaSemana(oferta.sourceWeekStart, oferta.targetWeekStart, replace);
        await guardar(clavesDeRepetirSemana.hecha(userId), JSON.stringify({ semana: oferta.targetWeekStart }));
        if (montado.current) {
          setRepetida({ semana: oferta.targetWeekStart });
          setLeida(null);
        }
        await alCambiar.current?.().catch(() => undefined);
        return { ok: true, resultado };
      } catch (e) {
        if (e instanceof ApiError && e.esConflicto) return { ok: false, motivo: 'confirmar' };
        return { ok: false, motivo: 'error', mensaje: mensajeDeError(e, 'No pudimos repetir tu semana. Intenta de nuevo.') };
      } finally {
        enviandoRef.current = false;
        if (montado.current) setEnviando(false);
      }
    },
    [leida, userId],
  );

  const descartar = useCallback(async () => {
    if (!userId || !leida) return;
    const nuevo = descarteDe(leida);
    setDescarte(nuevo);
    await guardar(clavesDeRepetirSemana.descartada(userId), JSON.stringify(nuevo));
  }, [leida, userId]);

  const deshacer = useCallback(async (): Promise<{ ok: true } | { ok: false; mensaje: string }> => {
    if (!userId || !repetida) return { ok: false, mensaje: 'Ya no hay una semana repetida para deshacer.' };
    if (enviandoRef.current) return { ok: false, mensaje: 'Ya lo estamos guardando.' };
    enviandoRef.current = true;
    setEnviando(true);
    try {
      await habitsApi.deshacerLaSemana(repetida.semana);
      await guardar(clavesDeRepetirSemana.hecha(userId), null);
      if (montado.current) setRepetida(null);
      await alCambiar.current?.().catch(() => undefined);
      enviandoRef.current = false;
      await recargar();
      return { ok: true };
    } catch (e) {
      return { ok: false, mensaje: mensajeDeError(e, 'No pudimos volver al plan de siempre. Intenta de nuevo.') };
    } finally {
      enviandoRef.current = false;
      if (montado.current) setEnviando(false);
    }
  }, [recargar, repetida, userId]);

  return {
    lectura,
    oferta: lectura === 'lista' ? ofertaQueSeMuestra(leida, descarte) : null,
    repetida,
    enviando,
    recargar,
    repetir,
    descartar,
    deshacer,
  };
}
