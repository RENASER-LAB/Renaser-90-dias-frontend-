/**
 * Spec 048 (FR-006): si hay señal, deducido de las respuestas del servidor (sin un detector de red nativo nuevo). Un pedido sin
 * respuesta marca «sin conexión desde…»; cualquier respuesta (también un 4xx) marca que volvió. La cola escucha el regreso para
 * enviar lo pendiente en el acto.
 */
type Oyente = () => void;

let sinConexionDesde: number | null = null;
const oyentes = new Set<Oyente>();
const alVolver = new Set<Oyente>();

function avisar(lista: Set<Oyente>) {
  for (const o of [...lista]) {
    try {
      o();
    } catch {
      /* un oyente roto no frena a los demás */
    }
  }
}

export function marcarSinConexion(ahora: number = Date.now()): void {
  if (sinConexionDesde !== null) return;
  sinConexionDesde = ahora;
  avisar(oyentes);
}

export function marcarConConexion(): void {
  if (sinConexionDesde === null) return;
  sinConexionDesde = null;
  avisar(oyentes);
  avisar(alVolver);
}

export function sinConexionDesdeMs(): number | null {
  return sinConexionDesde;
}

export function suscribirConexion(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function alVolverLaConexion(oyente: Oyente): () => void {
  alVolver.add(oyente);
  return () => alVolver.delete(oyente);
}

/** Solo para las pruebas. */
export function _reiniciarConexion(): void {
  sinConexionDesde = null;
  oyentes.clear();
  alVolver.clear();
}
