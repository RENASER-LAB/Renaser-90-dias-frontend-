/**
 * Aviso instantáneo de "el aprendiz acaba de publicar en el Muro".
 *
 * La VERDAD sobre si ya publicó vive en el servidor (`GET /api/v1/wall/mine`), y el arranque
 * guiado la consulta igual — este aviso no la reemplaza, solo la adelanta. Sin él, entre el
 * momento en que la persona toca "PUBLICAR" y el momento en que aparece el Pacto habría que
 * esperar al siguiente sondeo; con él, la transición es inmediata y el sondeo queda de red de
 * seguridad (por si el post se publicó desde otro lado, o la app se cerró en el medio).
 *
 * Es un emisor de 15 líneas y no una librería nueva ni un contexto global a propósito: el único
 * emisor es `ComunidadScreen` y el único oyente es `useArranqueGuiado`. Meter una dependencia o un
 * provider para esto sería más caro que el problema.
 */

type Oyente = () => void;

const oyentes = new Set<Oyente>();

/** Lo llama `ComunidadScreen` cuando una publicación propia se confirmó en el backend. */
export function avisarPostPublicado(): void {
  oyentes.forEach(oyente => {
    try {
      oyente();
    } catch (error) {
      // Un oyente roto no puede tumbar el flujo de publicar: publicar es lo importante acá.
      console.warn('Un oyente de "post publicado" falló:', error);
    }
  });
}

/** Devuelve la función para darse de baja — pensado para el `return` de un `useEffect`. */
export function escucharPostPublicado(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
