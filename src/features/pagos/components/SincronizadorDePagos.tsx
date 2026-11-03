import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import { tocaRearmar } from '../../alarmas/rearmarAlarmas';
import { HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import { leerMiIngresoDelServidor } from '../api/pagosApi';
import { ponerAlDiaLosRecordatoriosDePago } from '../notificaciones/alarmasDePagos';

let ultima: number | null = null;
/** De quién fue la última corrida: otra cuenta (o la misma tras cerrar sesión, E-413) corre ya. */
let ultimoUsuario: string | null = null;

/**
 * Al abrir la app y al volver a primer plano (como mucho cada 10 min, el mismo intervalo del rearmado), pone al día las alarmas de pago de este teléfono
 * con lo que el servidor dice hoy del cronograma de la persona (spec 032): una cuota que Administración marcó pagada deja de recordarse aunque la persona
 * no vuelva a abrir Yo, y una cuota nueva se empieza a recordar. Es la lectura barata de siempre (`GET /me/ingreso`, sin nada anotado devuelve casi vacío).
 *
 * - **Un fallo no toca las alarmas**: sin red o con un 5xx no se sabe cómo está el pago, así que no se quita nada (solo un 404 o un 403 —el servidor no
 *   ofrece pagos a esta cuenta— las suelta).
 * - Solo donde hay alarmas locales (no en web ni Expo Go). Sin permiso de avisos no pide nada: eso es de un toque de la persona.
 * - Vive en `App.tsx`, junto a `RearmadorDeAlarmas` y `SincronizadorDeAcciones`: ninguna pestaña cambia. No pinta nada.
 */
export function SincronizadorDePagos(): null {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId || !HAY_RECORDATORIOS_LOCALES) {
      ultimoUsuario = null;
      return;
    }
    const correr = async () => {
      const ahora = Date.now();
      if (userId === ultimoUsuario && !tocaRearmar(ultima, ahora)) return;
      ultima = ahora;
      ultimoUsuario = userId;
      try {
        const ingreso = await leerMiIngresoDelServidor();
        if (ingreso) await ponerAlDiaLosRecordatoriosDePago(userId, ingreso.pagos);
      } catch (error) {
        const status = (error as { status?: number } | null)?.status;
        if (status === 404 || status === 403) await ponerAlDiaLosRecordatoriosDePago(userId, null);
      }
    };
    void correr().catch(() => undefined);
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'active') void correr().catch(() => undefined);
    });
    return () => suscripcion.remove();
  }, [isAuthenticated, userId]);

  return null;
}
