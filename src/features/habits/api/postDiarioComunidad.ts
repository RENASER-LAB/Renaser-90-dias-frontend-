import { obtenerCatalogo, obtenerTracksDeHoy } from './habitsApi';
import { CLAVE_SISTEMA_POST_DIARIO_COMUNIDAD } from '../types/habits.types';

/**
 * Cierra el hábito "POST DIARIO EN COMUNIDAD" del día, si estaba pendiente.
 *
 * ## Por qué existe
 *
 * El backend tiene la regla del dueño del producto (2026-09-04, textual en
 * `PoliticaPostDiarioComunidad`): *"Cuando publique algo, y recién ahí, se marca como
 * completado"*. Pero lo que implementó es la mitad **guardiana** de esa frase: el endpoint
 * `POST /habit-tracks/{id}/complete` responde 400 mientras la persona no haya publicado ese día.
 * La otra mitad —**disparar** el cierre cuando sí publicó— no la hacía nadie: `POST /api/v1/wall`
 * emite `PublicacionCreadaEvent` y ese evento no tiene ni un oyente. Resultado: el registro se
 * quedaba en `PENDIENTE` hasta que el cron nocturno lo expiraba (E-117).
 *
 * **Corregido 2026-09-05.** Esta función ERA ese disparador: pedía el cierre con
 * `POST /habit-tracks/{id}/complete`. Ya no. El backend ahora cierra el hábito solo, desde un
 * `@ApplicationModuleListener` de `PublicacionCreadaEvent` — que además cubre la publicación
 * automática de `rocks`, cosa que este disparador nunca podía cubrir porque vivía en el compositor
 * del Muro.
 *
 * Con las dos mitades puestas, pedir el cierre desde acá pasó a ser redundante y, peor, ruidoso:
 * el oyente gana la carrera casi siempre, así que la llamada recibía 409 y el aviso de
 * "hábito completado" dejaba de mostrarse justo cuando SÍ se había completado.
 *
 * Así que ahora esta función **solo mira**: lee el estado del track y reporta si quedó cerrado.
 * No escribe nada.
 *
 * ## Por qué acá y no en `TrainingScreen`
 *
 * Porque no depende de que la pestaña Training esté montada. El aprendiz puede publicar sin haber
 * entrado nunca a Training en esa sesión, y el hábito tiene que cerrarse igual.
 *
 * ## Un matiz honesto
 *
 * Al no escribir, esta función ya no distingue "lo cerró ESTA publicación" de "ya estaba cerrado".
 * Si alguien publica dos veces el mismo día, el aviso puede aparecer las dos veces. Es preferible
 * a la alternativa —consultar el estado ANTES de publicar, desde el compositor— que ataría este
 * detalle a una pantalla que hoy tocan varias manos.
 */
export type ResultadoCierrePostDiario =
  /** Estaba pendiente y el backend lo cerró: es el único caso que merece avisarle a la persona. */
  | 'completado'
  /** Este aprendiz no tiene el hábito hoy, o el backend no lo devolvió. Silencio. */
  | 'no-aplica'
  /** Algo falló pidiendo el cierre. La publicación YA se guardó: no se toca el flujo de publicar. */
  | 'fallo';

export async function cerrarHabitoPostDiarioComunidad(): Promise<ResultadoCierrePostDiario> {
  try {
    // El `systemKey` es un atributo del CATÁLOGO, no del track: `TrackDelDiaApi` no lo trae. Es el
    // mismo cruce por `habitoId` que ya hace `useTraining`, y por el mismo motivo — el título se
    // puede renombrar desde la app, así que emparejar por texto se rompe en silencio.
    const [catalogo, tracks] = await Promise.all([obtenerCatalogo(), obtenerTracksDeHoy()]);
    const habitoId = catalogo.find(h => h.systemKey === CLAVE_SISTEMA_POST_DIARIO_COMUNIDAD)?.id;
    if (!habitoId) return 'no-aplica';

    let track = tracks.find(t => t.habitoId === habitoId);
    if (!track) return 'no-aplica';
    if (track.estado === 'COMPLETADO') return 'completado';

    // Segunda mirada, una sola vez. El backend cierra este habito desde un
    // @ApplicationModuleListener de `PublicacionCreadaEvent`, que corre asincrono sobre el outbox
    // de Modulith: cuando publicar responde, el cierre puede llevar unos milisegundos de atraso.
    // Casi siempre ya esta hecho en la primera lectura; este reintento cubre el resto.
    await new Promise(resolve => setTimeout(resolve, 900));
    const tracksAlSegundoIntento = await obtenerTracksDeHoy();
    track = tracksAlSegundoIntento.find(t => t.habitoId === habitoId);
    return track?.estado === 'COMPLETADO' ? 'completado' : 'no-aplica';
  } catch (error) {
    // Publicar es lo importante: la publicación ya está guardada en el servidor y el hábito se
    // puede cerrar después tocándolo desde Training (la política ya lo dejará pasar, porque la
    // publicación existe). No se propaga el error para no hacerle creer a la persona que el post
    // falló.
    console.warn('No se pudo cerrar el hábito de post diario en comunidad:', error);
    return 'fallo';
  }
}
