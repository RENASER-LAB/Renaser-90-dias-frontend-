import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import { HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import { tocaRearmar } from '../../alarmas/rearmarAlarmas';
import * as objetivosApi from '../api/objetivosApi';
import {
  leerAccionesAgendadas,
  preferenciasDeAcciones,
  sincronizarAlarmasDeAcciones,
} from '../notificaciones/recordatoriosDeAcciones';

let ultima: number | null = null;

/**
 * Al abrir la app y al volver a primer plano (como mucho cada 10 min, el mismo intervalo del
 * rearmado), pone al día las alarmas de las acciones con hora: quita las de acciones cumplidas o
 * movidas y pone las de toda la semana agendada (`GET /rocks/upcoming`, D-217). Sin esto, alguien que
 * nunca vuelve a Plan solo tendría las alarmas de lo que vio la última vez que entró.
 *
 * > **Corregido 2026-09-28 (D-217).** Decía «pone las de hoy y mañana»: una acción del viernes agendada
 * > el martes no tenía alarma hasta que la app se abriera el jueves. Con un backend anterior sigue así.
 *
 * Solo si la persona pidió aviso antes de sus acciones: quien no lo usa no paga las dos lecturas.
 * Vive en `App.tsx`, junto a `RearmadorDeAlarmas`: ninguna pestaña cambia. No pinta nada.
 */
export function SincronizadorDeAcciones(): null {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId || !HAY_RECORDATORIOS_LOCALES) return;
    const correr = async () => {
      const ahora = Date.now();
      if (!tocaRearmar(ultima, ahora)) return;
      ultima = ahora;
      if ((await preferenciasDeAcciones(userId)).antelaciones.length === 0) return;
      const leidas = await leerAccionesAgendadas({
        agendadas: objetivosApi.obtenerRocasAgendadas,
        hoy: objetivosApi.obtenerRocasDeHoy,
        manana: objetivosApi.obtenerRocasDeManana,
      });
      if (!leidas) return;
      await sincronizarAlarmasDeAcciones(userId, leidas.rocas, { fechasDeLaLista: leidas.fechas });
    };
    void correr().catch(() => {});
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'active') void correr().catch(() => {});
    });
    return () => suscripcion.remove();
  }, [isAuthenticated, userId]);

  return null;
}
