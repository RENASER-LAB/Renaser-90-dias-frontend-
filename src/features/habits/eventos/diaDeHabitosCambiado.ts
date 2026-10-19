/** Invalida las lecturas montadas cuando un intento conserva un registro de otro día. */
const oyentes = new Set<() => void>();

export function escucharDiaDeHabitosCambiado(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

export function avisarDiaDeHabitosCambiado(): void {
  for (const oyente of [...oyentes]) {
    try { oyente(); } catch { /* Una pantalla no puede ocultar el rechazo del registro. */ }
  }
}
