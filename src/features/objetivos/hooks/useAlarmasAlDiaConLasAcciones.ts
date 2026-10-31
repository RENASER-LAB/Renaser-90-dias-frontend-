import { useEffect, useMemo } from 'react';

import { HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import { sincronizarAlarmasDeAcciones } from '../notificaciones/recordatoriosDeAcciones';
import type { RocaDiariaApi } from '../types/objetivos.types';

/**
 * Cada vez que la lista de acciones cambia, pone al día las alarmas de aviso de cada una (`sincronizarAlarmasDeAcciones`). Es lo que
 * hacía `RecordatorioDeAcciones` por dentro cuando Plan le pasaba las acciones; salió a un hook para que Plan lo siga haciendo aunque
 * el control viva en una hoja y no esté dibujado (2026-10-31, «Recordatorios de tus acciones ›»). Sin `rocas` —no se leyeron, o la
 * lectura falló—, no toca nada: una lista vacía por una falla quitaría alarmas que siguen valiendo.
 *
 * Solo le importa a las alarmas lo que está en la huella: si no cambia, no corre.
 */
export function useAlarmasAlDiaConLasAcciones(userId: string, rocas: RocaDiariaApi[] | undefined): void {
  const huella = useMemo(
    () => (rocas ?? []).map(r => `${r.id}|${r.fecha}|${r.horaInicio ?? ''}|${r.completada}`).join(','),
    [rocas],
  );
  useEffect(() => {
    if (!HAY_RECORDATORIOS_LOCALES || !rocas) return;
    void sincronizarAlarmasDeAcciones(userId, rocas).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, huella]);
}
