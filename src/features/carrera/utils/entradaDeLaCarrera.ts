/**
 * ¿Se ofrece «Correr con GPS» en la fila de «Kilómetros diarios»? (FR-001, FR-045). Pura.
 *
 * Solo en Android, solo en la lista de HOY, solo si el servidor sabe de carreras (la agenda trae `carrerasDelDia`, aunque sea
 * `null`: un backend anterior no lo manda, contracts/api.md §2) y solo con el interruptor `habitos.km.carreras` disponible y
 * prendido. Se ofrece también con el hábito ya cumplido: correr más sube los km del día (FR-022).
 */
export function seOfreceLaCarrera(entrada: {
  plataforma: string;
  esHoy: boolean;
  carrerasDelDia: { cantidad: number; kilometros: number } | null | undefined;
  disponible: boolean;
  prendida: boolean;
}): boolean {
  return (
    entrada.plataforma === 'android' &&
    entrada.esHoy &&
    entrada.carrerasDelDia !== undefined &&
    entrada.disponible &&
    entrada.prendida
  );
}
