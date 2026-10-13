/**
 * Qué interruptor tapa cada lugar de la app (spec 002, «Catálogo inicial de funcionalidades»). Las claves son las del
 * catálogo del backend; acá solo se dice cuál le toca a cada sección o conversación, para que las pantallas no
 * repitan el texto de la clave. La fase 1 tapa en la interfaz lo crítico; el resto lo protege el servidor con su 503.
 */
export const CLAVES = {
  ia: 'ia',
  iaChat: 'ia.chat',
  iaVoz: 'ia.voz',
  iaPropuestas: 'ia.propuestas',
  chat: 'chat',
  chatAudio: 'chat.audio',
  chatFotos: 'chat.fotos',
  muro: 'muro',
  muroPublicar: 'muro.publicar',
  habitos: 'habitos',
  eventos: 'eventos',
  cursos: 'cursos',
  ranking: 'ranking',
} as const;

/**
 * La clave de cada sección de Comunidad. Tribu es el chat (la lista de conversaciones); Testimonios no tiene
 * interruptor (todavía no hay datos detrás).
 */
const CLAVE_DE_LA_SECCION: Readonly<Record<string, string>> = {
  muro: CLAVES.muro,
  eventos: CLAVES.eventos,
  classroom: CLAVES.cursos,
  tribu: CLAVES.chat,
  ranking: CLAVES.ranking,
};

export function claveDeLaSeccionDeComunidad(seccion: string): string | null {
  return CLAVE_DE_LA_SECCION[seccion] ?? null;
}

/**
 * La clave de una conversación según su tipo (los cajones de `ChatConversation['type']`): el grupo con el mentor es
 * `chat.grupos`, la comunidad `chat.global`, el soporte `chat.soporte` y un 1 a 1 `chat.directos`. Un tipo que la app
 * no conoce cae en `chat` (si el chat entero está apagado, igual se ve el aviso).
 */
const CLAVE_DE_LA_CONVERSACION: Readonly<Record<string, string>> = {
  celula: 'chat.grupos',
  global: 'chat.global',
  soporte: 'chat.soporte',
  direct: 'chat.directos',
};

export function claveDeLaConversacion(tipo: string | null | undefined): string {
  return (tipo && CLAVE_DE_LA_CONVERSACION[tipo]) || CLAVES.chat;
}
