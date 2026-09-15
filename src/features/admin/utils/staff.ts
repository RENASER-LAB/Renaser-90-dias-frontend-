import type { RolDeStaff } from '../api/adminApi';
import type { UsuarioStaffApi } from '../api/adminSchemas';

/**
 * Cómo se lee una persona en el padrón de «Staff y roles».
 *
 * <blockquote><b>Por qué existe este archivo.</b> Hasta hoy el panel sabía listar exactamente dos
 * roles —aprendices por `/admin/trainees`, mentores por `/admin/cells/mentores`— y el rol que
 * mostraba no era un dato: era <i>de qué lista vino la persona</i>. Con eso, ascender a alguien a
 * líder de mentores, administrador o alquimista lo sacaba de las dos listas y no se lo volvía a
 * ver nunca: para devolverlo a aprendiz había que entrar a la base de datos.
 *
 * `GET /api/v1/admin/staff` sí trae `role`. Convertir su respuesta en filas es la única lógica
 * nueva y va acá, pura y probada, en vez de dentro del `map` de una pantalla.</blockquote>
 */
export type PersonaDelPadron = {
  id: string;
  nombre: string;
  /** La línea de abajo: el correo y, solo cuando no es el normal, el estado de la cuenta. */
  detalle: string;
  /**
   * Para el staff es el rol que manda el servidor, tal cual. Se guarda como `string` y no como
   * `RolAsignable` a propósito: si el backend agrega un rol, la fila lo muestra con su nombre
   * crudo en vez de fingir que es uno de los cinco conocidos.
   */
  rol: string;
};

/**
 * Los tres roles que **solo** aparecen por el listado de staff.
 *
 * MENTOR queda fuera aunque el endpoint lo devuelva: los mentores ya tienen su propia sección,
 * alimentada por `/admin/cells/mentores`, que además dice si acompañan un grupo. Pedirlos otra
 * vez acá pondría a la misma persona dos veces en la misma pantalla, que es justo lo que la
 * sección «Cambios de esta sesión» evita a mano.
 */
export const ROLES_SOLO_EN_STAFF: readonly RolDeStaff[] = ['MENTOR_LEAD', 'ADMIN', 'ALCHEMIST'];

/**
 * Cómo se nombra el estado de una cuenta, o `null` cuando no hace falta nombrarlo.
 *
 * `ACTIVE` devuelve `null` porque es lo esperable: rotular cada fila con «Activa» convierte la
 * lista en ruido y hace que el rótulo que sí importa —«suspendida»— se pierda entre los demás.
 *
 * Un estado desconocido se muestra **tal como llegó**, sin traducir. Es feo a propósito: prefiero
 * que se vea un enum crudo a inventarle un nombre amable a algo que esta versión no conoce.
 */
export function etiquetaDeEstadoDeCuenta(estado: string | null | undefined): string | null {
  const clave = (estado ?? '').trim().toUpperCase();
  switch (clave) {
    case '':
    case 'ACTIVE':
      return null;
    case 'SUSPENDED':
      return 'Cuenta suspendida';
    // INACTIVE es "registrada pero sin aprobar", no "desactivada" (backend, `UserStatus`).
    case 'INACTIVE':
      return 'Sin aprobar todavía';
    default:
      return clave;
  }
}

/** Una fila del padrón a partir de lo que devuelve `GET /api/v1/admin/staff`. Nada se rellena. */
export function personaDeStaff(usuario: UsuarioStaffApi): PersonaDelPadron {
  const estado = etiquetaDeEstadoDeCuenta(usuario.status);
  const correo = usuario.email?.trim() ? usuario.email.trim() : 'Sin correo';
  return {
    id: usuario.id,
    nombre: usuario.fullName?.trim() ? usuario.fullName.trim() : 'Sin nombre',
    detalle: estado ? `${estado} · ${correo}` : correo,
    rol: usuario.role,
  };
}
