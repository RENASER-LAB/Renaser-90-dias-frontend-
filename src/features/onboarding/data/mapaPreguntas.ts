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
