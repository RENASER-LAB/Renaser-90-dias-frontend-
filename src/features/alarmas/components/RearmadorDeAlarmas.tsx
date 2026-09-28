import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import { ponerAlDiaLasAlarmas } from '../ponerAlDiaLasAlarmas';

/**
 * Pone al día las alarmas locales al abrir la app y cada vez que vuelve a primer plano (con el intervalo
 * mínimo de `rearmarAlarmas.ts`): las re-arma, completa los cambios de hora con fecha, arma las que el
 * servidor sabe y el teléfono no, y le confirma al servidor que están vivas. Ver `ponerAlDiaLasAlarmas.ts`.
 *
 * > **Cambiado 2026-09-28 (D-217).** Solo re-armaba las ya programadas, sin sesión. Ahora necesita la
 * > sesión para lo demás; sin ella, sigue re-armando igual.
 *
 * Vive en `App.tsx`, por encima del navegador, como `AbridorDeAvisos`: ninguna pestaña cambia.
 * No pinta nada.
 */
export function RearmadorDeAlarmas(): null {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    void ponerAlDiaLasAlarmas(userId).catch(() => {});
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'active') void ponerAlDiaLasAlarmas(userId).catch(() => {});
    });
    return () => suscripcion.remove();
  }, [userId]);
  return null;
}
