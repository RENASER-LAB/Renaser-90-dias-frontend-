import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import { ponerAlDiaLasAlarmas } from '../ponerAlDiaLasAlarmas';
import { rearmarLoLocalDeLaCuenta } from '../alarmasDeLaCuenta';
import { atenderAlCumplirUnHabito } from '../../habits/notificaciones/repeticiones';

/**
 * Pone al día las alarmas locales al abrir la app y cada vez que vuelve a primer plano (con el intervalo
 * mínimo de `rearmarAlarmas.ts`): las re-arma, completa los cambios de hora con fecha, arma las que el
 * servidor sabe y el teléfono no, y le confirma al servidor que están vivas. Ver `ponerAlDiaLasAlarmas.ts`.
 *
 * > **Cambiado 2026-09-28 (D-217).** Solo re-armaba las ya programadas, sin sesión. Ahora necesita la
 * > sesión para lo demás; sin ella, sigue re-armando igual.
 *
 * Spec 009: también escucha «se cumplió un hábito» para que las repeticiones de su alarma de hoy dejen de sonar
 * («Repetir si no la atiendo»; `habits/notificaciones/repeticiones.ts`). Desde el issue #33 (2026-10-27) eso incluye todo
 * lo demás que le quedaba por sonar ese día: un hábito cumplido no suena más hasta mañana.
 *
 * Vive en `App.tsx`, por encima del navegador, como `AbridorDeAvisos`: ninguna pestaña cambia.
 * No pinta nada.
 */
export function RearmadorDeAlarmas(): null {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    void ponerAlDiaLasAlarmas(userId).catch(() => {});
    // E-413: lo que solo sabe el teléfono (aviso diario, repaso) vuelve si esta cuenta ya lo tenía.
    if (userId) void rearmarLoLocalDeLaCuenta(userId).catch(() => {});
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'active') void ponerAlDiaLasAlarmas(userId).catch(() => {});
    });
    return () => suscripcion.remove();
  }, [userId]);

  // Con sesión: completar un hábito es atenderlo. Sin sesión no hay alarmas de nadie que cancelar.
  useEffect(() => {
    if (!userId) return;
    return atenderAlCumplirUnHabito(userId);
  }, [userId]);
  return null;
}
