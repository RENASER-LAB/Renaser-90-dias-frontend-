import { FichaInicialData } from '../types/onboarding.types';
import { esMayorDeEdad, hoyEnLima, partirFecha, type FechaPartida } from '../../../components/fechaEnRuedas/logicaDeFecha';
import { CHAPTERS_CONFIG } from './chaptersConfig';

/**
 * La Ficha Inicial, de a un paso por pantalla (alta y onboarding nativos, 2026-10-05).
 *
 * **Qué pidió el dueño.** «Estamos en una app móvil y veo cosas como si fuera una web, tipo el
 * registro, que lo hace por fases.» El capítulo 1 era UN formulario de doce preguntas con scroll y
 * el botón al final de todo: el patrón de una página web. En una app, cada pantalla pregunta una
 * cosa (o dos o tres que van juntas) y el botón está siempre a la vista.
 *
 * **Qué NO cambia — el contrato.** Los TRES capítulos siguen siendo la unidad de guardado: las mismas
 * respuestas (`mapearIdentidad` / `mapearSalud` / `mapearConsentimiento`), el mismo
 * `POST /onboarding/answers` por capítulo, el mismo `avanzarEstado` con `step` = número de capítulo.
 * Los pasos son sólo la forma de mostrar cada capítulo: se guarda al terminar el ÚLTIMO paso del
 * capítulo, como antes se guardaba al tocar «Siguiente» en el capítulo entero.
 *
 * **Qué textos son nuevos.** Sólo los títulos de los pasos que agrupan dos preguntas («Sobre ti»,
 * «Tu familia», «Tu trabajo», «Tu documento», «¿Dónde vives?», «Tu descanso»). Las preguntas, las
 * ayudas y los avisos de validación son los de siempre, palabra por palabra.
 */

export type IdPasoFicha =
  | 'nombre'
  | 'sobreTi'
  | 'familia'
  | 'trabajo'
  | 'documento'
  | 'whatsapp'
  | 'ubicacion'
  | 'expectativa'
  | 'temor'
  | 'descanso'
  | 'medicacion'
  | 'consentimiento';

/** Índice del capítulo (0, 1, 2), el mismo de `CHAPTERS_CONFIG` y de `SECCION_POR_CAPITULO`. */
export type CapituloFicha = 0 | 1 | 2;

export interface PasoFicha {
  id: IdPasoFicha;
  capitulo: CapituloFicha;
  titulo: string;
  /** Una línea de contexto bajo el título. Sólo donde ya existía como ayuda del campo. */
  bajada?: string;
}

export const PASOS_FICHA: readonly PasoFicha[] = [
  // Capítulo 1 · Identidad y familia
  { id: 'nombre', capitulo: 0, titulo: 'Nombre completo', bajada: 'Cómo deseas que te identifique tu mentor y el sistema' },
  { id: 'sobreTi', capitulo: 0, titulo: 'Sobre ti' },
  { id: 'familia', capitulo: 0, titulo: 'Tu familia' },
  { id: 'trabajo', capitulo: 0, titulo: 'Tu trabajo' },
  { id: 'documento', capitulo: 0, titulo: 'Tu documento' },
  { id: 'whatsapp', capitulo: 0, titulo: 'WhatsApp principal', bajada: 'El canal donde recibirás el seguimiento diario de tu mentor' },
  { id: 'ubicacion', capitulo: 0, titulo: '¿Dónde vives?' },
  {
    id: 'expectativa',
    capitulo: 0,
    titulo: '¿Qué esperas concretamente de Renaser?',
    bajada: 'Detalla los cambios específicos que necesitas lograr en tu mente, cuerpo y negocio durante los 90 días.',
  },
  {
    id: 'temor',
    capitulo: 0,
    titulo: '¿Qué temes que no funcione?',
    bajada: 'Honestidad absoluta. ¿Cuáles son tus mayores dudas, patrones de autosabotaje o miedos frente a este proceso?',
  },
  // Capítulo 2 · Descanso y salud
  { id: 'descanso', capitulo: 1, titulo: 'Tu descanso' },
  { id: 'medicacion', capitulo: 1, titulo: '¿Tomas alguna medicación de forma regular?' },
  // Capítulo 3 · Consentimiento y compromiso
  { id: 'consentimiento', capitulo: 2, titulo: 'Consentimiento y compromiso' },
];

export const TOTAL_PASOS_FICHA = PASOS_FICHA.length;

/** Lo que dice la alerta cuando falta algo. Mismos títulos y mensajes que antes de 2026-10-05. */
export interface AvisoDePaso {
  titulo: string;
  mensaje: string;
}

const AVISOS = {
  nombre: { titulo: 'Nombre requerido', mensaje: 'Por favor ingresa tu nombre completo en la Identidad.' },
  sexo: { titulo: 'Sexo requerido', mensaje: 'Por favor selecciona una opción de sexo.' },
  documento: { titulo: 'Documento requerido', mensaje: 'Por favor ingresa tu número de documento de identidad.' },
  fecha: { titulo: 'Fecha requerida', mensaje: 'Por favor selecciona tu fecha de nacimiento.' },
  // 2026-10-06, decisión del dueño: solo mayores de 18 (D-80). La única regla nueva desde el rediseño.
  edad: { titulo: 'Solo para mayores de 18', mensaje: 'Renaser es solo para mayores de 18 años.' },
  whatsapp: { titulo: 'WhatsApp requerido', mensaje: 'Por favor ingresa tu número de WhatsApp para contacto con tu mentor.' },
  horas: { titulo: 'Horas de sueño requeridas', mensaje: 'Por favor ingresa tus horas promedio de sueño (entre 0 y 24).' },
  medicacion: { titulo: 'Medicación requerida', mensaje: 'Por favor especifica tu medicación y el motivo de la toma.' },
  compromiso: {
    titulo: 'Compromiso requerido',
    mensaje: 'Por favor marca la casilla de autorización de datos y compromiso a los 90 días para continuar.',
  },
} satisfies Record<string, AvisoDePaso>;

/**
 * Lo que le falta a UN paso para poder seguir, o `null` si está completo.
 *
 * Las reglas son las de la validación por capítulo que había antes, repartidas en el paso donde
 * vive cada campo. `validarCapitulo` de abajo, que las junta de nuevo, da lo mismo que daba la
 * vieja `validateChapter`, más una regla nueva (2026-10-06): la fecha de nacimiento tiene que ser de
 * alguien con 18 años cumplidos en el día de Lima (`hoy`, inyectable para las pruebas).
 */
export function validarPaso(id: IdPasoFicha, ficha: FichaInicialData, hoy: FechaPartida = hoyEnLima()): AvisoDePaso | null {
  const { identidad, salud, consentimiento } = ficha;
  switch (id) {
    case 'nombre':
      return identidad.nombre.trim().length < 3 ? AVISOS.nombre : null;
    case 'sobreTi':
      if (!identidad.sexo) return AVISOS.sexo;
      return validarFechaDeNacimiento(identidad.fechaNacimiento, hoy);
    case 'documento':
      return identidad.numeroDocumento.trim().length < 4 ? AVISOS.documento : null;
    case 'whatsapp':
      return identidad.whatsapp.trim().length < 6 ? AVISOS.whatsapp : null;
    case 'descanso': {
      const horas = parseFloat(salud.horasSueno);
      const valida = !isNaN(horas) && horas >= 0 && horas <= 24 && salud.horasSueno.trim() !== '';
      return valida ? null : AVISOS.horas;
    }
    case 'medicacion':
      return salud.tomaMedicacionRegular && !salud.especificacionMedicacion?.trim() ? AVISOS.medicacion : null;
    case 'consentimiento':
      return !consentimiento.autorizaUsoDatos && !consentimiento.compromiso90Dias ? AVISOS.compromiso : null;
    default:
      // familia, trabajo, ubicación, expectativa y temor no tenían campos obligatorios.
      return null;
  }
}

function validarFechaDeNacimiento(valor: string, hoy: FechaPartida): AvisoDePaso | null {
  if (!valor.trim()) return AVISOS.fecha;
  const fecha = partirFecha(valor);
  return fecha && !esMayorDeEdad(fecha, hoy) ? AVISOS.edad : null;
}

/** Índice global (0..11) del primer paso de un capítulo. */
export function primerPasoDelCapitulo(capitulo: number): number {
  const indice = PASOS_FICHA.findIndex(p => p.capitulo === capitulo);
  return indice < 0 ? 0 : indice;
}

export function pasosDelCapitulo(capitulo: number): PasoFicha[] {
  return PASOS_FICHA.filter(p => p.capitulo === capitulo);
}

/** Dónde cae un índice global: su capítulo, su posición dentro del capítulo y si cierra algo. */
export function ubicarPaso(indice: number) {
  const acotado = Math.max(0, Math.min(TOTAL_PASOS_FICHA - 1, indice));
  const paso = PASOS_FICHA[acotado];
  const delCapitulo = pasosDelCapitulo(paso.capitulo);
  const pasoEnCapitulo = delCapitulo.findIndex(p => p.id === paso.id);
  return {
    indice: acotado,
    paso,
    capitulo: paso.capitulo,
    pasoEnCapitulo,
    pasosEnCapitulo: delCapitulo.length,
    esUltimoDelCapitulo: pasoEnCapitulo === delCapitulo.length - 1,
    esUltimo: acotado === TOTAL_PASOS_FICHA - 1,
  };
}

/**
 * El índice global al que hay que volver al reabrir la app con un borrador guardado.
 *
 * Los borradores de antes del 2026-10-05 sólo guardaban el capítulo: esos vuelven al primer paso de
 * su capítulo, con todo lo escrito ya cargado. Un valor raro (de otra versión, o corrupto) nunca
 * puede dejar la pantalla en un paso que no existe.
 */
export function indiceDesdeBorrador(capitulo: number, pasoEnCapitulo?: number): number {
  const cap = Number.isInteger(capitulo) && capitulo >= 0 && capitulo < CHAPTERS_CONFIG.length ? capitulo : 0;
  const total = pasosDelCapitulo(cap).length;
  const dentro = Number.isInteger(pasoEnCapitulo) && (pasoEnCapitulo as number) >= 0 ? (pasoEnCapitulo as number) : 0;
  return primerPasoDelCapitulo(cap) + Math.min(dentro, total - 1);
}

/**
 * El primer paso del capítulo al que le falta algo, o `null` si el capítulo entero está completo.
 * Se revisa justo antes de guardar el capítulo: aunque cada paso se valida al dejarlo, un borrador
 * restaurado puede haber dejado a la persona más adelante con algo vacío atrás.
 */
export function validarCapitulo(
  capitulo: number,
  ficha: FichaInicialData,
  hoy: FechaPartida = hoyEnLima(),
): { indice: number; aviso: AvisoDePaso } | null {
  for (let i = 0; i < TOTAL_PASOS_FICHA; i++) {
    const paso = PASOS_FICHA[i];
    if (paso.capitulo !== capitulo) continue;
    const aviso = validarPaso(paso.id, ficha, hoy);
    if (aviso) return { indice: i, aviso };
  }
  return null;
}

/**
 * Cuánto se llenó cada uno de los tres tramos de la barra de avance (0 a 1), para el paso que se
 * está viendo. El paso actual cuenta como hecho a medias: el tramo del capítulo en curso marca
 * `(posición + 1) / pasos`, los anteriores van llenos y los siguientes vacíos.
 */
export function rellenoPorCapitulo(indice: number): number[] {
  const { capitulo, pasoEnCapitulo, pasosEnCapitulo } = ubicarPaso(indice);
  return CHAPTERS_CONFIG.map((_, i) => {
    if (i < capitulo) return 1;
    if (i > capitulo) return 0;
    return (pasoEnCapitulo + 1) / pasosEnCapitulo;
  });
}
