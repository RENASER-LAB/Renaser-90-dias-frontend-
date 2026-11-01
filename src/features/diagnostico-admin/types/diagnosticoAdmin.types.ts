import type {
  CondicionDeLaPregunta,
  DestinoDeLaPregunta,
  EscalaDeLaPregunta,
  OpcionDeLaPregunta,
  TipoDePregunta,
} from '../../diagnostico/types/diagnostico.types';

/**
 * Lo que Administración ve y manda del diagnóstico (spec 026, contrato `diagnostico-api.md` §5). Los tipos de una pregunta
 * (`TipoDePregunta`, `DestinoDeLaPregunta`, la escala, la condición) son los mismos que usa la persona: viven en
 * `features/diagnostico/types`. Acá solo está lo que es de Administración.
 */

export type EstadoDeLaPregunta = 'ACTIVA' | 'RETIRADA';

/** Una pregunta tal como la devuelve `GET /admin/diagnostico` (`PreguntaAdmin` = `PreguntaRequest` + lo de abajo). */
export interface PreguntaAdmin {
  id: number;
  clave: string;
  orden: number;
  seccionId: number;
  estado: EstadoDeLaPregunta;
  /** Las que alimentan Plan o el trato de SER: no se quitan ni cambian de tipo. */
  protegida: boolean;
  /** Cuántas personas la respondieron. */
  respuestas: number;
  texto: string;
  ayuda: string | null;
  tipo: TipoDePregunta;
  requerida: boolean;
  maximoOpciones: number | null;
  opciones: OpcionDeLaPregunta[];
  escala: EscalaDeLaPregunta | null;
  seMuestraSi: CondicionDeLaPregunta | null;
  alimenta: DestinoDeLaPregunta | null;
  /** Códigos de formación a las que se limita; `null` = todas. */
  formaciones: string[] | null;
  precarga: string | null;
}

export interface SeccionAdmin {
  id: number;
  clave: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  /** La portada no es un paso: solo se editan su título y su mensaje. */
  esPortada: boolean;
  preguntas: PreguntaAdmin[];
}

export interface QuienPublico {
  id: string;
  nombre: string;
}

export interface VersionPublicada {
  version: number;
  publicadaEn: string | null;
  publicadaPor: QuienPublico | null;
}

export interface PuedePublicar {
  ok: boolean;
  motivos: string[];
}

/** `GET /api/v1/admin/diagnostico`: el borrador completo. */
export interface BorradorDelDiagnostico {
  publicada: VersionPublicada | null;
  hayCambiosSinPublicar: boolean;
  puedePublicar: PuedePublicar;
  secciones: SeccionAdmin[];
  retiradas: PreguntaAdmin[];
  totales: { secciones: number; preguntas: number };
  /** Preguntas que el servidor mandó y esta versión de la app no sabe mostrar (un tipo nuevo): se avisa, no se esconde en silencio. */
  noEntendidas: number;
}

/** El cuerpo de `POST /preguntas` y `PUT /preguntas/{id}` (`PreguntaRequest`). */
export interface PreguntaRequest {
  seccionId: number;
  texto: string;
  ayuda?: string | null;
  tipo: TipoDePregunta;
  requerida: boolean;
  maximoOpciones?: number | null;
  opciones: Array<{ valor?: string; etiqueta: string }>;
  escala?: { min: number; max: number; etiquetaMin?: string | null; etiquetaMax?: string | null } | null;
  seMuestraSi?: CondicionDeLaPregunta | null;
  alimenta?: DestinoDeLaPregunta | null;
  formaciones?: string[] | null;
  precarga?: 'NOMBRE_COMPLETO' | null;
}

export interface ResultadoDeQuitar {
  eliminadas: number;
  retiradas: number;
  conRespuestas: number;
}

export interface ResultadoDePublicar {
  version: number;
  publicadaEn: string | null;
  publicadaPor: QuienPublico | null;
}

export interface VersionDelDiagnostico {
  version: number;
  publicadaEn: string | null;
  publicadaPor: QuienPublico | null;
  preguntas: number;
}

export interface FilaDeImportacion {
  numero: number;
  seccion: string;
  clave: string;
  texto: string;
  tipo: string;
}

export interface ErrorDeImportacion {
  fila: number;
  columna: string | null;
  mensaje: string;
}

export interface AdvertenciaDeImportacion {
  fila: number;
  mensaje: string;
}

/** `POST /importacion/vista-previa`. */
export interface VistaPreviaDeImportacion {
  secciones: number;
  preguntas: number;
  filas: FilaDeImportacion[];
  errores: ErrorDeImportacion[];
  advertencias: AdvertenciaDeImportacion[];
  /** Con «Reemplazar la ficha»: cuántas preguntas de la ficha actual dejarían de mostrarse. */
  preguntasQueSeRetirarian: number;
  conRespuestas: number;
}

export type ModoDeImportacion = 'ANADIR' | 'REEMPLAZAR';

export interface ResultadoDeImportacion {
  secciones: number;
  preguntas: number;
  eliminadas: number;
  retiradas: number;
}

export type FichaDeIngreso = 'ESTANDAR' | 'CON_DIAGNOSTICO';

export interface PersonaOmitida {
  id: string;
  nombre: string;
  motivo: string;
}

/** `POST /personas/ficha`. */
export interface ResultadoDeAsignar {
  asignadas: number;
  omitidas: PersonaOmitida[];
}
