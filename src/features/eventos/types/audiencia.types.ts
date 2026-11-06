/**
 * Spec 044: la audiencia elegida de un evento («¿Para quién es?»), tal como la usa la app. El cable habla en inglés (`PERSON`, `MY_LEARNERS`,
 * `GROUP`, `MENTORS`, `TRAFFIC_LIGHT`, `STAFF`; colores `GREEN`, `YELLOW`, `RED`) y se traduce una vez en `api/audienciaApi.ts`.
 */

export type TipoDeParte = 'PERSON' | 'MY_LEARNERS' | 'GROUP' | 'MENTORS' | 'TRAFFIC_LIGHT' | 'STAFF';
export type ColorDelSemaforo = 'GREEN' | 'YELLOW' | 'RED';

/** Una persona que se puede invitar: lo que muestra el buscador. Nunca trae su color (FR-016). */
export interface PersonaConvocable {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  /** El rol en palabras («Aprendiz», «Mentor», «Líder de mentores»…). */
  rol: string | null;
  grupo: string | null;
}

export interface GrupoConvocable {
  id: string;
  nombre: string;
  integrantes: number;
}

/** Lo que el servidor deja elegir a esta cuenta (FR-029). Sin permiso, `puedeCrear` es `false`. */
export interface OpcionesDeAudiencia {
  puedeCrear: boolean;
  partes: TipoDeParte[];
  tiposDeEvento: string[];
  porDefecto: TipoDeParte | null;
  /** Si puede crear «para todos» (lo de siempre: Administración y Alquimista). */
  todos: boolean;
  colores: Record<ColorDelSemaforo, number>;
  misAlumnos: number;
  grupos: GrupoConvocable[];
  personal: PersonaConvocable[];
}

export interface ParteDelResumen {
  tipo: TipoDeParte;
  id: string | null;
  nombre: string | null;
  color: ColorDelSemaforo | null;
  cuantos: number;
  /** ISO: cuándo se tomó la foto del semáforo (solo colores). */
  resueltoEn: string | null;
  personas: PersonaConvocable[];
}

/** «Para quién es», con sus cifras. Solo lo manda el servidor a quien creó o gestiona el evento (FR-018). */
export interface ResumenDeAudiencia {
  partes: ParteDelResumen[];
  total: number;
}

/** Una parte tal como viaja al servidor. */
export interface ParteDelCable {
  kind: TipoDeParte;
  id?: string;
  color?: ColorDelSemaforo;
}
