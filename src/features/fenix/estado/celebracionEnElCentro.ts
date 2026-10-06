/**
 * Por dónde se celebra un hito (2026-10-06, pedido del dueño: «toda la animación va en el fénix del medio de Hoy»).
 * El fénix vivo del centro se anota acá mientras está montado y animado; Hoy le pide la celebración. Si no hay
 * ninguno anotado (Hoy no se ve, la web, «reducir movimiento», el `.riv` caído), Hoy usa la superposición
 * `CelebracionFenix`.
 */
type Celebrador = () => Promise<void>;

let celebrador: Celebrador | null = null;

export function anotarCelebrador(nuevo: Celebrador): () => void {
  celebrador = nuevo;
  return () => {
    if (celebrador === nuevo) celebrador = null;
  };
}

/** `null` si no hay fénix del centro que pueda celebrar ahora. */
export function celebradorDelCentro(): Celebrador | null {
  return celebrador;
}
