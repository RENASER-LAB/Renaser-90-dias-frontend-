/**
 * La ventana de la lista de mensajes del chat (issue #190). La primera página trae 30 mensajes y sus separadores de día
 * (~35 filas); con `initialNumToRender={20}` y el resto por defecto, en un teléfono de gama baja se montaba casi todo en el
 * primer pase y el chat tardaba en mostrar algo. Ahora se monta lo que cabe en pantalla (la lista es invertida: lo primero
 * son los mensajes más nuevos) y el resto llega por tandas chicas mientras se sube.
 */
export const VENTANA_DEL_CHAT = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 8,
  windowSize: 11,
} as const;
