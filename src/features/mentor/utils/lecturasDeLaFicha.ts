import { obtenerCierresDeAlumno, obtenerCierresDePersona } from '../../cierre/api/cierreApi';
import type { CargarCierres } from '../../cierre/types/cierre.types';
import { lecturaParaElLider, lecturaParaElMentor } from '../../diagnostico/api/diagnosticoLecturaApi';
import type { CargarLecturaDelDiagnostico } from '../../diagnostico/hooks/useLecturaDelDiagnostico';
import { obtenerHuecosDeAlumno, obtenerHuecosDePersona } from '../../huecos/api/huecosApi';
import type { CargarHuecos } from '../../huecos/types/huecos.types';
import {
  obtenerDiasDeLaPersona,
  obtenerObjetivosDeLaPersona,
  obtenerRadarDePersona,
  obtenerSemanaDeLaFicha,
} from '../../lider-mentores/api/cumplimientoDelLiderApi';
import type { CargarObjetivos } from '../../lider-mentores/types/objetivosDeLaPersona.types';
import { obtenerOchentaVeinteDeUnaPersona, obtenerOchentaVeinteDeUnAlumno } from '../../ochenta-veinte/api/ochentaVeinteApi';
import type { CargarOchentaVeinte } from '../../ochenta-veinte/types/ochentaVeinte.types';
import type { CargarHistorialDeRadar } from '../../radar/hooks/useHistorialDeRadar';
import {
  obtenerDiasDelAprendiz,
  obtenerRadarDeAlumno,
  obtenerSemanaDelAprendiz,
  type DiasDelAprendiz,
  type OrigenDeLasNotas,
  type SemanaDelAprendiz,
} from '../api/mentorApi';

/**
 * Quién abre la ficha de una persona, y por qué puerta lee (spec 056, T040–T041):
 *
 * - `mentor`: el que la acompaña, desde uno de sus grupos. Sin grupo (`null`) no hay a quién preguntarle.
 * - `lider`: el líder de su formación. `grupoId` es el grupo desde el que se abrió o `null` si se abrió sin grupo (un aprendiz sin
 *   grupo, o desde «Todos»): por la puerta del grupo salen las lecturas que ya existían; por la de la persona, todo lo nuevo.
 */
export type OrigenDeLaFicha = { quien: 'mentor'; grupoId: string | null } | { quien: 'lider'; grupoId: string | null };

/** La semana de sábado a viernes que termina en `semanaHasta` (un viernes); `null` = la que está en curso en la zona de la persona. */
export type CargarSemanaDeLaFicha = (semanaHasta: string | null) => Promise<SemanaDelAprendiz>;

/** Los colores de los días entre `desde` y `hasta` (máximo 62 días). */
export type CargarDiasDeLaFicha = (desde: string, hasta: string) => Promise<DiasDelAprendiz>;

/**
 * Todo lo que la ficha le pide al servidor. Cada función es de ese origen y de esa persona, y `null` quiere decir «esta ficha no tiene
 * a quién preguntarle» (la sección no se dibuja ni se pide). Las secciones del final reciben `cargar` y la usan como llave de lo
 * que guardan, así que quien las usa las memoriza por persona (`useMemo`).
 */
export interface LecturasDeLaFicha {
  cargarSemana: CargarSemanaDeLaFicha | null;
  cargarDias: CargarDiasDeLaFicha | null;
  cargarRadar: CargarHistorialDeRadar | null;
  cargarHuecos: CargarHuecos | null;
  cargarCierres: CargarCierres | null;
  cargarDiagnostico: CargarLecturaDelDiagnostico | null;
  cargarOchentaVeinte: CargarOchentaVeinte | null;
  /** Solo el líder los lee (spec 056 FR-016, FR-027): el mentor no tiene esa puerta, y su ficha no cambia. */
  cargarObjetivos: CargarObjetivos | null;
  /** De dónde se leen las notas privadas: el mentor las lee y las escribe; el líder, solo las lee. */
  origenDeLasNotas: OrigenDeLasNotas | null;
}

const SIN_LECTURAS: LecturasDeLaFicha = {
  cargarSemana: null,
  cargarDias: null,
  cargarRadar: null,
  cargarHuecos: null,
  cargarCierres: null,
  cargarDiagnostico: null,
  cargarOchentaVeinte: null,
  cargarObjetivos: null,
  origenDeLasNotas: null,
};

/**
 * Las lecturas de la ficha de `personaId` para ese origen. Una función nueva por llamada: quien la usa la memoriza por origen y
 * persona. Lo que ve el mentor no cambia: son las mismas rutas que ya leía su ficha (spec 055). Con `sinPrograma` (spec 056, un mentor que no
 * sigue su programa) no hay nada que pedirle al servidor: todas las lecturas van en `null`.
 */
export function lecturasDeLaFicha(origen: OrigenDeLaFicha, personaId: string, opciones: { sinPrograma?: boolean } = {}): LecturasDeLaFicha {
  /* Spec 056 FR-022: una persona que no sigue su programa (un mentor que no lo activó) no tiene semana, días ni nada que leer del programa. */
  if (opciones.sinPrograma) return SIN_LECTURAS;
  const grupoId = origen.grupoId;

  if (origen.quien === 'mentor') {
    if (grupoId === null) return SIN_LECTURAS;
    return {
      cargarSemana: semanaHasta => obtenerSemanaDelAprendiz(grupoId, personaId, semanaHasta),
      cargarDias: (desde, hasta) => obtenerDiasDelAprendiz(grupoId, personaId, desde, hasta),
      cargarRadar: cursor => obtenerRadarDeAlumno(grupoId, personaId, cursor),
      cargarHuecos: lunes => obtenerHuecosDeAlumno(grupoId, personaId, lunes),
      cargarCierres: lunes => obtenerCierresDeAlumno(grupoId, personaId, lunes),
      cargarDiagnostico: () => lecturaParaElMentor(grupoId, personaId),
      cargarOchentaVeinte: (tipo, inicio) => obtenerOchentaVeinteDeUnAlumno(grupoId, personaId, tipo, inicio),
      cargarObjetivos: null,
      origenDeLasNotas: { quien: 'mentor', grupoId, aprendizId: personaId },
    };
  }

  return {
    cargarSemana: semanaHasta => obtenerSemanaDeLaFicha(personaId, semanaHasta),
    cargarDias: (desde, hasta) => obtenerDiasDeLaPersona(personaId, desde, hasta),
    cargarRadar: cursor => obtenerRadarDePersona(grupoId, personaId, cursor),
    cargarHuecos: lunes => obtenerHuecosDePersona(grupoId, personaId, lunes),
    cargarCierres: lunes => obtenerCierresDePersona(grupoId, personaId, lunes),
    cargarDiagnostico: () => lecturaParaElLider(grupoId, personaId),
    cargarOchentaVeinte: (tipo, inicio) => obtenerOchentaVeinteDeUnaPersona(grupoId, personaId, tipo, inicio),
    cargarObjetivos: () => obtenerObjetivosDeLaPersona(personaId),
    origenDeLasNotas: { quien: 'lider', personaId },
  };
}
