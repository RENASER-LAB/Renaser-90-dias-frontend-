import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useMinutoActual } from '../../../hooks/useMinutoActual';
import { ApiError } from '../../../services/http/apiClient';
import { obtenerTracksDeHoy } from '../api/habitsApi';
import type { TrackDelDiaApi } from '../types/habits.types';
import { habitoDelMomento, type HabitoDelMomento } from '../utils/habitoDelMomento';
import { vistaDeLaClaseDiaria, type VistaDeLaClaseDiaria } from '../utils/vistaDeLaClaseDiaria';

/**
 * El hábito que le toca AHORA, para la primera tarjeta de Hoy.
 *
 * Lee `GET /api/v1/habit-tracks/today` —la misma fuente que Training, no una segunda verdad— y
 * deja que `habitoDelMomento` decida cuál mostrar. La decisión se recalcula cada minuto sin
 * volver a pedir nada al servidor: lo que cambia al pasar la hora es el RELOJ, no los tracks.
 *
 * Un fallo no rompe la tarjeta ni muestra un error: se devuelve `sin-datos` y la pantalla vuelve
 * al texto genérico. Esta tarjeta es informativa; que no cargue no puede tapar el resto de Hoy.
 *
 * `registrosLeidos` y `registrosDeHoy` (spec 023): cuántos registros trajo la lectura, y si de verdad se leyó. Hoy los usa para no dibujar
 * «Hábitos de hoy» en una formación que todavía no tiene hábitos; un fallo NO cuenta como «cero registros».
 *
 * `inscrito` (issue #148): lo que dice `/home`. Con `false` (el personal sin programa propio) no se pide nada: el servidor
 * respondería 404 «Participante no encontrado» en cada apertura. Mientras no se sabe (`undefined`) se pide como siempre, y un
 * 404 se toma en silencio como «sin programa» (sin aviso en el registro).
 */
export function useHabitoDelMomento(inscrito?: boolean): {
  habito: HabitoDelMomento;
  recargar: () => Promise<void>;
  registrosLeidos: boolean;
  registrosDeHoy: number;
  claseDiaria: VistaDeLaClaseDiaria | null;
} {
  const [tracks, setTracks] = useState<TrackDelDiaApi[]>([]);
  const [leidos, setLeidos] = useState(false);
  const ahora = useMinutoActual();
  const sinPrograma = inscrito === false;
  const sinProgramaRef = useRef(sinPrograma);
  sinProgramaRef.current = sinPrograma;

  const recargar = useCallback(async () => {
    if (sinProgramaRef.current) {
      setTracks([]);
      setLeidos(false);
      return;
    }
    try {
      setTracks(await obtenerTracksDeHoy());
      setLeidos(true);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) {
        console.warn('[Hoy] no se pudieron leer los hábitos de hoy:', e);
      }
      setTracks([]);
      setLeidos(false);
    }
  }, []);

  /* Si `/home` llega después y dice que no hay programa, se suelta lo leído (nada, en la práctica). */
  useEffect(() => {
    if (sinPrograma) {
      setTracks([]);
      setLeidos(false);
    }
  }, [sinPrograma]);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  const habito = useMemo(() => habitoDelMomento(tracks, ahora), [tracks, ahora]);
  /* La tarjeta «Clase diaria» de Hoy (2026-11-03) sale de ESTA MISMA lectura, sin un pedido más. Mientras no se leyó (o si falló) `tracks` está
     vacío y no hay tarjeta: sin parpadeo. */
  const claseDiaria = useMemo(() => vistaDeLaClaseDiaria(tracks), [tracks]);
  return { habito, recargar, registrosLeidos: leidos, registrosDeHoy: tracks.length, claseDiaria };
}
