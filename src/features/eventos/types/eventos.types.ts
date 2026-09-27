/**
 * Eventos del calendario (clases, mentorías, sesiones), tal como los usa la app.
 *
 * El contrato es `/api/v1/calendar/events` del backend (`calendar`, `EventoResponse` y
 * `OcurrenciaResponse`), que habla en inglés en el cable. Acá se traduce una sola vez, en
 * `api/eventosSchemas.ts`, y las pantallas no ven el inglés.
 *
 * **Todo lo que no es imprescindible es opcional** (`null`): la app no se actualiza por aire, así
 * que un campo que el backend deje de mandar —o un valor nuevo de un enum— no puede tumbar la
 * sección. Imprescindible es solo lo que permite mostrar y abrir un evento: `id`, título e inicio.
 */

/** Dónde ocurre. Mismo vocabulario que el cable; un valor desconocido llega como `OTRO`. */
export type TipoUbicacion = 'INTERNAL_CALL' | 'WEBINAR' | 'ZOOM' | 'MEET' | 'ADDRESS' | 'LINK' | 'OTRO';

/** Lo que respondió esta persona. `null` = todavía no respondió. */
export type Asistencia = 'GOING' | 'NOT_GOING' | 'MAYBE' | null;

/** Una regla de aviso del evento, igual que `reminderRules` del backend. */
export type ReglaDeAviso =
  | { tipo: 'minutosAntes'; minutos: number }
  | { tipo: 'diasAntes'; dias: number }
  | { tipo: 'horaDelDia'; hora: string /* HH:mm */ };

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  /** ISO-8601 (instante). */
  iniciaEn: string;
  duracionMinutos: number | null;
  /** Zona IANA del evento (`America/Lima`). `null` si no vino: se usa la del teléfono. */
  zona: string | null;
  tipoUbicacion: TipoUbicacion;
  /** Texto libre que escribió quien lo creó: el link de Meet/Drive, o una dirección. */
  valorUbicacion: string | null;
  /** `MENTORIA_ALQUIMISTA`, `ESPONTANEO`, `SEMANA_MANIFESTACION`, `SESION_ESPECIAL`… o uno nuevo. */
  tipoEvento: string | null;
  /** `null` = el evento usa los avisos por defecto de su tipo (el backend no los manda). */
  reglasDeAviso: ReglaDeAviso[] | null;
  notificarAlCrear: boolean;
  recurrente: boolean;
  creadoPor: string | null;
  /** Para reenviarlo tal cual al editar: el formulario siempre manda el evento completo. */
  audiencia: string | null;
  rolesDestino: string[];
}

/** Una fecha concreta de un evento (un evento recurrente tiene varias). */
export interface Ocurrencia {
  evento: Evento;
  /** Identifica la ocurrencia ante el backend (RSVP, cancelar una fecha). ISO-8601. */
  inicioOcurrencia: string;
  /** Cuándo empieza de verdad esta ocurrencia (puede estar reprogramada). ISO-8601. */
  iniciaEn: string;
  duracionMinutos: number | null;
  titulo: string;
  asistencia: Asistencia;
}
