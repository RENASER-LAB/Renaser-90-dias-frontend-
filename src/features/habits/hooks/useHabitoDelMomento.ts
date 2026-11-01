import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useMinutoActual } from '../../../hooks/useMinutoActual';
import { obtenerTracksDeHoy } from '../api/habitsApi';
import type { TrackDelDiaApi } from '../types/habits.types';
import { habitoDelMomento, type HabitoDelMomento } from '../utils/habitoDelMomento';

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
 */
export function useHabitoDelMomento(): {
  habito: HabitoDelMomento;
  recargar: () => Promise<void>;
  registrosLeidos: boolean;
  registrosDeHoy: number;
} {
  const [tracks, setTracks] = useState<TrackDelDiaApi[]>([]);
  const [leidos, setLeidos] = useState(false);
  const ahora = useMinutoActual();

  const recargar = useCallback(async () => {
    try {
      setTracks(await obtenerTracksDeHoy());
      setLeidos(true);
    } catch (e) {
      console.warn('[Hoy] no se pudieron leer los hábitos de hoy:', e);
      setTracks([]);
      setLeidos(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  const habito = useMemo(() => habitoDelMomento(tracks, ahora), [tracks, ahora]);
  return { habito, recargar, registrosLeidos: leidos, registrosDeHoy: tracks.length };
}
