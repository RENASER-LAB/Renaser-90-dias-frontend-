/**
 * Aviso de "la persona confirmó una propuesta de SER y el servidor la aplicó" (D-229 del backend).
 *
 * Existe porque la tarjeta se confirma en el chat (o en la hoja del orbe), pero lo que cambió se ve
 * en **Training** y en **Hoy**, que cargan al montarse: sin este aviso, quien le pide a SER un
 * hábito nuevo y toca Confirmar vuelve a Training y no lo encuentra hasta recargar a mano. Vale para
 * cualquier propuesta (marcar, pausar, horarios): todas cambian algo que esas pantallas muestran.
 *
 * Mismo emisor mínimo que `features/habits/events/avisoPostDiarioCerrado.ts`. El oyente no toca
 * nada a mano: vuelve a pedir al backend, que es la única fuente de verdad. Si la pantalla no está
 * montada no se pierde nada: al montarse carga igual.
 */

type Oyente = () => void;

const oyentes = new Set<Oyente>();

/** Lo llama `confirmarPropuestaRenasia` cuando el backend respondió CONFIRMADA. */
export function avisarPropuestaConfirmada(): void {
  oyentes.forEach(oyente => {
    try {
      oyente();
    } catch (error) {
      // Un oyente roto no puede tumbar la confirmación, que ya se aplicó.
      console.warn('Un oyente de "propuesta confirmada" falló:', error);
    }
  });
}

/** Devuelve la función para darse de baja — pensado para el `return` de un `useEffect`. */
export function escucharPropuestaConfirmada(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
