import { conEstado } from '../reglas';
import type { AlumnoConEstado } from '../types/mentor.types';

/**
 * El alumno que abre su ficha desde la info del chat del grupo (D-207, decisión del dueño del
 * 2026-09-27: «Agregar la ficha desde la info»). La ficha es la MISMA pantalla que abre «Mi grupo»
 * (`AlumnoScreen`), y necesita un `AlumnoConEstado`.
 *
 * Si «Mi grupo» ya tiene a esa persona en el padrón de ESE grupo, se usa ese —el mismo objeto que abriría
 * «Mi grupo»—; si no (el mentor acompaña varios grupos y «Mi grupo» muestra otro, o todavía no cargó),
 * se arma con el id y el nombre de la info, y los datos de seguimiento en `null`: «no se sabe», nunca
 * cero, igual que arma «Mi grupo» a los suyos (`mentorApi.obtenerMiCelula`). La semana, los hábitos y el
 * semáforo los pide la ficha por su cuenta con el id del grupo.
 */
export function alumnoDesdeLaInfo(
  persona: { usuarioId: string; nombre: string },
  grupoId: string,
  padronDeMiGrupo: { grupoId: string; alumnos: readonly AlumnoConEstado[] } | null
): AlumnoConEstado {
  const delPadron =
    padronDeMiGrupo?.grupoId === grupoId
      ? padronDeMiGrupo.alumnos.find(a => a.participanteId === persona.usuarioId)
      : undefined;
  return (
    delPadron ??
    conEstado({
      participanteId: persona.usuarioId,
      nombre: persona.nombre,
      diaPrograma: null,
      ultimaActividadEn: null,
      habitosProgramados: null,
      habitosCumplidos: null,
      evidenciasPendientes: null,
    })
  );
}
