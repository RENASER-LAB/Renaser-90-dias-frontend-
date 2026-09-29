import { seRegistraConFoto } from '../../training/utils/registroConFotoEnTraining';
import type { HabitoCatalogoApi, TrackDelDiaApi } from '../types/habits.types';
import { preguntaQueSintio } from './registroConFoto';

/** Un registro terminal ya no acepta evidencia: el backend lo rechaza y no tiene sentido ofrecerlo. */
const ESTADOS_TERMINALES: ReadonlySet<string> = new Set(['COMPLETADO', 'EXPIRADO', 'FALLIDO']);

export type HabitoParaFoto = {
  track: TrackDelDiaApi;
  /** Solo los rituales preguntan "¿Qué sentiste?" (D-172). */
  conPregunta: boolean;
};

/**
 * Los hábitos de HOY que todavía se pueden cerrar con una foto, con el MISMO criterio que Training
 * (`seRegistraConFoto`): exigen evidencia, no tienen flujo propio y su registro de hoy sigue
 * abierto. Así «+ Subir Foto» de Yo nunca ofrece algo que Training resolvería por otro camino.
 *
 * Un hábito sin su entrada en el catálogo no se ofrece: sin `evidenceRequirement` no se sabe si
 * pide foto.
 */
export function habitosParaFotoDeHoy(
  tracks: readonly TrackDelDiaApi[],
  catalogo: readonly HabitoCatalogoApi[],
  esWeb: boolean,
): HabitoParaFoto[] {
  const porId = new Map(catalogo.map(h => [h.id, h] as const));
  return tracks.flatMap(track => {
    const habito = porId.get(track.habitoId);
    if (!habito || ESTADOS_TERMINALES.has(track.estado)) return [];
    const registrable = seRegistraConFoto(
      { evidenceRequirement: habito.evidenceRequirement, systemKey: habito.systemKey ?? null, dimension: '' },
      esWeb,
    );
    return registrable ? [{ track, conPregunta: preguntaQueSintio(habito.systemKey) }] : [];
  });
}
