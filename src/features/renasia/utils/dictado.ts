/**
 * Reglas puras del dictado por voz del chat (plan de IA v2.1 §3.5), separadas del hook para
 * probarlas sin micrófono ni módulo nativo.
 *
 * El reconocimiento lo hace el del sistema (Google en Android, Apple en iOS) vía
 * `expo-speech-recognition`: gratis y sin API key. Lo que sí personalizamos es el VOCABULARIO: los
 * nombres de los hábitos de hoy de la persona viajan como `contextualStrings`, así el reconocedor
 * prefiere "Tomar agua" antes que transcribir "tomar awa". La voz de cada persona no se entrena
 * (habría que guardar grabaciones: dato personal).
 */

/** Techo de frases de sesgo: más no ayuda y algunos motores las recortan igual. */
export const MAXIMO_FRASES_DE_CONTEXTO = 30;

/** Los títulos de los hábitos, limpios y sin repetidos (sin distinguir mayúsculas). */
export function frasesDeContexto(titulos: readonly string[]): string[] {
  const vistas = new Set<string>();
  const frases: string[] = [];
  for (const crudo of titulos) {
    const titulo = crudo.trim();
    const clave = titulo.toLocaleLowerCase('es');
    if (!titulo || vistas.has(clave)) continue;
    vistas.add(clave);
    frases.push(titulo);
    if (frases.length === MAXIMO_FRASES_DE_CONTEXTO) break;
  }
  return frases;
}

/**
 * Lo dictado se SUMA a lo que ya había escrito, no lo reemplaza: la persona puede escribir un poco,
 * dictar el resto y revisar todo antes de enviar. Nunca se envía solo.
 */
export function unirDictado(textoActual: string, dictado: string): string {
  const antes = textoActual.trimEnd();
  const nuevo = dictado.trim();
  if (!nuevo) return textoActual;
  return antes ? `${antes} ${nuevo}` : nuevo;
}

/**
 * Qué decirle a la persona si el dictado falla. `null` = no mostrar nada (lo canceló ella, o no
 * habló: no es un error que haya que explicar).
 */
export function mensajeDeErrorDeVoz(codigo: string): string | null {
  switch (codigo) {
    case 'aborted':
    case 'no-speech':
      return null;
    case 'not-allowed':
      return 'Para dictar necesito permiso del micrófono. Puedes activarlo en los ajustes del teléfono.';
    case 'network':
      return 'No hay conexión para reconocer tu voz. Intenta de nuevo o escribe tu mensaje.';
    case 'language-not-supported':
    case 'service-not-allowed':
      return 'Tu teléfono no tiene el reconocimiento de voz en español disponible. Puedes escribir tu mensaje.';
    case 'busy':
      return 'El reconocimiento de voz está ocupado. Intenta de nuevo en un momento.';
    default:
      return 'No pude entender el audio. Intenta de nuevo o escribe tu mensaje.';
  }
}

/**
 * Techo de `question` en `POST /api/v1/renasia/mensajes`: el backend no acepta más. Un dictado
 * largo (ahora que el micrófono no corta a la primera pausa) puede pasarse; se recorta antes de
 * mandarlo en vez de que el servidor rechace la pregunta entera.
 */
export const LARGO_MAXIMO_PREGUNTA = 4000;

export function recortarPregunta(texto: string): string {
  return texto.length > LARGO_MAXIMO_PREGUNTA ? texto.slice(0, LARGO_MAXIMO_PREGUNTA) : texto;
}

/**
 * Pausa sin habla nueva tras la cual se da por terminado lo que dijo (pedido del dueño,
 * 2026-09-26: 1,5 s). Antes se mandaba el primer resultado final del reconocedor, que en Android
 * llega en la primera pausa corta: a quien habla largo se le cortaba la frase a la mitad.
 */
export const SILENCIO_PARA_TERMINAR_MS = 1500;

/**
 * Si todavía no dijo nada, cuánto se espera antes de cerrar el micrófono. En modo continuo el
 * reconocedor no se cierra solo, y un micrófono abierto sin que nadie hable no sirve de nada.
 */
export const ESPERA_SIN_HABLA_MS = 8000;

/**
 * En modo continuo cada resultado final es un tramo NUEVO de lo dicho y hay que ir sumándolos.
 * Algunos motores (iOS) mandan en cambio todo lo dicho hasta ahí: si el final nuevo ya empieza con
 * lo acumulado, lo reemplaza en vez de repetirlo.
 */
export function sumarTramo(acumulado: string, tramo: string): string {
  const nuevo = tramo.trim();
  const previo = acumulado.trim();
  if (!nuevo) return previo;
  if (!previo) return nuevo;
  if (nuevo.toLocaleLowerCase('es').startsWith(previo.toLocaleLowerCase('es'))) return nuevo;
  return `${previo} ${nuevo}`;
}
