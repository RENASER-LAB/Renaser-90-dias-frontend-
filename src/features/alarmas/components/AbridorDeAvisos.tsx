import { useEffect } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { alAbrirAviso, consumirRutaPendiente } from '../../mentor/notificaciones/rutaDeAviso';
import { irAPestana, navegacionRef, pestanaDisponible } from '../../../navigation/navegacionRef';
import { mantenerAperturaDeAvisos } from '../../../navigation/abrirAviso';
import {
  alCambiarLasCapasObligatorias,
  hayCapaObligatoriaAbierta,
} from '../../../navigation/capasObligatorias';

/**
 * Tocar un aviso abre lo suyo: un evento, Comunidad → Eventos (E-5); el recordatorio de un hábito,
 * Training en su dimensión; el de una acción, Plan → Objetivos (D-218, 2026-09-28). Con la app
 * cerrada, en segundo plano o abierta: la ruta la anota `rutaDeAviso.ts` en los tres casos.
 *
 * Vive por encima del navegador (`App.tsx`) y no dentro de una pestaña: Training o Plan no están
 * montadas hasta que alguien las abre, así que su propia escucha no se enteraría de un toque con la
 * app cerrada.
 *
 * El hábito y la acción esperan, sin tocar nada, mientras el Código Renaser, el arranque guiado o el Pacto
 * estén a la vista; el evento no (dueño, 28/09). Todos esperan a que existan las pestañas (login,
 * onboarding, Mapa del Día 7). Ver `navigation/abrirAviso.ts`.
 * No pinta nada.
 *
 * > **Antes (hasta 2026-09-28)** esto era la mitad de `AbridorDeEventos` y solo abría eventos, sin
 * > mirar las capas obligatorias.
 */
export function AbridorDeAvisos(): null {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    return mantenerAperturaDeAvisos(
      {
        hayCapaObligatoriaAbierta,
        pestanaDisponible,
        consumir: tipo => consumirRutaPendiente(tipo),
        irAPestana,
      },
      {
        alAbrirAviso: oyente => alAbrirAviso(() => oyente()),
        alCambiarLasCapas: alCambiarLasCapasObligatorias,
        alCambiarLaNavegacion: oyente => navegacionRef.addListener('state', () => oyente()),
      },
    );
  }, [isAuthenticated]);

  return null;
}
