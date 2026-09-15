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
 * Los tres roles que se piden **para la sección «Staff»**.
 *
 * MENTOR sigue afuera: los mentores tienen su propia sección, alimentada por
 * `/admin/cells/mentores`, que además dice si acompañan un grupo. Sumarlos también acá pondría a
 * cada mentor activo dos veces en la misma pantalla con dos líneas distintas.
 *
 * > **Corregido 2026-09-15.** Esto decía que los mentores «ya tienen su propia sección», dando por
 * > sentado que esa sección los trae a **todos**. No los trae: `/admin/cells/mentores` sale de
 * > `CelulaService.mentores`, que filtra por `mentoresActivos()`. Suspender a un mentor lo borraba
 * > del panel entero —Personas lista solo aprendices— y, sin fila, no había forma de devolverle el
 * > rol ni de encontrarlo. Los que esa lista no trae se piden aparte, con `role=MENTOR`, y se
 * > cruzan por id en {@link mentoresQueFaltan}. Esta constante no cambió: sigue siendo la de la
 * > sección «Staff», y meter MENTOR acá seguiría duplicando a los activos.
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
    // El estado va ANTES del correo, y el orden no es cosmético: la fila corta el texto a una
    // línea, así que en un teléfono angosto se pierde el correo y nunca el «Cuenta suspendida».
    detalle: estado ? `${estado} · ${correo}` : correo,
    rol: usuario.role,
  };
}

/**
 * Los mentores que la sección «Mentores» todavía no muestra.
 *
 * <blockquote><b>Qué bug cierra.</b> Un mentor suspendido desaparecía del panel entero. Personas
 * lista solo aprendices (`WHERE u.rol = 'APRENDIZ'`) y esta pantalla pedía los mentores por
 * `/admin/cells/mentores`, que devuelve <b>solo los ACTIVOS</b>. Sin fila no hay menú de roles: la
 * única forma de devolverle el rol a alguien suspendido era entrar a la base de datos. Es la misma
 * puerta de un solo sentido que ya se cerró para líderes, administradores y alquimistas, abierta
 * otra vez por un camino distinto.</blockquote>
 *
 * La vuelta es `GET /admin/staff?role=MENTOR` **sin** `status`: el backend solo filtra por estado
 * cuando el parámetro viene (`StaffAdminService.listar` pasa un `statusFilter` nulo, y
 * `UserPersistenceAdapter.byRoles` cae en `findByRolIn`), así que esa consulta trae a los mentores
 * de cualquier estado.
 *
 * El cruce es **por id, no por estado**. Podría filtrarse por `status !== 'ACTIVE'` y daría lo
 * mismo hoy, pero sería volver a deducir de un enum en qué lista está cada persona — la deducción
 * que causó todo esto. Quién ya se ve lo dicen los ids que se pasan, y si mañana
 * `/admin/cells/mentores` empieza a traer a alguien más, esto no duplica a nadie igual.
 */
export function mentoresQueFaltan(
  yaVisibles: Iterable<string>,
  mentoresDeStaff: readonly UsuarioStaffApi[],
): PersonaDelPadron[] {
  const conocidos = new Set(yaVisibles);
  return mentoresDeStaff.filter(usuario => !conocidos.has(usuario.id)).map(personaDeStaff);
}
