import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { descripcionDeFase } from '../../home/hooks/useResumenHome';
import { hayQueCelebrar } from '../utils/estadoDeLasFases';

const CLAVE = 'yo.faseVista.';

/**
 * `true` la primera vez que alguien abre Yo ya dentro de una fase nueva. Guarda la última fase vista
 * por cuenta y la actualiza en cuanto decide, de modo que el momento ocurre una sola vez. Sin
 * almacenamiento disponible no celebra: la celebración es un extra, nunca algo que pueda fallar.
 */
export function useCambioDeFase(userId: string | null | undefined, faseActual: string | null | undefined): boolean {
  const [celebrar, setCelebrar] = useState(false);
  const numero = descripcionDeFase(faseActual)?.numero ?? null;

  useEffect(() => {
    if (!userId || numero === null) return;
    let vivo = true;
    (async () => {
      try {
        const guardada = await AsyncStorage.getItem(CLAVE + userId);
        const vista = guardada === null || !Number.isFinite(Number(guardada)) ? null : Number(guardada);
        if (vivo && hayQueCelebrar(vista, numero)) setCelebrar(true);
        if (vista === null || numero > vista) await AsyncStorage.setItem(CLAVE + userId, String(numero));
      } catch {
        /* sin almacenamiento no hay momento: no pasa nada más */
      }
    })();
    return () => { vivo = false; };
  }, [userId, numero]);

  return celebrar;
}
