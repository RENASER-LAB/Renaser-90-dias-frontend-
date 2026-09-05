import { IconName } from '../../../components/Icon';

/**
 * Etapa 2 del onboarding que se ve desde el perfil (YO -> MI ONBOARDING -> "Tu proceso completo"):
 * **Cuestionario Profundo**, 8 bloques.
 *
 * ── Por qué los 8 bloques viven en DOS flujos del catálogo (leer antes de "unificarlos") ─────────
 *
 * El producto llama "Cuestionario Profundo" a los 8 bloques de esta pantalla, pero en el catálogo
 * del backend (`renaser.secciones_onboarding`, cargado por `V10__catalogo_onboarding_default.sql`)
 * esas 8 secciones NO están todas bajo el flujo `cuestionario_profundo`:
 *
 *   Bloques 1-5 (Cuerpo, Mente y Patrones, Alma, Negocio y Dinero, Compromiso)
 *       -> flujo `ficha_inicial`
 *   Bloques 6-8 (Energía Vital, Los 3 Guardianes, Estado Mental Profundo)
 *       -> flujo `cuestionario_profundo`
 *
 * Es un desfase de nomenclatura entre el producto y el catálogo heredado, no un error: las 28
 * preguntas de los 8 bloques YA existen en la base con esas claves. Por eso esta pantalla **no
 * necesitó ninguna migración** — solo agregar `cuestionario_profundo` a los flujos que la app pide
 * en `data/catalogoPreguntas.ts`, que hasta ahora solo cargaba `terminos`/`pacto`/`ficha_inicial` y
 * por eso no podía resolver el id de ninguna pregunta de los bloques 6-8.
 *
 * Renombrar/mover secciones en la base para que los 8 bloques queden bajo un solo flujo se
 * descartó: `ficha_inicial` tiene respuestas reales de usuarios colgando de esas secciones, y el
 * `flujo` no participa en el guardado (`clave_pregunta` es UNIQUE en toda la tabla, así que
 * `catalogoPreguntas` resuelve por clave sin importar de qué flujo vino).
 */

/** Un bloque de la pantalla + la sección del catálogo a la que corresponde. */
export interface BloqueCuestionarioProfundo {
  /** 1..8 — el número que se muestra en "Bloque N de 8". */
  readonly numero: number;
  /** Nombre del bloque tal como lo ve la persona. */
  readonly titulo: string;
  /** Texto en cursiva bajo la cabecera. Solo lo tienen los bloques 6 y 7. */
  readonly encabezado?: string;
  readonly icono: IconName;
  /** `flujo` de `renaser.secciones_onboarding` — ver el comentario largo de arriba. */
  readonly flujo: 'ficha_inicial' | 'cuestionario_profundo';
  /** `clave_seccion` de `renaser.secciones_onboarding`. Viaja en `PUT /onboarding/state`. */
  readonly seccion: string;
}

export const BLOQUES_CUESTIONARIO_PROFUNDO: readonly BloqueCuestionarioProfundo[] = [
  { numero: 1, titulo: 'Cuerpo', icono: 'body', flujo: 'ficha_inicial', seccion: 'cuerpo' },
  { numero: 2, titulo: 'Mente y Patrones', icono: 'brain', flujo: 'ficha_inicial', seccion: 'mente_y_patrones' },
  {
    numero: 3,
    titulo: 'Alma, Heridas y Vínculos',
    icono: 'heart',
    flujo: 'ficha_inicial',
    seccion: 'alma_heridas_vinculos',
  },
  { numero: 4, titulo: 'Negocio y Dinero', icono: 'briefcase', flujo: 'ficha_inicial', seccion: 'negocio_y_dinero' },
  { numero: 5, titulo: 'Compromiso', icono: 'diamond', flujo: 'ficha_inicial', seccion: 'compromiso_y_cierre' },
  // OJO con `flujo: 'ficha_inicial'` en los bloques 1 a 5: es una ETIQUETA HEREDADA del catálogo
  // (`V10`), no una relación con la Ficha Inicial que hoy usa la app.
  //
  // Verificado el 2026-09-05, porque el nombre confunde: la Ficha Inicial que se publica tiene 3
  // capítulos (identidad, salud, consentimiento) y escribe otras preguntas — `sleep_hours`,
  // `sleep_quality`, `medication`, `data_consent`, `commitment_90days` y los datos de identidad.
  // NO escribe ninguna de las 29 preguntas de estos 8 bloques. No hay respuestas compartidas y no
  // se pisa nada.
  //
  // El fósil de por qué la etiqueta dice eso está en `components/`: `ChapterCuerpo`, `ChapterMente`,
  // `ChapterAlma`, `ChapterNegocio` y `ChapterCompromiso` existen y no los usa nadie — en un diseño
  // anterior estos cinco bloques vivían dentro de la Ficha Inicial. El flujo del catálogo quedó con
  // el nombre viejo; el producto siguió. Renombrarlo en la base cambiaría la clave con la que ya
  // hay respuestas guardadas, así que se documenta en vez de tocarlo.
  {
    numero: 6,
    titulo: 'Energía Vital',
    encabezado: 'Reconoce tu estado físico y energético actual.',
    icono: 'zap',
    flujo: 'cuestionario_profundo',
    seccion: 'energia_vital',
  },
  {
    numero: 7,
    titulo: 'Los 3 Guardianes',
    encabezado: 'Los 3 Guardianes emocionales: Miedo, Culpa y Vergüenza.',
    icono: 'lock',
    flujo: 'cuestionario_profundo',
    seccion: 'guardianes_emocionales',
  },
  {
    numero: 8,
    titulo: 'Estado Mental Profundo',
    icono: 'bulb',
    flujo: 'cuestionario_profundo',
    seccion: 'estado_mental',
  },
] as const;

export const TOTAL_BLOQUES = BLOQUES_CUESTIONARIO_PROFUNDO.length;

/**
 * Porcentaje mostrado en la cabecera. `Math.round` da exactamente la serie que pidió el dueño
 * (13 / 25 / 38 / 50 / 63 / 75 / 88 / 100), así que no hace falta una tabla de valores a mano.
 */
export function porcentajeDelBloque(numeroDeBloque: number): number {
  return Math.round((numeroDeBloque / TOTAL_BLOQUES) * 100);
}

/**
 * Estado del formulario. Un campo por pregunta del catálogo, plano — el agrupamiento por bloque lo
 * da `mapearBloqueCuestionarioProfundo` (data/mapaPreguntas.ts), que es también el único lugar
 * donde vive la correspondencia campo -> `clave_pregunta`.
 *
 * Los sliders son `number | null` (1..10, escala del catálogo); todo lo demás es `string` porque
 * viene de un `TextInput` — incluida la meta de facturación, que se convierte a número recién al
 * mapear.
 *
 * `null` significa "todavía no respondió", y es distinto de un 5. Ver la nota de
 * `DATOS_INICIALES_CUESTIONARIO_PROFUNDO`.
 */
export interface CuestionarioProfundoData {
  // Bloque 1 — Cuerpo
  objetivoSmartCuerpo: string;
  // Bloque 2 — Mente y Patrones
  criticoInterno: string;
  creenciaLimitante: string;
  definicionHoy: string;
  // Bloque 3 — Alma, Heridas y Vínculos
  fraseParental: string;
  vinculoPadre: number | null;
  vinculoMadre: number | null;
  fraseDineroInfancia: string;
  mereceDinero: number | null;
  porqueMereceDinero: string;
  // Bloque 4 — Negocio y Dinero
  metaFacturacion: string;
  productoEstrella: string;
  clienteIdeal: string;
  enemigoPublico: string;
  objetivoSmartNegocio: string;
  // Bloque 5 — Compromiso
  unaSolaCosa: string;
  bautizoProceso: string;
  // Bloque 6 — Energía Vital
  actividadDrena: string;
  actividadRecarga: string;
  ultimaVezVivo: string;
  // Bloque 7 — Los 3 Guardianes
  miedoIntensidad: number | null;
  miedoDetalle: string;
  culpaIntensidad: number | null;
  culpaDetalle: string;
  verguenzaIntensidad: number | null;
  verguenzaDetalle: string;
  // Bloque 8 — Estado Mental Profundo
  nivelAnsiedad: number | null;
  decisionPostergada: string;
  porqueNoLaTomaste: string;
}

/**
 * Los sliders arrancan SIN RESPONDER (`null`), no en 5.
 *
 * Decisión del dueño (2026-09-05), sobre el diseño original que los dejaba en el medio: un slider
 * que arranca en 5 se guarda como 5 aunque la persona nunca lo haya tocado, y después no hay forma
 * de distinguir "dijo 5" de "ni lo miró". Como estas siete escalas son justamente las que miden
 * vínculos, merecimiento, miedo, culpa, vergüenza y ansiedad, un puñado de 5 inventados ensucia
 * exactamente el dato que el cuestionario existe para conseguir.
 *
 * Consecuencia: los sliders pasan a ser obligatorios como cualquier otro campo con `*` — hay que
 * moverlos para avanzar. Coincide además con la base, donde las 7 escalas son `requerida = true`.
 *
 * El gesto no cambia: `SliderRating` son diez números tocables y manda el que se tocó. Lo único
 * distinto es que, antes del primer toque, no hay ninguno marcado y se muestra un guion.
 */

export const DATOS_INICIALES_CUESTIONARIO_PROFUNDO: CuestionarioProfundoData = {
  objetivoSmartCuerpo: '',
  criticoInterno: '',
  creenciaLimitante: '',
  definicionHoy: '',
  fraseParental: '',
  vinculoPadre: null,
  vinculoMadre: null,
  fraseDineroInfancia: '',
  mereceDinero: null,
  porqueMereceDinero: '',
  metaFacturacion: '',
  productoEstrella: '',
  clienteIdeal: '',
  enemigoPublico: '',
  objetivoSmartNegocio: '',
  unaSolaCosa: '',
  bautizoProceso: '',
  actividadDrena: '',
  actividadRecarga: '',
  ultimaVezVivo: '',
  miedoIntensidad: null,
  miedoDetalle: '',
  culpaIntensidad: null,
  culpaDetalle: '',
  verguenzaIntensidad: null,
  verguenzaDetalle: '',
  nivelAnsiedad: null,
  decisionPostergada: '',
  porqueNoLaTomaste: '',
};

/**
 * Campos obligatorios por bloque (el `*` de las capturas), con el mensaje que se muestra si faltan.
 * Los sliders SÍ están acá desde 2026-09-05: como arrancan sin responder, hay que moverlos igual
 * que hay que escribir en un campo de texto. Antes no estaban porque arrancaban en 5 y nunca podían
 * faltar — y ese era justamente el problema (ver la nota de `DATOS_INICIALES_CUESTIONARIO_PROFUNDO`).
 *
 * Coincide con `preguntas_onboarding.requerida` en la base para las 28 preguntas — verificado
 * contra `V10`: las dos únicas preguntas de estos bloques con `requerida = false` son
 * `money_deserving_reason` ("¿Por qué?") y `postponed_reason` ("¿Por qué no la has tomado?"), que
 * son exactamente las dos que las capturas muestran SIN asterisco.
 */
export const CAMPOS_OBLIGATORIOS: Readonly<
  Record<number, readonly { campo: keyof CuestionarioProfundoData; aviso: string }[]>
> = {
  1: [{ campo: 'objetivoSmartCuerpo', aviso: 'Escribe tu objetivo SMART de Cuerpo a 90 días.' }],
  2: [
    { campo: 'criticoInterno', aviso: 'Escribe qué te dice tu crítico interno cuando fallas.' },
    { campo: 'creenciaLimitante', aviso: 'Escribe tu creencia limitante #1.' },
    { campo: 'definicionHoy', aviso: 'Escribe cómo te defines hoy, en una sola frase.' },
  ],
  3: [
    { campo: 'fraseParental', aviso: 'Escribe la frase de tu padre o madre que aún hoy te marca.' },
    { campo: 'fraseDineroInfancia', aviso: 'Escribe la frase sobre el dinero en tu infancia.' },
    { campo: 'vinculoPadre', aviso: 'Mueve la barra para marcar tu vínculo hoy con tu padre.' },
    { campo: 'vinculoMadre', aviso: 'Mueve la barra para marcar tu vínculo hoy con tu madre.' },
    { campo: 'mereceDinero', aviso: 'Mueve la barra para marcar cuánto sientes que mereces ganar.' },
  ],
  4: [
    { campo: 'metaFacturacion', aviso: 'Escribe tu meta de facturación a 90 días (USD).' },
    { campo: 'productoEstrella', aviso: 'Describe tu producto o servicio estrella.' },
    { campo: 'clienteIdeal', aviso: 'Describe tu cliente ideal.' },
    { campo: 'enemigoPublico', aviso: 'Escribe tu Enemigo Público #1 del negocio.' },
    { campo: 'objetivoSmartNegocio', aviso: 'Escribe tu objetivo SMART de Negocio a 90 días.' },
  ],
  5: [
    { campo: 'unaSolaCosa', aviso: 'Escribe esa única cosa que haría de esta formación un éxito.' },
    { campo: 'bautizoProceso', aviso: 'Ponle nombre a tu reto personal de 90 días.' },
  ],
  6: [
    { campo: 'actividadDrena', aviso: 'Escribe qué actividad te drena más energía hoy.' },
    { campo: 'actividadRecarga', aviso: 'Escribe qué actividad te recarga más.' },
    { campo: 'ultimaVezVivo', aviso: 'Cuenta cuándo fue la última vez que te sentiste plenamente viv@.' },
  ],
  7: [
    { campo: 'miedoDetalle', aviso: 'Escribe de qué tienes más miedo en este momento.' },
    { campo: 'culpaDetalle', aviso: 'Escribe por qué cargas culpa, y con quién.' },
    { campo: 'verguenzaDetalle', aviso: 'Escribe de qué te avergüenzas.' },
    { campo: 'miedoIntensidad', aviso: 'Mueve la barra para marcar qué tan presente está el miedo.' },
    { campo: 'culpaIntensidad', aviso: 'Mueve la barra para marcar qué tan presente está la culpa.' },
    { campo: 'verguenzaIntensidad', aviso: 'Mueve la barra para marcar qué tan presente está la vergüenza.' },
  ],
  8: [
    { campo: 'decisionPostergada', aviso: 'Escribe qué decisión importante llevas postergando.' },
    { campo: 'nivelAnsiedad', aviso: 'Mueve la barra para marcar tu nivel de ansiedad diaria.' },
  ],
};

/**
 * La meta de facturación es la única pregunta NUMERO de los 8 bloques: si no se puede parsear,
 * `mapearBloqueCuestionarioProfundo` la descarta y la respuesta obligatoria nunca llegaría a la
 * base. Se valida acá para avisar en el momento en vez de dejar el hueco en silencio.
 */
export function metaFacturacionEsValida(valor: string): boolean {
  const n = parseFloat(valor.trim());
  return Number.isFinite(n) && n >= 0;
}
