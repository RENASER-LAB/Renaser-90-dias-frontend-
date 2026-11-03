/**
 * Aviso de que la persona terminó su diagnóstico (spec 026): lo emite el recorrido al terminar y lo escuchan quienes lo ofrecían
 * —la tarjeta «Completa tu diagnóstico» de Hoy y la fila de Yo (`useEstadoDeMiDiagnostico`)—, para dejar de ofrecerlo en el acto
 * sin que Hoy ni Yo tengan que saber cuándo pasa. Mismo patrón que `avisoDiaUnoElegido`: un conjunto de oyentes en memoria.
 */
const oyentes = new Set<() => void>();

export function avisarDiagnosticoTerminado(): void {
  oyentes.forEach(oyente => {
    try {
      oyente();
    } catch (error) {
      console.warn('No se pudo refrescar una lectura del diagnóstico:', error);
    }
  });
}

export function escucharDiagnosticoTerminado(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
