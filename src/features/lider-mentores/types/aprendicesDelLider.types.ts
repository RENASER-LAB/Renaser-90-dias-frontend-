/**
 * «Todos los aprendices» del líder de mentores (2026-10-31): `GET /api/v1/leadership/people`.
 */

/** Una fila de la lista: quién es y, si lo tiene, su grupo. Con ella se abre su ficha. */
export interface AprendizDeLaLista {
  personaId: string;
  /** Siempre hay algo que mostrar: un nombre vacío se dice «Persona sin nombre». */
  nombre: string;
  /**
   * La foto que manda el servidor: una URL completa o, como en el chat, una ruta que se pide con la sesión. `null` = sin
   * foto (quedan las iniciales).
   */
  fotoPath: string | null;
  /** `null` = no está en ningún grupo. Con grupo, «Avisar a su mentor» puede ofrecerse en su ficha. */
  grupoId: string | null;
  grupoNombre: string | null;
  mentorNombre: string | null;
  /** El día del programa en que va; `null` = todavía no eligió su Día 1 (o el servidor no lo dijo). */
  diaPrograma: number | null;
}

export interface PaginaDeAprendices {
  items: AprendizDeLaLista[];
  /** Desde 0. */
  pagina: number;
  tamano: number;
  /** Cuántas personas coinciden en total; `null` si el servidor no lo dijo. */
  total: number | null;
  /** Si hay una página siguiente. */
  hayMas: boolean;
}
