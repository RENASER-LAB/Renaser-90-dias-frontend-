/**
 * Espejo de `EstadoOnboardingResponse` del backend (`onboarding/infrastructure/adapter/in/rest/
 * estado/EstadoOnboardingResponse.java`, SOLO LECTURA) — camelCase, como el resto de la API salvo
 * `academy` (ver `academy.types.ts` para esa excepción puntual).
 */
export type EstadoOnboardingApi = {
  userId: string;
  currentFlow: string | null;
  currentSection: string | null;
  currentStep: number | null;
  flowProgress: string | null;
  termsAcceptedAt: string | null;
  pactAcceptedAt: string | null;
  pactSignedAt: string | null;
  rocksSyncAcceptedAt: string | null;
  startedAt: string | null;
  lastActivityAt: string | null;
  completed: boolean;
  completedAt: string | null;
};

/**
 * Espejo de `AceptarHitoRequest.milestone` (backend, enum `HitoOnboarding`, SOLO LECTURA). Los 4
 * hitos de aceptación de `estado_onboarding`, cada uno con su propia columna timestamp.
 */
export type HitoOnboarding = 'TERMINOS' | 'PACTO' | 'PACTO_FIRMADO' | 'ROCAS_SYNC';

/**
 * Espejo de `EstadoActivacionProgramaResponse` (backend, `GET /onboarding/activate-program`,
 * SOLO LECTURA). `validStartDates` en formato `yyyy-MM-dd`, siempre mañana/+2/+3 en la zona del
 * aprendiz — nunca hoy (ver `ParticipacionPrograma.activarPrograma`, backend). Vacío cuando
 * `activated` ya es `true`.
 */
export type EstadoActivacionProgramaApi = {
  activated: boolean;
  validStartDates: string[];
  /** El Día 1 ya elegido (`yyyy-MM-dd`), o null/ausente si todavía no eligió (D-84). */
  startDate?: string | null;
};

/** Espejo de `ActivarProgramaRequest` (backend, `POST /onboarding/activate-program`). */
export type ActivarProgramaInput = {
  /** Formato `yyyy-MM-dd`, una de las fechas devueltas por `EstadoActivacionProgramaApi`. */
  startDate: string;
};

/** Espejo de `ActivarProgramaResponse` (backend, respuesta de `POST /onboarding/activate-program`). */
export type ActivarProgramaApi = {
  traineeProfileId: string;
  programDay: number;
  programActivatedAt: string;
  startDate: string;
  expectedGraduationDate: string;
};

/**
 * Espejo de `TipoPreguntaOnboarding` (backend, enum de dominio + `tipo_pregunta_onboarding` en
 * Postgres, SOLO LECTURA). El tipo decide en qué slot de valor va la respuesta — ver
 * `Respuesta.slotEsperado` en el backend y `SLOT_POR_TIPO` en `data/catalogoPreguntas.ts`.
 */
export type TipoPreguntaOnboarding =
  | 'TEXTO'
  | 'AREA_TEXTO'
  | 'NUMERO'
  | 'ESCALA'
  | 'SELECCION_UNICA'
  | 'SELECCION_MULTIPLE'
  | 'AUDIO'
  | 'FIRMA'
  | 'CASILLA'
  | 'FECHA'
  | 'ARCHIVO';

/** Espejo de `CuestionarioResponse.OpcionResponse` (backend, `GET /onboarding/questionnaire`). */
export interface OpcionPreguntaApi {
  order: number;
  value: string;
  label: string;
}

/**
 * Espejo de `CuestionarioResponse.PreguntaResponse` (backend). `id` es el que viaja en
 * `GuardarRespuestaInput.questionId`, y `questionKey` es la clave estable con la que lo pide el
 * cliente — ver `data/catalogoPreguntas.ts` para por qué NUNCA se hardcodea el `id`.
 */
export interface PreguntaCuestionarioApi {
  id: number;
  questionKey: string;
  text: string;
  type: TipoPreguntaOnboarding;
  required: boolean;
  order: number;
  options: OpcionPreguntaApi[];
}

/** Espejo de `CuestionarioResponse` (backend, `GET /onboarding/questionnaire?flow=...`). */
export interface CuestionarioApi {
  flow: string;
  sections: {
    sectionKey: string;
    title: string;
    order: number;
    questions: PreguntaCuestionarioApi[];
  }[];
}

/**
 * Una respuesta lista para mandar, pero identificada por la CLAVE de la pregunta en vez de por su
 * `id` numérico. Es lo que devuelven los builders de `data/mapaPreguntas.ts`; el `id` lo resuelve
 * `usePersistenciaOnboarding` contra el catálogo real justo antes de enviar.
 *
 * El motivo está explicado a fondo en `data/catalogoPreguntas.ts`: los `id` los asigna una
 * columna IDENTITY en un `INSERT ... SELECT` sin `ORDER BY` (`V10__catalogo_onboarding_default.sql`),
 * así que NO son reproducibles entre bases de datos. La clave sí: tiene `UNIQUE` en la tabla.
 */
export type RespuestaPorClaveInput = Omit<GuardarRespuestaInput, 'questionId'> & {
  /** `preguntas_onboarding.clave_pregunta` — estable y única en toda la tabla. */
  clave: string;
  /** Tipo que el cliente ESPERA que tenga esa pregunta; se verifica contra el catálogo al enviar. */
  tipoEsperado: TipoPreguntaOnboarding;
};

/**
 * Espejo de `GuardarRespuestaRequest` (backend, `POST /onboarding/answers`) — una respuesta por
 * llamada. El tipo de pregunta decide en qué campo va el valor (ver `data/mapaPreguntas.ts`):
 * solo uno de los 4 debe venir con valor a la vez, el resto queda `undefined`.
 */
export interface GuardarRespuestaInput {
  questionId: number;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  scaleValue?: number;
  jsonValue?: string;
  mediaId?: number;
}

/** Espejo de `RespuestaResponse` (backend, respuesta de `POST /onboarding/answers`). */
export interface RespuestaApi {
  id: number;
  questionId: number;
  textValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
  scaleValue: number | null;
  jsonValue: string | null;
  mediaId: number | null;
  acceptedAt: string | null;
  answeredAt: string | null;
  updatedAt: string | null;
}

/** Espejo de una respuesta dentro de `RespuestasAgrupadasResponse.sections[].answers[]` (`GET /onboarding/answers`). */
export interface RespuestaAgrupadaApi {
  questionId: number;
  questionKey: string;
  type: string;
  textValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
  scaleValue: number | null;
  jsonValue: string | null;
  mediaId: number | null;
  acceptedAt: string | null;
  answeredAt: string | null;
  updatedAt: string | null;
}

/** Espejo de `RespuestasAgrupadasResponse` (backend, `GET /onboarding/answers`) — agrupadas por sección. */
export interface RespuestasAgrupadasApi {
  flow: string;
  sections: {
    sectionKey: string;
    title: string;
    answers: RespuestaAgrupadaApi[];
  }[];
}

/** Espejo de `AvanzarEstadoRequest` (backend, `PUT /onboarding/state`) — todos los campos opcionales. */
export interface AvanzarEstadoInput {
  flow?: string;
  section?: string;
  step?: number;
  flowProgress?: string;
}

/**
 * Espejo de `ClaseMedia` (backend, `onboarding/domain/model/media/ClaseMedia.java`, SOLO LECTURA)
 * — los 3 valores libres de la columna `medias_onboarding.clase`.
 */
export type ClaseMediaOnboarding = 'AUDIO' | 'FIRMA' | 'DOCUMENTO';

/** Espejo de `UrlSubidaMediaRequest` (backend, `POST /onboarding/media/upload-url`). */
export interface SolicitarUrlSubidaMediaInput {
  flow: string;
  questionKey: string;
  kind: ClaseMediaOnboarding;
  contentType: string;
}

/**
 * Espejo de `UrlSubidaMediaResponse` (backend). `uploadUrl` es la URL prefirmada de S3 — el `PUT`
 * de los bytes va directo ahí, nunca a este backend (mismo patrón que `WallUrlSubida`).
 */
export interface UrlSubidaMediaOnboardingApi {
  uploadUrl: string;
  bucket: string;
  path: string;
}

/** Espejo de `RegistrarMediaRequest` (backend, `POST /onboarding/media`), tras subir los bytes a S3. */
export interface RegistrarMediaInput {
  flow: string;
  questionKey: string;
  kind: ClaseMediaOnboarding;
  bucket: string;
  path: string;
  mime?: string;
  sizeBytes?: number;
  /** Metadato libre — acá viaja el JSON de los trazos SVG originales cuando `kind` es `FIRMA`. */
  metadata?: string;
}

/**
 * Espejo de `MediaResponse` (backend, respuesta de `POST /onboarding/media`). El `id` es el
 * `mediaId` que después viaja en `GuardarRespuestaInput.mediaId` (`POST /onboarding/answers`).
 */
export interface MediaOnboardingApi {
  id: number;
  flow: string | null;
  questionKey: string | null;
  kind: string;
  bucket: string;
  path: string;
  mime: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  metadata: string | null;
  createdAt: string;
}

export type SexoOption = 'Masculino' | 'Femenino' | 'Otro';
export type EstadoCivilOption = 'Soltero(a)' | 'Casado(a)' | 'Conviviente' | 'Divorciado(a)' | 'Viudo(a)';

export interface FichaIdentidadData {
  nombre: string;
  sexo: SexoOption | '';
  estadoCivil: EstadoCivilOption | '';
  cantidadHijos: string;
  ocupacion: string;
  tipoNegocio: string;
  tipoDocumento: 'DNI' | 'Pasaporte' | 'Carné de extranjería' | string;
  numeroDocumento: string;
  fechaNacimiento: string;
  whatsapp: string;
  codigoPais?: string;
  email: string;
  pais: string;
  departamento?: string;
  ciudad: string;
  distrito?: string;
  direccion?: string;
  expectativa: string;
  temor: string;
}

export interface FichaSaludData {
  peso: string;
  estatura: string;
  horasSueno: string;
  calidadSueno: number; // 1 to 10
  condicionesSalud: string[];
  tomaMedicacionRegular: boolean;
  especificacionMedicacion: string;
  motivoMedicacion: string;
  objetivoSmartSalud: string;
}

export interface FichaConsentimientoData {
  autorizaUsoDatos: boolean;
  compromiso90Dias: boolean;
  dispuestoSoltar: string;
  firmaDigital: string;
}

export interface FichaInicialData {
  identidad: FichaIdentidadData;
  salud: FichaSaludData;
  consentimiento: FichaConsentimientoData;
}

// Legacy types for compatibility
export interface FichaCuerpoData {
  peso: string;
  estatura: string;
  horasSueno: string;
  calidadSueno: number;
  medicacion: string;
  smartCuerpo: string;
}

export interface FichaMenteData {
  pensamientoBoicot: string;
  criticoInterno: string;
  creenciaLimitante: string;
  definicionHoy: string;
  sinoCambio: string;
  quienQuieresSer: string;
}

export interface FichaAlmaData {
  fraseParental: string;
  vinculoPadre: number;
  vinculoMadre: number;
  fraseDineroInfancia: string;
  mereceDinero: number;
  porqueMerece: string;
}

export interface FichaNegocioData {
  metaFacturacion: string;
  producto: string;
  clienteIdeal: string;
  enemigoPublico: string;
  smartNegocio: string;
}

export interface FichaCompromisoData {
  porqueAhora: string;
  razonPrincipal: string;
  costoFracaso: string;
  dispuestoSoltar: string;
  compromisoFirmado: boolean;
}
