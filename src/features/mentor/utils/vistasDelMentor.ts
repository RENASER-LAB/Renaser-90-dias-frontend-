import type { AlumnoConEstado } from '../types/mentor.types';

/**
 * Las vistas del mentor que TAPAN la pantalla de Comunidad: «Mi grupo», la ficha de un aprendiz abierta
 * desde ahí y la ficha abierta desde la info del chat del grupo (D-207). `ComunidadScreen` las dibuja
 * con un `return` temprano, así que mientras una está abierta no se ve nada más: ni la lista de chats
 * ni el chat que alguien acaba de pedir.
 *
 * Por eso viven juntas y con una sola acción para despejarlas, `pedir-un-chat`: el «Escribirle» de una
 * ficha abre el chat en Tribu, y si la ficha seguía abierta el chat quedaba detrás y el botón parecía
 * no hacer nada (E-341). Una vista nueva de este tipo se agrega acá, y `pedir-un-chat` la despeja con
 * las demás.
 */
export type VistasDelMentor = {
  vista: 'ninguna' | 'celula' | 'alumno';
  /** El aprendiz cuya ficha se abrió desde «Mi grupo». */
  alumnoAbierto: AlumnoConEstado | null;
  /** D-207: la ficha abierta desde la info del chat de SU grupo, con el id de ese grupo. */
  fichaDesdeLaInfo: { alumno: AlumnoConEstado; grupoId: string } | null;
};

export const SIN_VISTAS_DEL_MENTOR: VistasDelMentor = { vista: 'ninguna', alumnoAbierto: null, fichaDesdeLaInfo: null };

export type AccionDeLasVistasDelMentor =
  | { tipo: 'abrir-mi-grupo' }
  | { tipo: 'salir-de-mi-grupo' }
  | { tipo: 'abrir-ficha'; alumno: AlumnoConEstado }
  | { tipo: 'volver-a-mi-grupo' }
  | { tipo: 'abrir-ficha-desde-la-info'; alumno: AlumnoConEstado; grupoId: string }
  | { tipo: 'volver-a-la-info' }
  | { tipo: 'pedir-un-chat' };

export function vistasDelMentor(estado: VistasDelMentor, accion: AccionDeLasVistasDelMentor): VistasDelMentor {
  switch (accion.tipo) {
    case 'abrir-mi-grupo':
    case 'volver-a-mi-grupo':
      return { ...estado, vista: 'celula' };
    case 'salir-de-mi-grupo':
      return { ...estado, vista: 'ninguna' };
    case 'abrir-ficha':
      return { ...estado, vista: 'alumno', alumnoAbierto: accion.alumno };
    case 'abrir-ficha-desde-la-info':
      return { ...estado, fichaDesdeLaInfo: { alumno: accion.alumno, grupoId: accion.grupoId } };
    case 'volver-a-la-info':
      return { ...estado, fichaDesdeLaInfo: null };
    case 'pedir-un-chat':
      // E-341: TODO lo que tapa Comunidad se cierra; si no, el chat pedido queda detrás.
      return SIN_VISTAS_DEL_MENTOR;
  }
}

/** Qué vista tapa Comunidad ahora, en el orden en que se dibujan; `null` si ninguna. */
export type LoQueTapaComunidad = 'ficha-desde-la-info' | 'ficha-de-mi-grupo' | 'mi-grupo' | null;

export function loQueTapaComunidad(estado: VistasDelMentor, esMentor: boolean): LoQueTapaComunidad {
  if (estado.fichaDesdeLaInfo) return 'ficha-desde-la-info';
  if (esMentor && estado.vista === 'alumno' && estado.alumnoAbierto) return 'ficha-de-mi-grupo';
  if (esMentor && estado.vista === 'celula') return 'mi-grupo';
  return null;
}
