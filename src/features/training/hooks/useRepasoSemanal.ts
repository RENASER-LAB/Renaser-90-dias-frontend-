import { useEffect, useState } from 'react';

import { Alert } from '../../../components/Alerta';
import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';

/**
 * El aviso de los domingos para armar la semana (pedido del dueño 2026-09-07).
 *
 * Es del PROGRAMA, no de un hábito ni de una dimensión: uno solo por persona. Desde la spec 014 vive en «Tus prácticas»
 * (el engranaje de Training); antes era un bloque de la pantalla principal. El comportamiento es el mismo.
 *
 * `valor` es `null` mientras no se sabe: en web y en Expo Go no hay alarmas locales y el control no aparece, en vez de
 * ofrecer un aviso que nunca sonaría.
 */
export function useRepasoSemanal(userId: string | undefined) {
  const [valor, setValor] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId || !recordatorios.HAY_RECORDATORIOS_LOCALES) return;
    void recordatorios.tieneRepasoSemanal(userId).then(setValor);
  }, [userId]);

  const alternar = async (querido: boolean) => {
    if (!userId) return;
    setValor(querido);
    if (!querido) {
      await recordatorios.cancelarRepasoSemanal(userId);
      return;
    }
    const ok = await recordatorios.programarRepasoSemanal(userId);
    if (!ok) {
      // Sin permiso no se promete nada: el interruptor vuelve solo y se dice por qué.
      setValor(false);
      Alert.alert(
        'Falta el permiso de notificaciones',
        'Habilita las notificaciones de la app para que podamos avisarte los domingos.',
      );
    }
  };

  return { valor, alternar };
}
