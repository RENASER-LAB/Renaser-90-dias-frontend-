import { useEffect, useState } from 'react';

import { obtenerTracksDeHoy } from '../../habits/api/habitsApi';
import { frasesDeContexto } from '../utils/dictado';

/**
 * Los nombres de los hábitos de hoy de la persona, para sesgar el dictado por voz (ver
 * `useDictado`). Solo en el chat del acompañante, que es el que habla de hábitos.
 *
 * Best-effort: si no se pueden leer, el dictado funciona igual, solo sin sesgo.
 */
export function useFrasesDeHabitos(activo: boolean): string[] {
  const [frases, setFrases] = useState<string[]>([]);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    obtenerTracksDeHoy()
      .then(tracks => {
        if (vigente) setFrases(frasesDeContexto(tracks.map(t => t.tituloHabito)));
      })
      .catch(() => {
        // Sin sesgo: el dictado sigue funcionando.
      });
    return () => {
      vigente = false;
    };
  }, [activo]);

  return frases;
}
