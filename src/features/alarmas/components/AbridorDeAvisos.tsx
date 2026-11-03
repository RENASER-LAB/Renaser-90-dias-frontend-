import { useEffect, useRef } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { alAbrirAviso, anotarDestinoDeAviso, consumirRutaPendiente } from '../../mentor/notificaciones/rutaDeAviso';
import { useFormacionDeLaSesion } from '../../formaciones/context/FormacionContext';
import {
  elegirFormacionDeLaComunidad,
  estadoDeLaFormacionDeLaComunidad,
} from '../../formaciones/estado/formacionDeLaComunidad';
import { decidirFormacionDelAviso } from '../../formaciones/utils/avisoDeFormacion';
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
 * onboarding). Ver `navigation/abrirAviso.ts`.
 * No pinta nada.
 *
 * > **Antes (hasta 2026-09-28)** esto era la mitad de `AbridorDeEventos` y solo abría eventos, sin
 * > mirar las capas obligatorias.
 */
export function AbridorDeAvisos(): null {
  const { isAuthenticated } = useAuth();
  /* Spec 024 (FR-032): el aviso de un chat de OTRA formación cambia primero la formación del personal con varias (o la elección de
     la Comunidad de quien ve todas) y después se abre. Se leen por referencia: la escucha de abajo vive mientras haya sesión. */
  const { formacion, elegir } = useFormacionDeLaSesion();
  const formacionAhora = useRef(formacion);
  formacionAhora.current = formacion;
  const elegirAhora = useRef(elegir);
  elegirAhora.current = elegir;

  useEffect(() => {
    if (!isAuthenticated) return;
    return mantenerAperturaDeAvisos(
      {
        hayCapaObligatoriaAbierta,
        pestanaDisponible,
        consumir: tipo => consumirRutaPendiente(tipo),
        irAPestana,
        decidirFormacionDelChat: destino => {
          const decision = decidirFormacionDelAviso(
            destino.formacion,
            formacionAhora.current,
            estadoDeLaFormacionDeLaComunidad().eleccion,
          );
          if (decision.accion === 'cambiar-activa') return { accion: 'cambiar', codigo: decision.codigo, aviso: decision.aviso, sobre: 'activa' };
          if (decision.accion === 'cambiar-eleccion') return { accion: 'cambiar', codigo: decision.codigo, aviso: decision.aviso, sobre: 'eleccion' };
          return decision;
        },
        cambiarDeFormacion: async decision => {
          if (decision.sobre === 'eleccion') {
            elegirFormacionDeLaComunidad(decision.codigo);
            return true;
          }
          try {
            await elegirAhora.current(decision.codigo);
            return true;
          } catch {
            return false; // El servidor no la dejó cambiar: el aviso se descarta, nunca se abre un chat de otra formación.
          }
        },
        volverAAnotar: anotarDestinoDeAviso,
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
