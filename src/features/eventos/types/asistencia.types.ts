/**
 * Asistencia a un evento (D-256 del backend, 2026-10-06): quién respondió y pasar lista.
 *
 * Contrato: `docs/api/CONTRATO_ASISTENCIA_EVENTOS.md` del backend. Acá se traduce una sola vez, en
 * `api/asistenciaSchemas.ts`, y las pantallas no ven el inglés del cable.
 *
 * Solo lo ven quien creó el evento, el Admin, el Alquimista y el Líder de mentores. Es «simplemente
 * seguimiento»: no da puntos ni toca coherencia, semáforo ni racha. El aprendiz no ve la suya.
 */

/** Lo que respondió. «Quizás» existe en el cable, pero la app no lo ofrece: se muestra como sin respuesta. */
export type Respuesta = 'GOING' | 'NOT_GOING' | 'MAYBE' | null;

/** Cómo llegó. `null` = ausente / sin marcar (no hay un valor «ausente»). */
export type EstadoDeLlegada = 'A_TIEMPO' | 'TARDE' | null;

export interface RespuestaAnterior {
  respuesta: Respuesta;
  /** ISO-8601. */
  en: string;
}

export interface PersonaQueRespondio {
  id: string;
  nombre: string;
  avatarUrl: string | null;
  respuesta: Respuesta;
  respondidaEn: string | null;
  /** Desde que existe el historial (V93), de la más vieja a la más nueva; la última es la vigente. */
  historial: RespuestaAnterior[];
}

export interface RespuestasDelEvento {
  inicioOcurrencia: string;
  personas: PersonaQueRespondio[];
}

export interface PersonaDeLaLista {
  id: string;
  nombre: string;
  avatarUrl: string | null;
  respuesta: Respuesta;
  respondidaEn: string | null;
  llegada: EstadoDeLlegada;
  marcadaEn: string | null;
}

export interface ListaDeAsistencia {
  inicioOcurrencia: string;
  abreEn: string;
  cierraEn: string;
  /** Si ahora se puede marcar: dentro de la ventana y sin cerrar. */
  abierta: boolean;
  cerrada: { en: string; porId: string | null; porNombre: string | null } | null;
  personas: PersonaDeLaLista[];
}
