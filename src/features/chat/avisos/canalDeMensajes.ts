/**
 * El canal de Android de los avisos de mensajes del chat (D-221, 2026-09-29).
 *
 * En Android 8+ el sonido es del CANAL, no del aviso: el servidor manda `channelId: 'mensajes-chat'`
 * y el teléfono suena con el sonido que el canal tenía al CREARSE (después ya no se puede cambiar
 * desde la app; solo la persona, en los ajustes del sistema). Por eso el sonido va fijo acá.
 *
 * Un APK anterior no crea este canal: `expo-notifications` 57 (`BaseNotificationBuilder.channelId`)
 * cae entonces a su canal de respaldo y el aviso sale igual, con el sonido por defecto del teléfono.
 */
export const CANAL_DE_MENSAJES = {
  id: 'mensajes-chat',
  nombre: 'Mensajes',
  /** Nombre del archivo en `res/raw` (lo copia el plugin de `expo-notifications`, `app.json` → `sounds`). */
  sonido: 'mensaje_burbuja.wav',
} as const;
