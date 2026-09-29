/**
 * Aviso interno «llegó un mensaje a OTRO chat» (D-221, 2026-09-29). Lo dispara el aviso en primer
 * plano (teléfono) o el service worker (web); lo escucha `useChatConversaciones` para releer la lista
 * —orden por último mensaje y contador de no leídos— sin esperar a que la persona vuelva a Tribu.
 */
type Oyente = (conversacionId: string) => void;

const oyentes = new Set<Oyente>();

export function alLlegarMensajeDeOtroChat(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function avisarMensajeDeOtroChat(conversacionId: string): void {
  oyentes.forEach(oyente => {
    try {
      oyente(conversacionId);
    } catch {
      // Un oyente que falla no puede dejar sin aviso a los demás.
    }
  });
}
