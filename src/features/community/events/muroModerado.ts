/**
 * Aviso de "se moderó el Muro": una publicación se ocultó, se devolvió o se eliminó (2026-10-31).
 *
 * Existe porque quien modera lo hace en DOS lugares que no se conocen: el «…» de cada publicación (Comunidad →
 * Muro) y la cola de «Publicaciones ocultas» (Administración, que vive dentro de Hoy). Devolver una publicación
 * desde la cola tiene que hacerla aparecer en un Muro que ya está montado y no vuelve a leer solo, y la tarjeta
 * «última evidencia» de Hoy tiene que dejar de enseñar una que ya no está. Mismo emisor de pocas líneas que
 * `sparkie/events/avisoPrimerPost` (sin librería ni contexto nuevo): el emisor es quien modera; los oyentes,
 * `useWallFeed` (relee en silencio) y `useUltimaPublicacionMuro` (da por vencida su lectura).
 */

type Oyente = () => void;

const oyentes = new Set<Oyente>();

/** Lo llama quien acaba de ocultar, devolver o eliminar una publicación, cuando el servidor lo confirmó. */
export function avisarMuroModerado(): void {
  oyentes.forEach(oyente => {
    try {
      oyente();
    } catch (error) {
      // Un oyente roto no puede tumbar la moderación: lo importante ya pasó en el servidor.
      console.warn('Un oyente de "muro moderado" falló:', error);
    }
  });
}

/** Devuelve la función para darse de baja — pensado para el `return` de un `useEffect`. */
export function escucharMuroModerado(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
