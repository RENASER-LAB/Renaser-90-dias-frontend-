import { NOMBRE_ACOMPANANTE } from '../../renasia/data/agentes';

/**
 * EL NOMBRE VISIBLE DE ESTE ASISTENTE VIVE EN `renasia/data/agentes.ts` (D-102); acá solo se reexporta.
 *
 * Historia, para que nadie la "arregle" de vuelta:
 * - D-95 (2026-09-04): el dueño pidió que "la IA que acompaña el arranque se llame Sparkie", y esta
 *   constante nació valiendo 'Sparkie'.
 * - D-97: se interpretó que Sparkie era el nombre del único asistente y se rebautizó también el panel
 *   de chat.
 * - D-102 (mismo día): el dueño aclaró, textual: "Sparkie: su objetivo es ayudar en los cursos. El
 *   otro agente, que será un chat aparte, será durante su progreso de 90 días. No los juntes en un
 *   mismo." El saludo del arranque y la guía al primer post son trabajo del ACOMPAÑANTE de los 90
 *   días (progreso, orientación en la app), no del tutor de cursos. Por eso este overlay pasa a
 *   presentarse con el nombre del acompañante.
 *
 * El dueño confirmó SER para esta presentación (2026-09-07). El nombre viene de la constante
 * del acompañante; Sparkie sigue siendo el tutor de cursos. La carpeta conserva su nombre técnico.
 */
export const NOMBRE_ASISTENTE = NOMBRE_ACOMPANANTE;

/**
 * El guion del arranque es TEXTO PROPIO DE LA APP, no una respuesta del modelo, a propósito.
 *
 * `renaser.ia.proveedor` está hoy en `noop` (no hay credenciales de Gemini cargadas), así que
 * `NoOpRenasiaChatAdapter` responde siempre la misma línea fija ("El asistente todavia no esta
 * disponible: faltan credenciales de IA por configurar (D-39)"). Si el saludo y la guía dependieran
 * del modelo, el onboarding entero quedaría roto hasta que existan esas credenciales — y el pedido
 * del dueño es justamente que el aprendiz recién llegado no se pierda. La conversación libre con el
 * modelo (el panel del asistente) sigue siendo lo opcional.
 */

/** Saludo, apenas el aprendiz eligió su Día 1. `nombre` puede venir vacío. */
export function saludoDeBienvenida(nombre?: string | null): { titulo: string; parrafos: string[] } {
  const primerNombre = (nombre || '').trim().split(/\s+/)[0];
  return {
    titulo: primerNombre ? `Hola, ${primerNombre}.` : '¡Hola!',
    parrafos: [
      `Soy ${NOMBRE_ASISTENTE}, la inteligencia de RENASER.`,
      'Una IA creada para ayudarte a verte con mayor claridad, identificar patrones, cuestionar decisiones y transformar la raíz desde donde estás creando tus resultados.',
      'No está diseñada para decirte lo que quieres escuchar.',
      'Está diseñada para ayudarte a pensar, decidir y actuar desde una versión más consciente y poderosa de ti.',
    ],
  };
}

/** Guía del paso 2: publicar el primer post en el Muro. */
export const GUIA_PRIMER_POST = {
  titulo: 'Tu primera publicación',
  parrafos: [
    'Escribe unas líneas contando quién eres y qué vienes a cambiar. No tiene que ser perfecto: tiene que ser verdad.',
    'Necesitas sumarle una foto — el Muro pide al menos una por publicación.',
  ],
  botonPrincipal: 'Llevame al Muro',
  botonSecundario: 'Ahora no',
};

/** Lo que se ve mientras el aprendiz está en el Muro y todavía no publicó. */
export const ESPERANDO_PRIMER_POST = {
  titulo: 'Te espero acá',
  parrafo: 'Cuando publiques, sigo yo.',
};

/** Antesala del Pacto, ya con el primer post publicado. */
export const ANTESALA_PACTO = {
  titulo: 'Ya eres parte.',
  parrafos: [
    'Publicaste. Con eso dejaste de ser alguien que mira y pasaste a ser alguien que está.',
    'Queda una sola cosa antes de que la app sea tuya: el Pacto.',
  ],
  boton: 'Leer y firmar el Pacto',
};
