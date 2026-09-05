import {
  FichaIdentidadData,
  FichaInicialData,
  FichaSaludData,
  FichaConsentimientoData,
  RespuestaAgrupadaApi,
  RespuestaPorClaveInput,
  RespuestasAgrupadasApi,
  TipoPreguntaOnboarding,
} from '../types/onboarding.types';
import { CuestionarioProfundoData } from './bloquesCuestionarioProfundo';

/**
 * Correspondencia entre los campos que YA llena el formulario (React) y las preguntas del catálogo
 * del backend (`renaser.preguntas_onboarding`).
 *
 * El mapeo es por `clave_pregunta`, NUNCA por el `id` numérico. Los ids se resuelven en runtime
 * contra `GET /onboarding/questionnaire` — ver `data/catalogoPreguntas.ts`, que explica por qué
 * hardcodearlos rompió el onboarding tres veces seguidas (E-88, E-93 y el fallo "Una respuesta de
 * tipo FIRMA requiere mediaId" del Pacto): los asigna una columna IDENTITY en un `INSERT ... SELECT`
 * sin `ORDER BY`, así que no son reproducibles entre bases de datos.
 *
 * REGLA (CLAUDE.md §0.6): ningún campo se mapea "a ojo". Si la correspondencia no es evidente
 * (el texto de la pregunta no coincide con lo que pide el campo, o las opciones no calzan),
 * el campo se deja SIN mapear acá y se documenta el motivo en `CAMPOS_SIN_MAPEAR` más abajo
 * (y se reporta aparte al dueño de la tarea). Guardar bajo la pregunta equivocada es peor que
 * no guardar nada, porque parece que funcionó.
 *
 * IMPORTANTE — chequeado contra el código real de los componentes, no contra el `type`:
 * `FichaSaludData` y `FichaConsentimientoData` (types/onboarding.types.ts) declaran más campos
 * de los que sus componentes (`ChapterSalud.tsx`, `ChapterConsentimiento.tsx`) en verdad
 * renderizan. Los campos que el `type` tiene pero la UI nunca pregunta (peso, estatura,
 * objetivoSmartSalud, condicionesSalud, dispuestoSoltar, firmaDigital) NO se mapean: no hay
 * ningún valor real que guardar, sería inventar un dato que la persona nunca ingresó.
 */

/**
 * Clave + tipo esperado de una pregunta del catálogo. El `tipo` no es documentación: viaja hasta
 * `catalogoPreguntas.idDe`, que rechaza el envío si el backend dice otra cosa. Es la red que
 * convierte un "se guardó bajo la pregunta equivocada en silencio" en un error explícito.
 */
interface PreguntaCatalogo {
  readonly clave: string;
  readonly tipo: TipoPreguntaOnboarding;
}

// ---- flujo: ficha_inicial · sección: identidad_operativa --------------------------------------
const P_FULL_NAME: PreguntaCatalogo = { clave: 'full_name', tipo: 'TEXTO' };
const P_SEX: PreguntaCatalogo = { clave: 'sex', tipo: 'SELECCION_UNICA' };
const P_CHILDREN_INFO: PreguntaCatalogo = { clave: 'children_info', tipo: 'TEXTO' };
const P_PROFESSION: PreguntaCatalogo = { clave: 'profession', tipo: 'TEXTO' };
const P_IDENTITY_DOCUMENT: PreguntaCatalogo = { clave: 'identity_document', tipo: 'TEXTO' };
const P_BIRTH_DATE: PreguntaCatalogo = { clave: 'birth_date', tipo: 'FECHA' };
const P_WHATSAPP: PreguntaCatalogo = { clave: 'whatsapp', tipo: 'TEXTO' };
const P_EMAIL: PreguntaCatalogo = { clave: 'email', tipo: 'TEXTO' };
const P_COUNTRY: PreguntaCatalogo = { clave: 'country', tipo: 'TEXTO' };
const P_CITY: PreguntaCatalogo = { clave: 'city', tipo: 'TEXTO' };
const P_DISTRICT: PreguntaCatalogo = { clave: 'district', tipo: 'TEXTO' };
const P_ADDRESS_REFERENCE: PreguntaCatalogo = { clave: 'address_reference', tipo: 'AREA_TEXTO' };
const P_EXPECTATIONS: PreguntaCatalogo = { clave: 'expectations', tipo: 'AREA_TEXTO' };
const P_FEARS: PreguntaCatalogo = { clave: 'fears', tipo: 'AREA_TEXTO' };

// ---- flujo: ficha_inicial · sección: cuerpo ----------------------------------------------------
const P_SLEEP_HOURS: PreguntaCatalogo = { clave: 'sleep_hours', tipo: 'NUMERO' };
const P_SLEEP_QUALITY: PreguntaCatalogo = { clave: 'sleep_quality', tipo: 'ESCALA' };
const P_MEDICATION: PreguntaCatalogo = { clave: 'medication', tipo: 'AREA_TEXTO' };

// ---- flujo: ficha_inicial · sección: compromiso_y_cierre ---------------------------------------
const P_DATA_CONSENT: PreguntaCatalogo = { clave: 'data_consent', tipo: 'SELECCION_UNICA' };
const P_COMMITMENT_90DAYS: PreguntaCatalogo = { clave: 'commitment_90days', tipo: 'CASILLA' };

// ---- flujo: terminos · sección: aceptacion ------------------------------------------------------
const P_ACCEPTED_TERMS: PreguntaCatalogo = { clave: 'accepted_terms', tipo: 'CASILLA' };
// FIRMA: no se mapea acá (esta función solo arma valores tipados texto/número/casilla/escala). Se
// guarda aparte, vía el flujo de media de `usePersistenciaOnboarding.guardarFirma` — ver
// PREGUNTA_FIRMA_TERMINOS más abajo y CLAUDE.md de la tarea "firmas del onboarding".
const P_TERMS_SIGNATURE: PreguntaCatalogo = { clave: 'terms_signature', tipo: 'FIRMA' };

// ---- flujo: pacto · sección: firma ---------------------------------------------------------------
const P_PARTICIPANT_NAME: PreguntaCatalogo = { clave: 'participant_name', tipo: 'TEXTO' };
const P_ACCEPTED_PACTO: PreguntaCatalogo = { clave: 'accepted_pacto', tipo: 'CASILLA' };
// FIRMA: ídem P_TERMS_SIGNATURE — ver PREGUNTA_FIRMA_PACTO más abajo.
const P_SIGNATURE: PreguntaCatalogo = { clave: 'signature', tipo: 'FIRMA' };

/**
 * Clave de las 2 preguntas tipo FIRMA del catálogo, para que `TerminosScreen`/`PactoScreen` no
 * repitan el string suelto al llamar a `usePersistenciaOnboarding.guardarFirma`. El dominio
 * (`Respuesta.java`, `SlotValor.SOLO_MEDIA`) exige `mediaId`, nunca un valor tipado, por eso viven
 * fuera de los builders `mapear*` de este archivo (esos arman un valor ya conocido de forma
 * síncrona; una firma primero hay que subirla a S3).
 */
export const PREGUNTA_FIRMA_TERMINOS = { clave: P_TERMS_SIGNATURE.clave } as const;
export const PREGUNTA_FIRMA_PACTO = { clave: P_SIGNATURE.clave } as const;

/**
 * Campos con `type` en la app pero SIN correspondencia confiable — no se mandan al backend.
 * Queda acá, en código, para que sobreviva a la memoria de quien escribió esto.
 */
export const CAMPOS_SIN_MAPEAR = [
  {
    campo: 'FichaIdentidadData.tipoNegocio',
    motivo:
      'Ambiguo entre business_name ("Nombre del negocio") y business_industry ("Industria / Sector"). ' +
      'El campo de la app pide "Nombre de tu negocio o rubro" (ambas cosas a la vez) — mapear a una sola ' +
      'pregunta del catálogo sería adivinar cuál de las dos quiso responder la persona.',
  },
  {
    campo: 'FichaIdentidadData.tipoDocumento',
    motivo:
      'El catálogo solo tiene identity_document para el NÚMERO de documento. No existe una pregunta ' +
      'separada para el TIPO (DNI/Pasaporte/Extranjería); tipoDocumento solo cambia el placeholder/validación ' +
      'del campo numeroDocumento en la UI, no tiene destino propio.',
  },
  {
    campo: 'FichaIdentidadData.codigoPais',
    motivo:
      'Viaja embebido dentro del valor completo que ya manda whatsapp (fullNumber incluye el código de país). ' +
      'No hay una pregunta separada para el código de país en el catálogo.',
  },
  {
    campo: 'FichaIdentidadData.departamento',
    motivo:
      'El catálogo de identidad_operativa solo tiene city y district; no existe un nivel ' +
      '"departamento/provincia" en las 62 preguntas de ficha_inicial.',
  },
  {
    campo: 'FichaIdentidadData.estadoCivil',
    motivo:
      'Existe family_status (SELECCION_UNICA) y el concepto coincide, pero las opciones NO calzan 1:1: ' +
      'la UI ofrece 5 valores que no distinguen hijos ("Soltero(a)", "Casado(a)", "Conviviente", ' +
      '"Divorciado(a)", "Viudo(a)"), mientras que las opciones reales en BD sí distinguen ' +
      '("Soltero/a sin hijos" vs "Soltero/a con hijos", "En pareja sin hijos", "Casado/a con hijos", ' +
      '"Divorciado/a", "Viudo/a" — 6 valores). Traducir un valor de la UI a una opción de la BD sería inventar ' +
      'cuál de las dos variantes eligió la persona (p. ej. "Soltero(a)" -> ¿"sin hijos" o "con hijos"?).',
  },
  {
    campo: 'FichaSaludData.peso / estatura / objetivoSmartSalud / condicionesSalud',
    motivo:
      'weight_kg, height_cm y body_smart_goal SÍ existen en el catálogo (y son REQUERIDAS en ' +
      'BD), pero el capítulo "DESCANSO Y SALUD" de la app (ChapterSalud.tsx) nunca los pregunta — solo pide ' +
      'horas de sueño, calidad de sueño y medicación. No hay valor real que enviar. Reportado como brecha ' +
      'aparte: el catálogo espera estas 3 respuestas y la UI actual no las va a producir nunca.',
  },
  {
    campo: 'FichaSaludData.motivoMedicacion',
    motivo:
      'Duplica especificacionMedicacion (ChapterSalud los setea juntos, mismo texto) — ya cubierto al mapear ' +
      'especificacionMedicacion a medication. Mandarlo también sería la misma respuesta dos veces.',
  },
  {
    campo: 'FichaConsentimientoData.dispuestoSoltar / firmaDigital',
    motivo:
      'ChapterConsentimiento.tsx no renderiza estos dos campos (solo el toggle único de autorizaUsoDatos + ' +
      'compromiso90Dias). willing_to_release existe en el catálogo pero no hay valor real que enviar.',
  },
] as const;

/**
 * Actualizado 2026-09-01: `terms_signature` y `signature` — firmas de Términos y del
 * Pacto — DEJARON de estar sin mapear. S3 ya está activo; ahora viajan por el flujo de media
 * (`POST /onboarding/media/upload-url` -> `PUT` a S3 -> `POST /onboarding/media` -> `POST
 * /onboarding/answers` con el `mediaId`), implementado en
 * `usePersistenciaOnboarding.guardarFirma` y llamado desde `TerminosScreen`/`PactoScreen` al
 * confirmar la firma. No están en `CAMPOS_SIN_MAPEAR` de arriba porque sí tienen mapeo — solo que
 * no es uno de los builders `texto`/`numero`/`casilla`/`escala` de este archivo (esos asumen un
 * valor ya conocido de forma síncrona; una firma primero hay que subirla).
 */

// ------------------------------------------------------------------------------------------------
// Helpers de conversión de valor
// ------------------------------------------------------------------------------------------------

/** DatePickerField guarda "DD/MM/AAAA" (ver components/DatePickerField.tsx); el backend espera ISO-8601. */
function fechaDdMmAaaaAIso(fecha: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha.trim());
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  return `${aaaa}-${mm}-${dd}`;
}

/** Inversa de `fechaDdMmAaaaAIso`, para rehidratar `birth_date` (ISO) de vuelta a lo que espera DatePickerField. */
function fechaIsoADdMmAaaa(fechaIso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaIso.trim());
  if (!m) return null;
  const [, aaaa, mm, dd] = m;
  return `${dd}/${mm}/${aaaa}`;
}

/**
 * Identifica la pregunta destino. El `id` numérico NO se decide acá: lo resuelve
 * `usePersistenciaOnboarding` contra el catálogo real justo antes de enviar (ver
 * `data/catalogoPreguntas.ts`).
 */
function ref(pregunta: PreguntaCatalogo): { clave: string; tipoEsperado: TipoPreguntaOnboarding } {
  return { clave: pregunta.clave, tipoEsperado: pregunta.tipo };
}

function texto(pregunta: PreguntaCatalogo, valor: string | undefined | null): RespuestaPorClaveInput | null {
  const v = (valor ?? '').trim();
  return v ? { ...ref(pregunta), textValue: v } : null;
}

function numero(pregunta: PreguntaCatalogo, valor: string | undefined | null): RespuestaPorClaveInput | null {
  const n = parseFloat((valor ?? '').trim());
  return Number.isFinite(n) ? { ...ref(pregunta), numberValue: n } : null;
}

function escala(pregunta: PreguntaCatalogo, valor: number | undefined | null): RespuestaPorClaveInput | null {
  if (valor === undefined || valor === null || !Number.isFinite(valor)) return null;
  const v = Math.round(Math.max(1, Math.min(10, valor)));
  return { ...ref(pregunta), scaleValue: v };
}

function casilla(pregunta: PreguntaCatalogo, valor: boolean | undefined | null): RespuestaPorClaveInput | null {
  if (valor === undefined || valor === null) return null;
  return { ...ref(pregunta), booleanValue: valor };
}

function soloDefinidos(items: (RespuestaPorClaveInput | null)[]): RespuestaPorClaveInput[] {
  return items.filter((i): i is RespuestaPorClaveInput => i !== null);
}

// ------------------------------------------------------------------------------------------------
// Builders — un campo del formulario en el estado ya validado por FichaInicialScreen -> respuestas
// ------------------------------------------------------------------------------------------------

/** Capítulo 1 (IDENTIDAD Y FAMILIA) -> sección `identidad_operativa` del flujo `ficha_inicial`. */
export function mapearIdentidad(data: FichaIdentidadData): RespuestaPorClaveInput[] {
  const fechaIso = fechaDdMmAaaaAIso(data.fechaNacimiento);
  return soloDefinidos([
    texto(P_FULL_NAME, data.nombre),
    texto(P_SEX, data.sexo || undefined),
    texto(P_CHILDREN_INFO, data.cantidadHijos),
    texto(P_PROFESSION, data.ocupacion),
    texto(P_IDENTITY_DOCUMENT, data.numeroDocumento),
    fechaIso ? { ...ref(P_BIRTH_DATE), textValue: fechaIso } : null,
    texto(P_WHATSAPP, data.whatsapp),
    texto(P_EMAIL, data.email),
    texto(P_COUNTRY, data.pais),
    texto(P_CITY, data.ciudad),
    texto(P_DISTRICT, data.distrito),
    texto(P_ADDRESS_REFERENCE, data.direccion),
    texto(P_EXPECTATIONS, data.expectativa),
    texto(P_FEARS, data.temor),
  ]);
}

/** Capítulo 2 (DESCANSO Y SALUD) -> sección `cuerpo` del flujo `ficha_inicial` (solo lo que la UI pregunta). */
export function mapearSalud(data: FichaSaludData): RespuestaPorClaveInput[] {
  // medication es requerida en BD: si la persona respondió "No" a "¿tomas medicación regular?"
  // se manda un valor explícito de "ninguna" en vez de dejar la pregunta obligatoria sin responder.
  const medicacion = data.tomaMedicacionRegular
    ? (data.especificacionMedicacion || '').trim()
    : 'Ninguna';
  return soloDefinidos([
    numero(P_SLEEP_HOURS, data.horasSueno),
    escala(P_SLEEP_QUALITY, data.calidadSueno),
    medicacion ? { ...ref(P_MEDICATION), textValue: medicacion } : null,
  ]);
}

/** Capítulo 3 (CONSENTIMIENTO Y COMPROMISO) -> sección `compromiso_y_cierre` del flujo `ficha_inicial`. */
export function mapearConsentimiento(data: FichaConsentimientoData): RespuestaPorClaveInput[] {
  // data_consent es SELECCION_UNICA con solo 2 opciones reales en BD; el toggle único de la UI es
  // booleano, así que se traduce al texto exacto de la opción correspondiente (no hay ambigüedad:
  // son las únicas 2 opciones que existen para esta pregunta).
  const opcionConsentimiento = data.autorizaUsoDatos
    ? 'Sí, autorizo el uso responsable de mis datos personales.'
    : 'No autorizo el uso de mis datos.';
  return soloDefinidos([
    { ...ref(P_DATA_CONSENT), textValue: opcionConsentimiento },
    casilla(P_COMMITMENT_90DAYS, data.compromiso90Dias),
  ]);
}

/** Pantalla de Términos y Condiciones -> flujo `terminos`, sección `aceptacion`. */
export function mapearTerminos(aceptado: boolean): RespuestaPorClaveInput[] {
  return soloDefinidos([casilla(P_ACCEPTED_TERMS, aceptado)]);
}

/**
 * Pantalla del Pacto -> flujo `pacto`, sección `firma`.
 *
 * Nota sobre accepted_pacto: la UI de PactoScreen no tiene una casilla separada de "he leído
 * el pacto" — toda la pantalla ES el pacto, y la única acción es dibujar la firma y tocar
 * "Confirmar mi firma". Se asume accepted_pacto = true en ese momento porque no existe ningún otro
 * gesto en la pantalla al que atarlo; es la misma decisión, a nivel de dato, que ya toma el flujo al
 * mandar los milestones PACTO + PACTO_FIRMADO juntos sobre esta misma acción. Asunción explícita
 * para que el dueño del producto la confirme o la corrija.
 */
export function mapearPacto(nombreParticipante: string): RespuestaPorClaveInput[] {
  return soloDefinidos([
    texto(P_PARTICIPANT_NAME, nombreParticipante),
    casilla(P_ACCEPTED_PACTO, true),
  ]);
}

// ------------------------------------------------------------------------------------------------
// Rehidratación — inversa de mapearIdentidad/mapearSalud/mapearConsentimiento, para reconstruir la
// Ficha Inicial a partir de lo que ya está guardado en el backend (GET /onboarding/answers). Se usa
// cuando no hay borrador local (AsyncStorage) — ver FichaInicialScreen y almacenamientoLocal.ts.
// ------------------------------------------------------------------------------------------------

/**
 * Solo reconstruye los campos que SÍ tienen pregunta propia en el catálogo (ver `mapearIdentidad`/
 * `mapearSalud`/`mapearConsentimiento` arriba y `CAMPOS_SIN_MAPEAR`). Los que nunca se mandaron
 * (tipoNegocio, tipoDocumento, codigoPais, departamento, peso, estatura, etc.) quedan tal como
 * venían en `base` — no hay de dónde recuperarlos, y no es este el lugar para inventarlos.
 */
export function reconstruirFichaDesdeRespuestas(
  respuestas: RespuestasAgrupadasApi,
  base: FichaInicialData
): FichaInicialData {
  const porClave = new Map<string, RespuestaAgrupadaApi>();
  for (const seccion of respuestas.sections) {
    for (const r of seccion.answers) {
      porClave.set(r.questionKey, r);
    }
  }
  const texto = (clave: string): string | undefined => porClave.get(clave)?.textValue ?? undefined;
  const numero = (clave: string): number | undefined => porClave.get(clave)?.numberValue ?? undefined;
  const booleano = (clave: string): boolean | undefined => porClave.get(clave)?.booleanValue ?? undefined;
  const escala = (clave: string): number | undefined => porClave.get(clave)?.scaleValue ?? undefined;

  const fechaNacimientoIso = texto(P_BIRTH_DATE.clave);
  const fechaNacimiento = fechaNacimientoIso ? fechaIsoADdMmAaaa(fechaNacimientoIso) : null;

  // medication es requerida en BD: mapearSalud manda 'Ninguna' cuando la persona respondió
  // "No" a la medicación regular — hay que deshacer esa codificación acá.
  const medicacion = texto(P_MEDICATION.clave);
  const tomaMedicacionRegular = medicacion !== undefined ? medicacion !== 'Ninguna' : undefined;

  const consentimientoTexto = texto(P_DATA_CONSENT.clave);

  return {
    identidad: {
      ...base.identidad,
      nombre: texto(P_FULL_NAME.clave) ?? base.identidad.nombre,
      sexo: (texto(P_SEX.clave) as FichaIdentidadData['sexo'] | undefined) ?? base.identidad.sexo,
      cantidadHijos: texto(P_CHILDREN_INFO.clave) ?? base.identidad.cantidadHijos,
      ocupacion: texto(P_PROFESSION.clave) ?? base.identidad.ocupacion,
      numeroDocumento: texto(P_IDENTITY_DOCUMENT.clave) ?? base.identidad.numeroDocumento,
      fechaNacimiento: fechaNacimiento ?? base.identidad.fechaNacimiento,
      whatsapp: texto(P_WHATSAPP.clave) ?? base.identidad.whatsapp,
      email: texto(P_EMAIL.clave) ?? base.identidad.email,
      pais: texto(P_COUNTRY.clave) ?? base.identidad.pais,
      ciudad: texto(P_CITY.clave) ?? base.identidad.ciudad,
      distrito: texto(P_DISTRICT.clave) ?? base.identidad.distrito,
      direccion: texto(P_ADDRESS_REFERENCE.clave) ?? base.identidad.direccion,
      expectativa: texto(P_EXPECTATIONS.clave) ?? base.identidad.expectativa,
      temor: texto(P_FEARS.clave) ?? base.identidad.temor,
    },
    salud: {
      ...base.salud,
      horasSueno: numero(P_SLEEP_HOURS.clave) !== undefined ? String(numero(P_SLEEP_HOURS.clave)) : base.salud.horasSueno,
      calidadSueno: escala(P_SLEEP_QUALITY.clave) ?? base.salud.calidadSueno,
      tomaMedicacionRegular: tomaMedicacionRegular ?? base.salud.tomaMedicacionRegular,
      especificacionMedicacion:
        tomaMedicacionRegular && medicacion !== undefined ? medicacion : base.salud.especificacionMedicacion,
    },
    consentimiento: {
      ...base.consentimiento,
      autorizaUsoDatos: consentimientoTexto !== undefined ? consentimientoTexto.startsWith('Sí') : base.consentimiento.autorizaUsoDatos,
      compromiso90Dias: booleano(P_COMMITMENT_90DAYS.clave) ?? base.consentimiento.compromiso90Dias,
    },
  };
}

// ================================================================================================
// ETAPA 2 DEL ONBOARDING — CUESTIONARIO PROFUNDO (8 bloques)
// ================================================================================================
//
// Las 29 preguntas de los 8 bloques YA existen en el catálogo (`V10__catalogo_onboarding_default.sql`).
// Ninguna hizo falta crearla: esta sección solo declara la correspondencia campo -> clave.
//
// Los `tipo` de acá NO son decorativos y NO se eligieron por cómo se ve el campo en pantalla: son
// los que la base tiene en `preguntas_onboarding.tipo`, y `catalogoPreguntas.idDe` RECHAZA el envío
// si no coinciden. El caso que más confunde: `energy_drains` y `energy_recharges` se dibujan como
// input de una línea (así están en las capturas del dueño) pero en la base son AREA_TEXTO — manda
// la base, porque es lo que decide el slot EAV donde se guarda el valor.
//
// Recordatorio de por qué el `flujo` no aparece acá: `clave_pregunta` es UNIQUE en toda la tabla,
// así que el mapa plano de `catalogoPreguntas` resuelve la clave sin importar de qué flujo vino.
// Ver el comentario largo de `data/bloquesCuestionarioProfundo.ts` sobre los dos flujos.

// ---- Bloque 1 · Cuerpo (flujo ficha_inicial · sección cuerpo) ----------------------------------
const P_BODY_SMART_GOAL: PreguntaCatalogo = { clave: 'body_smart_goal', tipo: 'AREA_TEXTO' };

// ---- Bloque 2 · Mente y Patrones (ficha_inicial · mente_y_patrones) ----------------------------
const P_INNER_CRITIC_VOICE: PreguntaCatalogo = { clave: 'inner_critic_voice', tipo: 'AREA_TEXTO' };
const P_LIMITING_BELIEF: PreguntaCatalogo = { clave: 'limiting_belief', tipo: 'AREA_TEXTO' };
const P_SELF_DEFINITION_TODAY: PreguntaCatalogo = { clave: 'self_definition_today', tipo: 'TEXTO' };

// ---- Bloque 3 · Alma, Heridas y Vínculos (ficha_inicial · alma_heridas_vinculos) ---------------
const P_PARENTAL_PHRASE: PreguntaCatalogo = { clave: 'parental_phrase', tipo: 'TEXTO' };
const P_BOND_FATHER: PreguntaCatalogo = { clave: 'bond_father', tipo: 'ESCALA' };
const P_BOND_MOTHER: PreguntaCatalogo = { clave: 'bond_mother', tipo: 'ESCALA' };
const P_MONEY_CHILDHOOD_PHRASE: PreguntaCatalogo = { clave: 'money_childhood_phrase', tipo: 'TEXTO' };
const P_MONEY_DESERVING_SCORE: PreguntaCatalogo = { clave: 'money_deserving_score', tipo: 'ESCALA' };
const P_MONEY_DESERVING_REASON: PreguntaCatalogo = { clave: 'money_deserving_reason', tipo: 'AREA_TEXTO' };

// ---- Bloque 4 · Negocio y Dinero (ficha_inicial · negocio_y_dinero) ----------------------------
const P_REVENUE_TARGET_90D_USD: PreguntaCatalogo = { clave: 'revenue_target_90d_usd', tipo: 'NUMERO' };
const P_FLAGSHIP_PRODUCT: PreguntaCatalogo = { clave: 'flagship_product', tipo: 'AREA_TEXTO' };
const P_IDEAL_CLIENT: PreguntaCatalogo = { clave: 'ideal_client', tipo: 'AREA_TEXTO' };
const P_BUSINESS_ENEMY: PreguntaCatalogo = { clave: 'business_enemy', tipo: 'AREA_TEXTO' };
const P_BUSINESS_SMART_GOAL: PreguntaCatalogo = { clave: 'business_smart_goal', tipo: 'AREA_TEXTO' };

// ---- Bloque 5 · Compromiso (ficha_inicial · compromiso_y_cierre) -------------------------------
const P_ONE_SUCCESS_METRIC: PreguntaCatalogo = { clave: 'one_success_metric', tipo: 'AREA_TEXTO' };
const P_PROCESS_BAPTISM: PreguntaCatalogo = { clave: 'process_baptism', tipo: 'TEXTO' };

// ---- Bloque 6 · Energía Vital (cuestionario_profundo · energia_vital) --------------------------
const P_ENERGY_DRAINS: PreguntaCatalogo = { clave: 'energy_drains', tipo: 'AREA_TEXTO' };
const P_ENERGY_RECHARGES: PreguntaCatalogo = { clave: 'energy_recharges', tipo: 'AREA_TEXTO' };
const P_LAST_FULLY_ALIVE: PreguntaCatalogo = { clave: 'last_fully_alive', tipo: 'AREA_TEXTO' };

// ---- Bloque 7 · Los 3 Guardianes (cuestionario_profundo · guardianes_emocionales) --------------
const P_FEAR_INTENSITY: PreguntaCatalogo = { clave: 'fear_intensity', tipo: 'ESCALA' };
const P_FEAR_ABOUT: PreguntaCatalogo = { clave: 'fear_about', tipo: 'AREA_TEXTO' };
const P_GUILT_INTENSITY: PreguntaCatalogo = { clave: 'guilt_intensity', tipo: 'ESCALA' };
const P_GUILT_ABOUT: PreguntaCatalogo = { clave: 'guilt_about', tipo: 'AREA_TEXTO' };
const P_SHAME_INTENSITY: PreguntaCatalogo = { clave: 'shame_intensity', tipo: 'ESCALA' };
const P_SHAME_ABOUT: PreguntaCatalogo = { clave: 'shame_about', tipo: 'AREA_TEXTO' };

// ---- Bloque 8 · Estado Mental Profundo (cuestionario_profundo · estado_mental) -----------------
const P_ANXIETY_LEVEL: PreguntaCatalogo = { clave: 'anxiety_level', tipo: 'ESCALA' };
const P_POSTPONED_DECISION: PreguntaCatalogo = { clave: 'postponed_decision', tipo: 'AREA_TEXTO' };
const P_POSTPONED_REASON: PreguntaCatalogo = { clave: 'postponed_reason', tipo: 'AREA_TEXTO' };

/**
 * Respuestas de UN bloque del Cuestionario Profundo, listas para `POST /onboarding/answers`.
 *
 * Se mapea bloque por bloque (no los 8 juntos) porque el guardado es incremental: la pantalla
 * llama a esto en cada "Continuar", así que abandonar en el bloque 5 deja los 4 anteriores ya
 * guardados. Mismo criterio que `FichaInicialScreen` con sus capítulos.
 *
 * Un campo vacío devuelve `null` y se descarta (`soloDefinidos`): no se manda cadena vacía a la
 * base. Los obligatorios ya los frenó la validación de la pantalla antes de llegar acá.
 */
export function mapearBloqueCuestionarioProfundo(
  numeroDeBloque: number,
  data: CuestionarioProfundoData
): RespuestaPorClaveInput[] {
  switch (numeroDeBloque) {
    case 1:
      return soloDefinidos([texto(P_BODY_SMART_GOAL, data.objetivoSmartCuerpo)]);
    case 2:
      return soloDefinidos([
        texto(P_INNER_CRITIC_VOICE, data.criticoInterno),
        texto(P_LIMITING_BELIEF, data.creenciaLimitante),
        texto(P_SELF_DEFINITION_TODAY, data.definicionHoy),
      ]);
    case 3:
      return soloDefinidos([
        texto(P_PARENTAL_PHRASE, data.fraseParental),
        escala(P_BOND_FATHER, data.vinculoPadre),
        escala(P_BOND_MOTHER, data.vinculoMadre),
        texto(P_MONEY_CHILDHOOD_PHRASE, data.fraseDineroInfancia),
        escala(P_MONEY_DESERVING_SCORE, data.mereceDinero),
        texto(P_MONEY_DESERVING_REASON, data.porqueMereceDinero),
      ]);
    case 4:
      return soloDefinidos([
        numero(P_REVENUE_TARGET_90D_USD, data.metaFacturacion),
        texto(P_FLAGSHIP_PRODUCT, data.productoEstrella),
        texto(P_IDEAL_CLIENT, data.clienteIdeal),
        texto(P_BUSINESS_ENEMY, data.enemigoPublico),
        texto(P_BUSINESS_SMART_GOAL, data.objetivoSmartNegocio),
      ]);
    case 5:
      return soloDefinidos([
        texto(P_ONE_SUCCESS_METRIC, data.unaSolaCosa),
        texto(P_PROCESS_BAPTISM, data.bautizoProceso),
      ]);
    case 6:
      return soloDefinidos([
        texto(P_ENERGY_DRAINS, data.actividadDrena),
        texto(P_ENERGY_RECHARGES, data.actividadRecarga),
        texto(P_LAST_FULLY_ALIVE, data.ultimaVezVivo),
      ]);
    case 7:
      return soloDefinidos([
        escala(P_FEAR_INTENSITY, data.miedoIntensidad),
        texto(P_FEAR_ABOUT, data.miedoDetalle),
        escala(P_GUILT_INTENSITY, data.culpaIntensidad),
        texto(P_GUILT_ABOUT, data.culpaDetalle),
        escala(P_SHAME_INTENSITY, data.verguenzaIntensidad),
        texto(P_SHAME_ABOUT, data.verguenzaDetalle),
      ]);
    case 8:
      return soloDefinidos([
        escala(P_ANXIETY_LEVEL, data.nivelAnsiedad),
        texto(P_POSTPONED_DECISION, data.decisionPostergada),
        texto(P_POSTPONED_REASON, data.porqueNoLaTomaste),
      ]);
    default:
      // Un número de bloque fuera de 1..8 es un error de programación, no un dato del usuario.
      // Devolver [] en silencio haría que el bloque "se guarde" sin mandar nada.
      throw new Error(`Bloque de Cuestionario Profundo inexistente: ${numeroDeBloque}`);
  }
}

/**
 * Inversa de `mapearBloqueCuestionarioProfundo`: reconstruye el formulario con lo que ya está
 * guardado en el backend, para que volver a entrar a la etapa 2 muestre lo respondido y no un
 * formulario en blanco.
 *
 * Recibe las respuestas de los DOS flujos (bloques 1-5 viven en `ficha_inicial` y 6-8 en
 * `cuestionario_profundo`, ver `bloquesCuestionarioProfundo.ts`), así que la pantalla hace dos
 * `GET /onboarding/answers` y pasa las dos acá.
 *
 * Un campo sin respuesta guardada conserva el valor de `base` — en particular, los sliders se
 * quedan en su 5 por defecto en vez de caer a 0 o a NaN.
 */
export function reconstruirCuestionarioProfundoDesdeRespuestas(
  respuestasPorFlujo: readonly RespuestasAgrupadasApi[],
  base: CuestionarioProfundoData
): CuestionarioProfundoData {
  const porClave = new Map<string, RespuestaAgrupadaApi>();
  for (const respuestas of respuestasPorFlujo) {
    for (const seccion of respuestas.sections) {
      for (const r of seccion.answers) {
        porClave.set(r.questionKey, r);
      }
    }
  }
  const valorTexto = (clave: string): string | undefined => porClave.get(clave)?.textValue ?? undefined;
  const valorEscala = (clave: string): number | undefined => porClave.get(clave)?.scaleValue ?? undefined;
  const valorNumero = (clave: string): number | undefined => porClave.get(clave)?.numberValue ?? undefined;

  const metaFacturacion = valorNumero(P_REVENUE_TARGET_90D_USD.clave);

  return {
    objetivoSmartCuerpo: valorTexto(P_BODY_SMART_GOAL.clave) ?? base.objetivoSmartCuerpo,
    criticoInterno: valorTexto(P_INNER_CRITIC_VOICE.clave) ?? base.criticoInterno,
    creenciaLimitante: valorTexto(P_LIMITING_BELIEF.clave) ?? base.creenciaLimitante,
    definicionHoy: valorTexto(P_SELF_DEFINITION_TODAY.clave) ?? base.definicionHoy,
    fraseParental: valorTexto(P_PARENTAL_PHRASE.clave) ?? base.fraseParental,
    vinculoPadre: valorEscala(P_BOND_FATHER.clave) ?? base.vinculoPadre,
    vinculoMadre: valorEscala(P_BOND_MOTHER.clave) ?? base.vinculoMadre,
    fraseDineroInfancia: valorTexto(P_MONEY_CHILDHOOD_PHRASE.clave) ?? base.fraseDineroInfancia,
    mereceDinero: valorEscala(P_MONEY_DESERVING_SCORE.clave) ?? base.mereceDinero,
    porqueMereceDinero: valorTexto(P_MONEY_DESERVING_REASON.clave) ?? base.porqueMereceDinero,
    metaFacturacion: metaFacturacion !== undefined ? String(metaFacturacion) : base.metaFacturacion,
    productoEstrella: valorTexto(P_FLAGSHIP_PRODUCT.clave) ?? base.productoEstrella,
    clienteIdeal: valorTexto(P_IDEAL_CLIENT.clave) ?? base.clienteIdeal,
    enemigoPublico: valorTexto(P_BUSINESS_ENEMY.clave) ?? base.enemigoPublico,
    objetivoSmartNegocio: valorTexto(P_BUSINESS_SMART_GOAL.clave) ?? base.objetivoSmartNegocio,
    unaSolaCosa: valorTexto(P_ONE_SUCCESS_METRIC.clave) ?? base.unaSolaCosa,
    bautizoProceso: valorTexto(P_PROCESS_BAPTISM.clave) ?? base.bautizoProceso,
    actividadDrena: valorTexto(P_ENERGY_DRAINS.clave) ?? base.actividadDrena,
    actividadRecarga: valorTexto(P_ENERGY_RECHARGES.clave) ?? base.actividadRecarga,
    ultimaVezVivo: valorTexto(P_LAST_FULLY_ALIVE.clave) ?? base.ultimaVezVivo,
    miedoIntensidad: valorEscala(P_FEAR_INTENSITY.clave) ?? base.miedoIntensidad,
    miedoDetalle: valorTexto(P_FEAR_ABOUT.clave) ?? base.miedoDetalle,
    culpaIntensidad: valorEscala(P_GUILT_INTENSITY.clave) ?? base.culpaIntensidad,
    culpaDetalle: valorTexto(P_GUILT_ABOUT.clave) ?? base.culpaDetalle,
    verguenzaIntensidad: valorEscala(P_SHAME_INTENSITY.clave) ?? base.verguenzaIntensidad,
    verguenzaDetalle: valorTexto(P_SHAME_ABOUT.clave) ?? base.verguenzaDetalle,
    nivelAnsiedad: valorEscala(P_ANXIETY_LEVEL.clave) ?? base.nivelAnsiedad,
    decisionPostergada: valorTexto(P_POSTPONED_DECISION.clave) ?? base.decisionPostergada,
    porqueNoLaTomaste: valorTexto(P_POSTPONED_REASON.clave) ?? base.porqueNoLaTomaste,
  };
}
