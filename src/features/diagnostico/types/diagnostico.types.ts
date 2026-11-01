/**
 * El diagnóstico inicial (spec 026): la ficha que reemplaza al Mapa de Renacimiento. Estos tipos son el contrato de
 * `Renaser-90-dias-backend/specs/026-ficha-con-diagnostico/contracts/diagnostico-api.md` (§1 la persona, §4 la lectura). Los usan la
 * persona que lo completa, la vista previa de Administración y las fichas de lectura; por eso viven aquí y no en una pantalla.
 */

export type TipoDePregunta =
  | 'TEXTO'
  | 'AREA_TEXTO'
  | 'NUMERO'
  | 'SELECCION_UNICA'
  | 'SELECCION_MULTIPLE'
  | 'ESCALA'
  | 'CUADRICULA'
  | 'FECHA'
  | 'CASILLA';

export type EjeDelObjetivo = 'CUERPO' | 'TRABAJO' | 'RELACIONES';

export type DestinoDeLaPregunta =
  | 'OBJETIVO_CUERPO'
  | 'OBJETIVO_NEGOCIO'
  | 'OBJETIVO_RELACIONES'
  | 'PRIORIDAD_PRINCIPAL'
  | 'PRIMERA_ACCION'
  | 'TRATO_DE_LA_PERSONA';

export interface OpcionDeLaPregunta {
  valor: string;
  etiqueta: string;
}

export interface EscalaDeLaPregunta {
  min: number;
  max: number;
  etiquetaMin: string | null;
  etiquetaMax: string | null;
}

export interface CondicionDeLaPregunta {
  preguntaId: number;
  valor: string;
}

/** Una pregunta tal como la ve la persona (ya con `{duracion}` y `{formacion}` reemplazados por el servidor). */
export interface PreguntaDelDiagnostico {
  id: number;
  clave: string;
  texto: string;
  ayuda: string | null;
  tipo: TipoDePregunta;
  requerida: boolean;
  maximoOpciones: number | null;
  /** Tope de caracteres (500 en las que alimentan un objetivo); null = sin tope. */
  largoMaximo: number | null;
  opciones: OpcionDeLaPregunta[];
  escala: EscalaDeLaPregunta | null;
  seMuestraSi: CondicionDeLaPregunta | null;
  alimenta: DestinoDeLaPregunta | null;
  /** Lo que ya consta de la solicitud (el nombre), para confirmarlo en vez de escribirlo de nuevo. */
  precarga: string | null;
}

export interface SeccionDelDiagnostico {
  clave: string;
  titulo: string;
  descripcion: string | null;
  preguntas: PreguntaDelDiagnostico[];
}

/** Lo que se guarda por pregunta (upsert). Todos null = «sin respuesta» (borra la anterior). */
export interface RespuestaDelDiagnostico {
  preguntaId: number;
  valorTexto: string | null;
  valorNumero: number | null;
  valorBooleano: boolean | null;
  valorEscala: number | null;
  /** Texto JSON: `["valor","valor"]` en casillas, `{"fila": 4}` en la cuadrícula. */
  valorJson: string | null;
}

export type EstadoDelDiagnostico = 'NO_APLICA' | 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADO';

/** `GET /api/v1/diagnostico/mio` y, con otro origen, `GET /api/v1/admin/diagnostico/vista-previa`. */
export interface DiagnosticoParaLaPersona {
  version: number;
  estado: EstadoDelDiagnostico;
  titulo: string;
  portada: { titulo: string; mensaje: string | null };
  formacion: { codigo: string; nombre: string } | null;
  duracion: { dias: number; texto: string };
  paso: number | null;
  secciones: SeccionDelDiagnostico[];
  respuestas: RespuestaDelDiagnostico[];
}

/** `GET /api/v1/diagnostico/mio/estado`. */
export interface EstadoDeMiDiagnostico {
  ficha: 'ESTANDAR' | 'CON_DIAGNOSTICO';
  estado: EstadoDelDiagnostico;
  version: number | null;
  completedAt: string | null;
}

export interface ObjetivoPreparado {
  eje: EjeDelObjetivo;
  texto: string;
}

/** `POST /api/v1/diagnostico/mio/terminar`. */
export interface ResultadoDeTerminar {
  estado: EstadoDelDiagnostico;
  objetivos: ObjetivoPreparado[];
  prioridad: EjeDelObjetivo | null;
  primeraAccion: string | null;
}

/** `GET /api/v1/diagnostico/mio/resumen`: lo que lee Plan. */
export interface ResumenDeMiDiagnostico {
  completado: boolean;
  prioridad: EjeDelObjetivo | null;
  primeraAccion: string | null;
  objetivos: ObjetivoPreparado[];
}

export interface RespuestaLegible {
  texto: string | null;
  valores: string[];
  filas: { etiqueta: string; valor: number }[];
}

export interface PreguntaLeida {
  id: number;
  texto: string;
  tipo: TipoDePregunta | string;
  retirada: boolean;
  respuesta: RespuestaLegible | null;
  /**
   * El tope de la escala de una cuadrícula o escala, si el servidor lo dice (`escala.max` de la pregunta): con él la fila se lee
   * «4 de 5». Sin él (el contrato de §4 no lo trae todavía) se lee solo «4», que es lo único que se sabe.
   */
  escalaMax?: number | null;
}

/** La lectura (solo lectura) del diagnóstico de una persona: §4 del contrato. La ven ella, su mentor, el líder y Administración. */
export interface LecturaDelDiagnostico {
  persona: { id: string; nombre: string } | null;
  ficha: 'ESTANDAR' | 'CON_DIAGNOSTICO';
  estado: EstadoDelDiagnostico;
  version: number | null;
  completadoEn: string | null;
  formacion: { codigo: string; nombre: string } | null;
  secciones: { titulo: string; preguntas: PreguntaLeida[] }[];
}

/**
 * La interfaz que comparten la persona y la vista previa de Administración: el mismo recorrido, con otro origen de datos.
 * `modo: 'vistaPrevia'` no guarda nada en ningún lado (ni en el servidor ni en el teléfono) y no navega al terminar.
 */
export interface PropiedadesDelRecorrido {
  datos: DiagnosticoParaLaPersona;
  modo: 'persona' | 'vistaPrevia';
  /** Guarda un paso (persona). En la vista previa no se llama. */
  onGuardarPaso?: (respuestas: RespuestaDelDiagnostico[], indiceDePaso: number) => Promise<void>;
  /** Termina (persona). Devuelve lo preparado para el cierre. En la vista previa no se llama. */
  onTerminar?: () => Promise<ResultadoDeTerminar>;
  /** «Atrás» en el primer paso o cerrar la vista previa. */
  onSalir: () => void;
  /** Después del cierre, «Continuar». */
  onContinuar?: () => void;
  /**
   * Quién responde: con él el recorrido guarda lo que se escribe en el paso en curso (`renaser.diagnostico.<usuario>.<versión>`)
   * para no perderlo si se cierra la app antes de «Siguiente». Sin él (o en la vista previa) no se guarda nada en el teléfono.
   */
  usuarioId?: string;
  /** Lo que dice el cierre bajo «qué sigue». Sin él, el de la ficha de ingreso (Términos y Día 1). */
  textoQueSigue?: string;
  /** El botón del cierre. Sin él, «Continuar». */
  etiquetaContinuar?: string;
}
