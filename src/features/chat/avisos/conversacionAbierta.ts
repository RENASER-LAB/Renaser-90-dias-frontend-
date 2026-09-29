/**
 * Qué conversación está abierta en pantalla ahora (D-221, 2026-09-29). La marca `useChatEnVivo` al
 * abrir un chat y la limpia al cerrarlo o al pasar la app a segundo plano; la leen el manejador de
 * avisos en primer plano y la web, para no sonar por el chat que la persona ya está mirando.
 *
 * En memoria y a propósito sin React: el `setNotificationHandler` de `expo-notifications` corre fuera
 * de cualquier componente.
 */
let abierta: string | null = null;

export function marcarConversacionAbierta(conversacionId: string | null): void {
  abierta = conversacionId;
}

/** Limpia solo si la abierta es ESA: un chat que se cierra tarde no borra al que ya se abrió. */
export function cerrarConversacionAbierta(conversacionId: string): void {
  if (abierta === conversacionId) abierta = null;
}

export function conversacionAbierta(): string | null {
  return abierta;
}
