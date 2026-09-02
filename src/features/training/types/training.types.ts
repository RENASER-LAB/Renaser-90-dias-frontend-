/**
 * Formas que devuelve el backend Java para `TrainingScreen`: la roca del día (módulo `rocks`,
 * dimensión "Vida y Negocio") y el listado de evidencias (módulo `evidence`, usado acá para saber
 * qué hábitos/rocas de hoy ya tienen evidencia subida). Nombres en camelCase — mismo criterio que
 * `features/habits/types/habits.types.ts`: Spring Boot 4 serializa con Jackson 3, el cable siempre
 * fue camelCase.
 *
 * Verificado contra el código real del backend (no contra un DTO viejo ni deducido de un nombre):
 * `RocaDiariaResponse.java`, `EvidenciaResponse.java`, `EvidenciaPageResponse.java` en
 * `renaser-backend/src/main/java/com/renaser/os/rocks` y `.../evidence`.
 */

/**
 * Un ítem de `GET /api/v1/rocks/today` — la roca diaria del aprendiz, con su estado de hoy.
 * `eje`: CUERPO/TRABAJO/RELACIONES (enum `eje_objetivo` de `renaser.rocas_maestras`, DISTINTO del
 * enum de categoría de hábito BODY/MIND/SPIRIT/CONSCIENCE — no confundir ni unificar los dos).
 */
export interface RocaDiariaApi {
  id: string;
  fecha: string;
  posicion: number;
  titulo: string;
  descripcion: string | null;
  color: string;
  puntajeImpacto: number;
  esDelegable: boolean;
  eje: string;
  rocaSemanalId: string | null;
  /** `HH:mm:ss`. Nulo si la roca no tiene ventana horaria propia. */
  horaInicio: string | null;
  horaFin: string | null;
  completada: boolean;
  completadaEn: string | null;
  puntosOtorgados: number;
  bloqueada: boolean;
}

/** Un ítem de `GET /api/v1/evidence` — evidencia ya subida, de cualquier destino. */
export interface EvidenciaApi {
  id: string;
  participanteId: string;
  /** No nulo cuando la evidencia es de un registro de hábito (`habit-tracks`). */
  registroHabitoId: string | null;
  /** No nulo cuando la evidencia es de una roca diaria (`rocks`). */
  rocaDiariaId: string | null;
  registroEspirituId: string | null;
  tipo: string;
  contenidoTexto: string | null;
  timestampExif: string | null;
  subidaEn: string;
  gpsLat: number | null;
  gpsLng: number | null;
  esPrincipal: boolean;
  estadoValidacion: string;
  notasValidacion: string | null;
  intentosIa: number;
  penalizacionAplicada: boolean;
  publicadaEnMuro: boolean;
}

/** `GET /api/v1/evidence` viene paginada por keyset, mismo contrato que `GET /api/v1/wall`. */
export interface EvidenciaPageApi {
  evidencias: EvidenciaApi[];
  nextCursor: string | null;
}
