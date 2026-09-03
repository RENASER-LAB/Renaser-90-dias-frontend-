import {
  FichaIdentidadData,
  FichaInicialData,
  FichaSaludData,
  FichaConsentimientoData,
  GuardarRespuestaInput,
  RespuestaAgrupadaApi,
  RespuestasAgrupadasApi,
} from '../types/onboarding.types';

/**
 * Correspondencia entre los campos que YA llena el formulario (React) y las preguntas del
 * catálogo del backend (`renaser.preguntas_onboarding`). Consultada en vivo contra la base local
 * el 2026-09-01 con:
 *
 *   SELECT s.clave_seccion, p.id, p.clave_pregunta, p.tipo, p.requerida, p.texto
 *   FROM renaser.preguntas_onboarding p JOIN renaser.secciones_onboarding s ON s.id = p.seccion_id
 *   WHERE s.flujo = 'ficha_inicial' ORDER BY s.orden, p.orden;
 *
 * REGLA (CLAUDE.md §0.6): ningún campo se mapea "a ojo". Si la correspondencia no es evidente
 * (el texto de la pregunta no coincide con lo que pide el campo, o las opciones no calzan),
 * el campo se deja SIN mapear acá y se documenta el motivo en `mapaPreguntas.README` más abajo
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

/** Id de pregunta + tipo, tal como está en el catálogo — para que el tipo de dato se audite de un vistazo. */
interface PreguntaCatalogo {
  readonly id: number;
  readonly clave: string;
  readonly tipo: 'TEXTO' | 'AREA_TEXTO' | 'NUMERO' | 'FECHA' | 'SELECCION_UNICA' | 'ESCALA' | 'CASILLA' | 'FIRMA';
}

// ---- flujo: ficha_inicial · sección: identidad_operativa --------------------------------------
// Actualizado 2026-09-03: los IDs de acá abajo se corrieron en +1 respecto a los de 2026-09-01
// (reseed de `preguntas_onboarding` — ver E-88 en BITACORA_ERRORES.md del backend). Vueltos a
// consultar en vivo contra la base local con la misma query del comentario de arriba del archivo.
const P_FULL_NAME: PreguntaCatalogo = { id: 27, clave: 'full_name', tipo: 'TEXTO' };
const P_SEX: PreguntaCatalogo = { id: 6, clave: 'sex', tipo: 'SELECCION_UNICA' };
const P_CHILDREN_INFO: PreguntaCatalogo = { id: 21, clave: 'children_info', tipo: 'TEXTO' };
const P_PROFESSION: PreguntaCatalogo = { id: 31, clave: 'profession', tipo: 'TEXTO' };
const P_IDENTITY_DOCUMENT: PreguntaCatalogo = { id: 15, clave: 'identity_document', tipo: 'TEXTO' };
const P_BIRTH_DATE: PreguntaCatalogo = { id: 13, clave: 'birth_date', tipo: 'FECHA' };
const P_WHATSAPP: PreguntaCatalogo = { id: 28, clave: 'whatsapp', tipo: 'TEXTO' };
const P_EMAIL: PreguntaCatalogo = { id: 26, clave: 'email', tipo: 'TEXTO' };
const P_COUNTRY: PreguntaCatalogo = { id: 32, clave: 'country', tipo: 'TEXTO' };
const P_CITY: PreguntaCatalogo = { id: 25, clave: 'city', tipo: 'TEXTO' };
const P_DISTRICT: PreguntaCatalogo = { id: 12, clave: 'district', tipo: 'TEXTO' };
const P_ADDRESS_REFERENCE: PreguntaCatalogo = { id: 7, clave: 'address_reference', tipo: 'AREA_TEXTO' };
const P_EXPECTATIONS: PreguntaCatalogo = { id: 30, clave: 'expectations', tipo: 'AREA_TEXTO' };
const P_FEARS: PreguntaCatalogo = { id: 29, clave: 'fears', tipo: 'AREA_TEXTO' };

// ---- flujo: ficha_inicial · sección: cuerpo ----------------------------------------------------
const P_SLEEP_HOURS: PreguntaCatalogo = { id: 36, clave: 'sleep_hours', tipo: 'NUMERO' };
const P_SLEEP_QUALITY: PreguntaCatalogo = { id: 35, clave: 'sleep_quality', tipo: 'ESCALA' };
const P_MEDICATION: PreguntaCatalogo = { id: 34, clave: 'medication', tipo: 'AREA_TEXTO' };

// ---- flujo: ficha_inicial · sección: compromiso_y_cierre ---------------------------------------
const P_DATA_CONSENT: PreguntaCatalogo = { id: 59, clave: 'data_consent', tipo: 'SELECCION_UNICA' };
const P_COMMITMENT_90DAYS: PreguntaCatalogo = { id: 65, clave: 'commitment_90days', tipo: 'CASILLA' };

// ---- flujo: terminos · sección: aceptacion ------------------------------------------------------
const P_ACCEPTED_TERMS: PreguntaCatalogo = { id: 2, clave: 'accepted_terms', tipo: 'CASILLA' };
// FIRMA: no se mapea acá (esta función solo arma valores tipados texto/número/casilla/escala). Se
// guarda aparte, vía el flujo de media de `usePersistenciaOnboarding.guardarFirma` — ver
// PREGUNTA_FIRMA_TERMINOS más abajo y CLAUDE.md de la tarea "firmas del onboarding".
const P_TERMS_SIGNATURE: PreguntaCatalogo = { id: 1, clave: 'terms_signature', tipo: 'FIRMA' };

// ---- flujo: pacto · sección: firma ---------------------------------------------------------------
const P_PARTICIPANT_NAME: PreguntaCatalogo = { id: 5, clave: 'participant_name', tipo: 'TEXTO' };
const P_ACCEPTED_PACTO: PreguntaCatalogo = { id: 3, clave: 'accepted_pacto', tipo: 'CASILLA' };
// FIRMA: ídem P_TERMS_SIGNATURE — ver PREGUNTA_FIRMA_PACTO más abajo.
const P_SIGNATURE: PreguntaCatalogo = { id: 4, clave: 'signature', tipo: 'FIRMA' };

/**
 * Id + clave de las 2 preguntas tipo FIRMA del catálogo, para que `TerminosScreen`/`PactoScreen`
 * no tengan que hardcodear el `id` al llamar a `usePersistenciaOnboarding.guardarFirma` — un solo
 * lugar que auditar si el catálogo cambia. El dominio (`Respuesta.java`, `SlotValor.SOLO_MEDIA`)
 * exige `mediaId`, nunca un valor tipado, por eso viven fuera de los builders `mapear*` de este
 * archivo (esos solo devuelven `GuardarRespuestaInput` con valores ya conocidos en el momento).
 */
export const PREGUNTA_FIRMA_TERMINOS = { id: P_TERMS_SIGNATURE.id, clave: P_TERMS_SIGNATURE.clave } as const;
export const PREGUNTA_FIRMA_PACTO = { id: P_SIGNATURE.id, clave: P_SIGNATURE.clave } as const;

/**
 * Campos con `type` en la app pero SIN correspondencia confiable — no se mandan al backend.
 * Queda acá, en código, para que sobreviva a la memoria de quien escribió esto.
 */
export const CAMPOS_SIN_MAPEAR = [
  {
    campo: 'FichaIdentidadData.tipoNegocio',
    motivo:
      'Ambiguo entre business_name (19, "Nombre del negocio") y business_industry (8, "Industria / Sector"). ' +
      'El campo de la app pide "Nombre de tu negocio o rubro" (ambas cosas a la vez) — mapear a una sola ' +
      'pregunta del catálogo sería adivinar cuál de las dos quiso responder la persona.',
  },
  {
    campo: 'FichaIdentidadData.tipoDocumento',
    motivo:
      'El catálogo solo tiene identity_document (15) para el NÚMERO de documento. No existe una pregunta ' +
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
      'El catálogo de identidad_operativa solo tiene city (25) y district (12); no existe un nivel ' +
      '"departamento/provincia" en las 62 preguntas de ficha_inicial.',
  },
  {
    campo: 'FichaIdentidadData.estadoCivil',
    motivo:
      'Existe family_status (24, SELECCION_UNICA) y el concepto coincide, pero las opciones NO calzan 1:1: ' +
      'la UI ofrece 5 valores que no distinguen hijos ("Soltero(a)", "Casado(a)", "Conviviente", ' +
      '"Divorciado(a)", "Viudo(a)"), mientras que las opciones reales en BD sí distinguen ' +
      '("Soltero/a sin hijos" vs "Soltero/a con hijos", "En pareja sin hijos", "Casado/a con hijos", ' +
      '"Divorciado/a", "Viudo/a" — 6 valores). Traducir un valor de la UI a una opción de la BD sería inventar ' +
      'cuál de las dos variantes eligió la persona (p. ej. "Soltero(a)" -> ¿"sin hijos" o "con hijos"?).',
  },
  {
    campo: 'FichaSaludData.peso / estatura / objetivoSmartSalud / condicionesSalud',
    motivo:
      'weight_kg (38), height_cm (37) y body_smart_goal (33) SÍ existen en el catálogo (y son REQUERIDAS en ' +
      'BD), pero el capítulo "DESCANSO Y SALUD" de la app (ChapterSalud.tsx) nunca los pregunta — solo pide ' +
      'horas de sueño, calidad de sueño y medicación. No hay valor real que enviar. Reportado como brecha ' +
      'aparte: el catálogo espera estas 3 respuestas y la UI actual no las va a producir nunca.',
  },
  {
    campo: 'FichaSaludData.motivoMedicacion',
    motivo:
      'Duplica especificacionMedicacion (ChapterSalud los setea juntos, mismo texto) — ya cubierto al mapear ' +
      'especificacionMedicacion a medication (34). Mandarlo también sería la misma respuesta dos veces.',
  },
  {
    campo: 'FichaConsentimientoData.dispuestoSoltar / firmaDigital',
    motivo:
      'ChapterConsentimiento.tsx no renderiza estos dos campos (solo el toggle único de autorizaUsoDatos + ' +
      'compromiso90Dias). willing_to_release (56) existe en el catálogo pero no hay valor real que enviar.',
  },
] as const;

/**
 * Actualizado 2026-09-01: `terms_signature` (2) y `signature` (5) — firmas de Términos y del
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

function texto(questionId: number, valor: string | undefined | null): GuardarRespuestaInput | null {
  const v = (valor ?? '').trim();
  return v ? { questionId, textValue: v } : null;
}

function numero(questionId: number, valor: string | undefined | null): GuardarRespuestaInput | null {
  const n = parseFloat((valor ?? '').trim());
  return Number.isFinite(n) ? { questionId, numberValue: n } : null;
}

function escala(questionId: number, valor: number | undefined | null): GuardarRespuestaInput | null {
  if (valor === undefined || valor === null || !Number.isFinite(valor)) return null;
  const v = Math.round(Math.max(1, Math.min(10, valor)));
  return { questionId, scaleValue: v };
}

function casilla(questionId: number, valor: boolean | undefined | null): GuardarRespuestaInput | null {
  if (valor === undefined || valor === null) return null;
  return { questionId, booleanValue: valor };
}

function soloDefinidos(items: (GuardarRespuestaInput | null)[]): GuardarRespuestaInput[] {
  return items.filter((i): i is GuardarRespuestaInput => i !== null);
}

// ------------------------------------------------------------------------------------------------
// Builders — un campo del formulario en el estado ya validado por FichaInicialScreen -> respuestas
// ------------------------------------------------------------------------------------------------

/** Capítulo 1 (IDENTIDAD Y FAMILIA) -> sección `identidad_operativa` del flujo `ficha_inicial`. */
export function mapearIdentidad(data: FichaIdentidadData): GuardarRespuestaInput[] {
  const fechaIso = fechaDdMmAaaaAIso(data.fechaNacimiento);
  return soloDefinidos([
    texto(P_FULL_NAME.id, data.nombre),
    texto(P_SEX.id, data.sexo || undefined),
    texto(P_CHILDREN_INFO.id, data.cantidadHijos),
    texto(P_PROFESSION.id, data.ocupacion),
    texto(P_IDENTITY_DOCUMENT.id, data.numeroDocumento),
    fechaIso ? { questionId: P_BIRTH_DATE.id, textValue: fechaIso } : null,
    texto(P_WHATSAPP.id, data.whatsapp),
    texto(P_EMAIL.id, data.email),
    texto(P_COUNTRY.id, data.pais),
    texto(P_CITY.id, data.ciudad),
    texto(P_DISTRICT.id, data.distrito),
    texto(P_ADDRESS_REFERENCE.id, data.direccion),
    texto(P_EXPECTATIONS.id, data.expectativa),
    texto(P_FEARS.id, data.temor),
  ]);
}

/** Capítulo 2 (DESCANSO Y SALUD) -> sección `cuerpo` del flujo `ficha_inicial` (solo lo que la UI pregunta). */
export function mapearSalud(data: FichaSaludData): GuardarRespuestaInput[] {
  // medication (35) es requerida en BD: si la persona respondió "No" a "¿tomas medicación regular?"
  // se manda un valor explícito de "ninguna" en vez de dejar la pregunta obligatoria sin responder.
  const medicacion = data.tomaMedicacionRegular
    ? (data.especificacionMedicacion || '').trim()
    : 'Ninguna';
  return soloDefinidos([
    numero(P_SLEEP_HOURS.id, data.horasSueno),
    escala(P_SLEEP_QUALITY.id, data.calidadSueno),
    medicacion ? { questionId: P_MEDICATION.id, textValue: medicacion } : null,
  ]);
}

/** Capítulo 3 (CONSENTIMIENTO Y COMPROMISO) -> sección `compromiso_y_cierre` del flujo `ficha_inicial`. */
export function mapearConsentimiento(data: FichaConsentimientoData): GuardarRespuestaInput[] {
  // data_consent es SELECCION_UNICA con solo 2 opciones reales en BD; el toggle único de la UI es
  // booleano, así que se traduce al texto exacto de la opción correspondiente (no hay ambigüedad:
  // son las únicas 2 opciones que existen para esta pregunta).
  const opcionConsentimiento = data.autorizaUsoDatos
    ? 'Sí, autorizo el uso responsable de mis datos personales.'
    : 'No autorizo el uso de mis datos.';
  return soloDefinidos([
    { questionId: P_DATA_CONSENT.id, textValue: opcionConsentimiento },
    casilla(P_COMMITMENT_90DAYS.id, data.compromiso90Dias),
  ]);
}

/** Pantalla de Términos y Condiciones -> flujo `terminos`, sección `aceptacion`. */
export function mapearTerminos(aceptado: boolean): GuardarRespuestaInput[] {
  return soloDefinidos([casilla(P_ACCEPTED_TERMS.id, aceptado)]);
}

/**
 * Pantalla del Pacto -> flujo `pacto`, sección `firma`.
 *
 * Nota sobre accepted_pacto (4): la UI de PactoScreen no tiene una casilla separada de "he leído
 * el pacto" — toda la pantalla ES el pacto, y la única acción es dibujar la firma y tocar
 * "Confirmar mi firma". Se asume accepted_pacto = true en ese momento porque no existe ningún otro
 * gesto en la pantalla al que atarlo; es la misma decisión, a nivel de dato, que ya toma el flujo al
 * mandar los milestones PACTO + PACTO_FIRMADO juntos sobre esta misma acción. Asunción explícita
 * para que el dueño del producto la confirme o la corrija.
 */
export function mapearPacto(nombreParticipante: string): GuardarRespuestaInput[] {
  return soloDefinidos([
    texto(P_PARTICIPANT_NAME.id, nombreParticipante),
    casilla(P_ACCEPTED_PACTO.id, true),
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

  // medication (34) es requerida en BD: mapearSalud manda 'Ninguna' cuando la persona respondió
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
