import { FORMACION_POR_DEFECTO, type FormacionDeLaSesion } from '../types/formaciones.types';
import { nombreDeLaFormacion } from './opcionesDeLaComunidad';

/**
 * Qué hacer con la formación de un aviso de chat antes de abrirlo (spec 024, FR-032). La ruta del aviso de un mensaje es
 * `/chat/{id}` en la Escuela y `/chat/{id}?formacion=CÓDIGO` en las demás: el servidor solo pone el parámetro cuando NO es la Escuela.
 *
 * - **Personal con varias formaciones** (`puedeElegir`): el chat pertenece a UNA. Si es la que tiene activa, se abre. Si es otra de las
 *   suyas, se **cambia su formación activa** a esa antes de abrirlo y se avisa en una línea («Cambiamos a Diplomado Renaser.»). Si no
 *   la tiene asignada, el aviso se **descarta** (no se abre nada: no le corresponde).
 * - **Administración, Alquimista y Soporte TI** (`veTodas`): no tienen formación activa, pero la Comunidad les muestra la que eligieron
 *   arriba. Si eligieron una distinta a la del chat, se pasa la ELECCIÓN a la del chat (solo local, no toca al servidor) y se avisa igual;
 *   con «Todas» elegida el chat se ve en la lista tal cual.
 * - **Todos los demás** (aprendiz, mentor o guía con una sola formación): el parámetro se ignora, como si no viniera.
 *
 * Sin `formacion` en la sesión (un backend anterior) tampoco se hace nada. Puro: quien lo usa hace el cambio.
 */
export type DecisionDeFormacionDelAviso =
  | { accion: 'seguir' }
  | { accion: 'descartar' }
  | { accion: 'cambiar-activa'; codigo: string; aviso: string }
  | { accion: 'cambiar-eleccion'; codigo: string; aviso: string };

/** «Cambiamos a Diplomado Renaser.» */
export function avisoDeCambioDeFormacion(nombre: string): string {
  return `Cambiamos a ${nombre}.`;
}

export function decidirFormacionDelAviso(
  formacionDelAviso: string | null | undefined,
  formacion: FormacionDeLaSesion | null | undefined,
  eleccionDeLaComunidad: string | null,
): DecisionDeFormacionDelAviso {
  if (!formacion) return { accion: 'seguir' };
  const delChat = formacionDelAviso?.trim().toUpperCase() || FORMACION_POR_DEFECTO;

  if (formacion.veTodas) {
    if (eleccionDeLaComunidad === null || eleccionDeLaComunidad === delChat) return { accion: 'seguir' };
    return {
      accion: 'cambiar-eleccion',
      codigo: delChat,
      aviso: avisoDeCambioDeFormacion(nombreDeLaFormacion(delChat, formacion.disponibles)),
    };
  }

  if (!formacion.puedeElegir) return { accion: 'seguir' };
  if (formacion.activa?.codigo === delChat) return { accion: 'seguir' };
  if (!formacion.disponibles.some(o => o.codigo === delChat)) return { accion: 'descartar' };
  return {
    accion: 'cambiar-activa',
    codigo: delChat,
    aviso: avisoDeCambioDeFormacion(nombreDeLaFormacion(delChat, formacion.disponibles)),
  };
}
