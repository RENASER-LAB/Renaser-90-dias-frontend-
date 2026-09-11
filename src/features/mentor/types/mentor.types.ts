/**
 * Tipos del rol Mentor: acompañar a una célula sin dejar de ser aprendiz.
 *
 * Salen del esquema que YA existe en la base de datos (`renaser.celulas`,
 * `renaser.participantes_programa.mentor_id` / `celula_id` / `dia_programa`), no de una
 * invención de esta pantalla. Lo que todavía no existe es el endpoint que los sirva;
 * ver `api/mentorApi.ts`.
 */

/**
 * Roles que acompañan una célula.
 *
 * Se aceptan las DOS nomenclaturas a propósito. El enum de la base de datos está en castellano
 * (`APRENDIZ`, `MENTOR`, `LIDER_MENTORES`, `ADMIN`, `ALQUIMISTA`) y Java lo traduce al inglés
 * (`TRAINEE`, `MENTOR`, `MENTOR_LEAD`...) en `RolUsuarioSqlMapper` y `RolesCatalogo`. Con dos
 * juegos de nombres vivos en el mismo sistema, comprobar solo uno es la clase de fallo que no
 * avisa: la tarjeta simplemente no aparecería, y nadie sabría por qué.
 */
export const ROL_MENTOR = ['MENTOR', 'MENTOR_LEAD', 'LIDER_MENTORES'] as const;

/**
 * Quién responde por el grupo ahora mismo.
 *
 * `sin_cobertura` NO es lo mismo que "no hay grupo": el grupo existe, tiene su chat y sus
 * miembros, y lo que falta es la persona que lo acompaña. Confundir las dos cosas es lo que
 * hace desaparecer el grupo de la pantalla de alguien que sí lo tiene (plan.md §10).
 */
export type CoberturaCelula = 'con_mentor' | 'soporte' | 'sin_cobertura';

export interface CelulaResumen {
  id: string;
  nombre: string;
  /** Nombre de la cohorte, si la célula pertenece a una. */
  cohorte: string | null;
  /** Id de la cohorte. Necesario para pedir el ranking entre sus grupos. */
  cohorteId: string;
  /** ISO. `null` mientras no haya sesión agendada. */
  proximaSesionEn: string | null;
  urlVideollamada: string | null;
  /** Recepción son los primeros días del programa; el grupo estable es el de después. */
  tipo: 'recepcion' | 'regular';
  cobertura: CoberturaCelula;
  /** Tope de aprendices. `null` en recepción, que no lo tiene. */
  cupo: number | null;
  /** MENTOR | GUIA | SOPORTE — con qué función lo acompaña quien mira. */
  funcion: string;
  /** ISO de inicio de la asignación vigente, y su fin (`null` mientras siga vigente). */
  desde: string;
  hasta: string | null;
}

export interface AlumnoCelula {
  participanteId: string;
  nombre: string | null;
  /** 1..90. `0` = todavía no arrancó su programa; `null` = no se sabe. */
  diaPrograma: number | null;
  /** ISO de la última actividad registrada. `null` si nunca registró nada. */
  ultimaActividadEn: string | null;
  /** Hábitos que le tocaban esta semana. `null` si el servidor aún no lo calcula. */
  habitosProgramados: number | null;
  habitosCumplidos: number | null;
  /** Evidencias suyas esperando revisión del mentor. */
  evidenciasPendientes: number | null;
}

export interface MiCelula {
  celula: CelulaResumen;
  alumnos: AlumnoCelula[];
}

/**
 * Por qué un alumno aparece en "requieren seguimiento".
 *
 * Se calcula en el móvil a partir de datos que sí vienen del servidor, no lo decide el
 * servidor: así el criterio se puede afinar sin esperar un despliegue del backend. Si algún
 * día el backend manda su propia señal, este tipo es el punto donde se cambia.
 */
export type MotivoSeguimiento =
  | { clase: 'sin_actividad'; dias: number }
  | { clase: 'habitos_pendientes'; cantidad: number }
  | { clase: 'evidencias_pendientes'; cantidad: number };

export interface AlumnoConEstado extends AlumnoCelula {
  motivos: MotivoSeguimiento[];
  /** `true` si tiene al menos un motivo. */
  requiereSeguimiento: boolean;
  /**
   * `true` si hay alguna señal para juzgarlo. Cuando es `false` no se sabe nada de esta
   * persona, y eso NO es "va al día": decirle a un mentor que alguien está bien cuando no hay
   * un solo dato es peor que no decirle nada.
   */
  evaluable: boolean;
  /** 0..1, o `null` cuando el servidor no manda los hábitos de la semana. */
  cumplimiento: number | null;
}
