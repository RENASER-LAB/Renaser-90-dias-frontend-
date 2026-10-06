/**
 * «Se cumplió un hábito»: un aviso dentro de la app, emitido por `completarRegistro` cuando el servidor confirma el
 * cierre (`POST /api/v1/habit-tracks/{id}/complete`). Es el único lugar por donde pasan todos los cierres hechos desde
 * la app (Training, la hoja de evidencia, el acompañante), así que nadie tiene que acordarse de avisar.
 *
 * Lo escuchan (2026-10-06): el semáforo vigente, que se vuelve a leer, y el fénix del botón de SER, que asiente.
 * Quien escucha no puede romper el cierre: un error suyo se traga acá.
 */
type Oyente = () => void;

const oyentes = new Set<Oyente>();

export function alCumplirUnHabito(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function avisarHabitoCumplido(): void {
  for (const oyente of [...oyentes]) {
    try {
      oyente();
    } catch {
      /* el hábito ya quedó cumplido en el servidor: un oyente roto no lo deshace */
    }
  }
}
