/** Una elección confirmada invalida las lecturas de las otras pestañas, que siguen montadas. */
const oyentes = new Set<() => void>();

export function avisarDiaUnoElegido(): void {
  oyentes.forEach(oyente => {
    try {
      oyente();
    } catch (error) {
      console.warn('No se pudo refrescar una lectura del Día 1:', error);
    }
  });
}

export function escucharDiaUnoElegido(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}
