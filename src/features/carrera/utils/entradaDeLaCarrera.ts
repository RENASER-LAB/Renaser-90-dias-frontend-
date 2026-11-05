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

/**
 * ¿Dónde va la carrera en la fila de «Kilómetros diarios»? (pedido del dueño del 2026-11-05: «que se detecte el dispositivo solo»).
 * Pura. `ofrecida` es lo que ya decidió `seOfreceLaCarrera` (Android, hoy, servidor con carreras e interruptor prendido).
 *
 * - `'fila'`: el botón de la derecha de la fila es «Correr» (o «Carrera en curso · Volver») en lugar de «Subir». Es el caso de
 *   un hábito todavía por cumplir hoy sin la barra de avance de los pasos (spec 037): ahí la derecha sería la captura.
 * - `'debajo'`: la píldora «Correr con GPS» bajo el nombre, como antes. El hábito ya está cumplido (correr más sube los km del
 *   día, FR-022) o la derecha ya la ocupa el avance de los pasos (el círculo o «Registrar»).
 * - `null`: sin carrera. La fila es exactamente la de siempre, con «Subir».
 */
export function lugarDeLaCarrera(entrada: {
  ofrecida: boolean;
  modo: string;
  hecho: boolean;
  conAvanceDePasos: boolean;
}): 'fila' | 'debajo' | null {
  if (!entrada.ofrecida || entrada.modo === 'cerrado' || entrada.modo === 'planificado') return null;
  const porCumplir = !entrada.hecho && (entrada.modo === 'hoy' || entrada.modo === 'atrasado');
  if (porCumplir && !entrada.conAvanceDePasos) return 'fila';
  return 'debajo';
}
