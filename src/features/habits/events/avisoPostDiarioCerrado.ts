/**
 * Aviso de "el hábito de post diario en comunidad acaba de cerrarse".
 *
 * Existe porque el hábito se cierra desde la pestaña **Comunidad** (al publicar en el Muro) pero
 * la tarjeta que lo muestra vive en la pestaña **Training**, y `useTraining` carga una sola vez al
 * montarse: sin este aviso, la persona ve el mensaje de "hábito completado" y al volver a Training
 * se encuentra la tarjeta todavía sin tildar. La verdad la sigue teniendo el servidor — el oyente
 * no marca nada a mano, dispara una recarga.
 *
 * Es un emisor de quince líneas, calcado de `features/sparkie/events/avisoPrimerPost.ts`, y no una
 * librería de estado global a propósito: hay un solo emisor (el compositor del Muro) y un solo
 * oyente (`TrainingScreen`). Si Training no está montado no se pierde nada — cuando se monte va a
 * cargar del backend igual.
 */

type Oyente = () => void;

const oyentes = new Set<Oyente>();

/** Lo llama el compositor del Muro cuando el backend confirmó el cierre del hábito. */
export function avisarPostDiarioCerrado(): void {
  oyentes.forEach(oyente => {
    try {
      oyente();
    } catch (error) {
      // Un oyente roto no puede tumbar el flujo de publicar.
      console.warn('Un oyente de "post diario cerrado" falló:', error);
    }
  });
}

/** Devuelve la función para darse de baja — pensado para el `return` de un `useEffect`. */
export function escucharPostDiarioCerrado(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
