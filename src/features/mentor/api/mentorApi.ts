import { ApiError, apiFetch } from '../../../services/http/apiClient';
import type { AlumnoCelula, MiCelula } from '../types/mentor.types';
import {
  aprendicesGrupoSchema,
  contextoMentorSchema,
  evaluacionPropiaSchema,
  rankingGruposSchema,
  semanaAlumnoSchema,
  validarRespuesta,
  type AprendicesGrupoApi,
  type AsignacionMentorApi,
  type ContextoMentorApi,
  type EvaluacionPropiaApi,
  type RankingGruposApi,
  type SemanaAlumnoApi,
} from './mentorSchemas';

/** Tope por página. El backend además recorta a 100; esto solo evita ida y vuelta de más. */
const POR_PAGINA = 50;

/**
 * Qué acompaña esta persona y quiénes son sus aprendices.
 *
 * Antes esto encadenaba tres llamadas a `/api/v1/admin/**` — cohortes, células de la cohorte,
 * detalle de la célula — y se quedaba con el primer elemento de cada lista. Funcionaba, pero
 * tenía dos problemas de fondo: hacía pasar a un mentor por superficie de administración, y
 * "el primero de la lista" no es lo mismo que "el suyo". Con más de una célula devuelta, el
 * mentor habría visto la equivocada sin que nada fallara.
 *
 * Ahora hay dos rutas propias, y la autorización la resuelve el servidor:
 *
 *   `GET /api/v1/mentor/context`                      → sus asignaciones vigentes
 *   `GET /api/v1/mentor/groups/{groupId}/learners`    → el roster de un grupo que sí acompaña
 *
 * La segunda comprueba relación VIGENTE antes de devolver un solo nombre: un exmentor con el
 * token todavía válido recibe 403, no la lista.
 */
export async function obtenerMiCelula(): Promise<MiCelula> {
  const contexto = validarRespuesta<ContextoMentorApi>(
    contextoMentorSchema,
    await apiFetch<unknown>('/api/v1/mentor/context'),
    'GET /api/v1/mentor/context',
  );

  const grupo = grupoQueAcompana(contexto.assignments);
  if (!grupo) throw new SinCelula();

  const aprendices = await todosLosAprendices(grupo.groupId);

  const alumnos: AlumnoCelula[] = aprendices.map(a => ({
    participanteId: a.userId,
    nombre: a.fullName,
    /* `null` y NO cero. El día de programa, los hábitos de la semana y las evidencias
       pendientes existen en la base, pero los sirve la consulta semanal de seguimiento, que
       es otra lectura. Cero diría "no cumplió", que es una afirmación distinta de "no lo sé"
       (plan.md §7: un dato ausente no significa incumplimiento). */
    diaPrograma: null,
    ultimaActividadEn: null,
    habitosProgramados: null,
    habitosCumplidos: null,
    evidenciasPendientes: null,
  }));

  return {
    celula: {
      id: grupo.groupId,
      nombre: grupo.groupName,
      cohorte: null,
      cohorteId: grupo.cohortId,
      proximaSesionEn: null,
      urlVideollamada: null,
      tipo: grupo.type === 'RECEPCION' ? 'recepcion' : 'regular',
      cobertura: coberturaDe(grupo.coverage),
      cupo: grupo.capacity,
      funcion: grupo.function,
      desde: grupo.from,
      hasta: grupo.to,
    },
    alumnos,
  };
}

/**
 * El grupo estable gana sobre la recepción cuando alguien atiende las dos cosas: "Mi grupo"
 * es el grupo, y la recepción se muestra como una entrada aparte (plan.md §10). No es "el
 * primero de la lista": es una preferencia explícita.
 */
function grupoQueAcompana(asignaciones: AsignacionMentorApi[]): AsignacionMentorApi | null {
  return asignaciones.find(a => a.type === 'REGULAR') ?? asignaciones[0] ?? null;
}

/**
 * Recorre el cursor hasta agotar el grupo. Un grupo estable son 10 y entra en una página; la
 * recepción no tiene tope y puede necesitar varias.
 */
async function todosLosAprendices(grupoId: string): Promise<AprendicesGrupoApi['learners']> {
  const acumulado: AprendicesGrupoApi['learners'] = [];
  let cursor: string | null = null;

  /* Cota dura: si el servidor devolviera siempre el mismo cursor, esto se detiene igual en
     vez de girar para siempre y colgar la pantalla. */
  for (let pagina = 0; pagina < 40; pagina++) {
    /* Anotados a mano: sin el tipo explicito, TypeScript ve un ciclo — `cursor` sale de
       `respuesta`, que sale de `ruta`, que sale de `cursor` — y se rinde con TS7022. */
    const ruta: string =
      `/api/v1/mentor/groups/${encodeURIComponent(grupoId)}/learners?limit=${POR_PAGINA}` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');

    const respuesta: AprendicesGrupoApi = validarRespuesta<AprendicesGrupoApi>(
      aprendicesGrupoSchema,
      await apiFetch<unknown>(ruta),
      'GET /api/v1/mentor/groups/{groupId}/learners',
    );
    acumulado.push(...respuesta.learners);
    if (!respuesta.nextCursor) return acumulado;
    cursor = respuesta.nextCursor;
  }
  return acumulado;
}

function coberturaDe(valor: string): MiCelula['celula']['cobertura'] {
  return valor === 'CON_MENTOR' ? 'con_mentor' : valor === 'SOPORTE' ? 'soporte' : 'sin_cobertura';
}

/**
 * Qué le corresponde a esta persona con su propio programa de 90 días.
 *
 * Se pregunta al servidor en vez de deducirlo del rol. Deducirlo es justo lo que fallaba antes:
 * los roles viven en dos idiomas —castellano en la base, inglés en Java— y comprobar solo uno
 * hace que un mentor caiga en la rama del aprendiz sin que nada avise.
 *
 * Devuelve `null` si no se pudo averiguar (endpoint sin desplegar, sin red). Quien llama debe
 * tratar ese `null` como "no sé", nunca como "no es obligatorio": un gate que se abre ante la
 * duda deja pasar a quien sí tenía que completar su onboarding.
 */
export async function capacidadesDePrograma(): Promise<ContextoMentorApi['capabilities'] | null> {
  try {
    const contexto = validarRespuesta<ContextoMentorApi>(
      contextoMentorSchema,
      await apiFetch<unknown>('/api/v1/mentor/context'),
      'GET /api/v1/mentor/context',
    );
    return contexto.capabilities;
  } catch {
    return null;
  }
}

/**
 * `POST /api/v1/mentor/activate-tracking` — inicia el programa personal de 90 días.
 *
 * Solo el propio actor: el endpoint no acepta el id de nadie más, así que no hay forma de
 * activarle el programa a otra persona por esta vía.
 *
 * NO existe la contraparte automática: `DELETE` borra la participación y con ella el progreso.
 * Que "Ahora no" fuera un DELETE convertiría un "todavía no" en una pérdida de datos, así que
 * posponer es simplemente no llamar a nada.
 */
export async function activarProgramaPersonal(): Promise<void> {
  await apiFetch<unknown>('/api/v1/mentor/activate-tracking', { method: 'POST' });
}

/**
 * La semana de un aprendiz. `inicio` en formato YYYY-MM-DD; sin él, el servidor devuelve la
 * semana en curso **en la zona del alumno** — que no es necesariamente la del mentor ni la del
 * teléfono, así que no se calcula acá.
 */
export async function obtenerSemanaDeAlumno(
  grupoId: string,
  alumnoId: string,
  inicio?: string,
): Promise<SemanaAlumnoApi> {
  const ruta =
    `/api/v1/mentor/groups/${encodeURIComponent(grupoId)}/learners/${encodeURIComponent(alumnoId)}/progress` +
    (inicio ? `?weekStart=${encodeURIComponent(inicio)}` : '');

  return validarRespuesta<SemanaAlumnoApi>(
    semanaAlumnoSchema,
    await apiFetch<unknown>(ruta),
    'GET /api/v1/mentor/groups/{g}/learners/{u}/progress',
  );
}

/**
 * La evaluación propia del mes. `mes` en formato YYYY-MM.
 *
 * El porcentaje llega calculado: la app NO lo recalcula. Si el frontend hiciera su propia
 * cuenta, tarde o temprano diría un número distinto del que ve el administrador.
 */
export async function obtenerEvaluacionPropia(mes: string): Promise<EvaluacionPropiaApi> {
  return validarRespuesta<EvaluacionPropiaApi>(
    evaluacionPropiaSchema,
    await apiFetch<unknown>(`/api/v1/mentor/me/evaluation?month=${encodeURIComponent(mes)}`),
    'GET /api/v1/mentor/me/evaluation',
  );
}

/** El mentor no acompaña ninguna célula todavía. Es un estado válido, no un fallo. */
export class SinCelula extends Error {
  constructor() {
    super('Todavía no acompañas ningún grupo.');
    this.name = 'SinCelula';
  }
}

export function esSinCelula(error: unknown): boolean {
  return error instanceof SinCelula;
}

/** El endpoint no está desplegado (404), frente a "falló la red" o "no autorizado". */
export function esNoDisponible(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Sin permiso sobre esa célula. */
export function esProhibido(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

/** No hubo respuesta: backend apagado, sin red, URL mal puesta. */
export function esDeRed(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

/**
 * Ranking mensual entre los grupos de una cohorte.
 *
 * El porcentaje y la posición llegan calculados. La app no ordena ni redondea antes de
 * comparar: redondear antes de ordenar junta en un empate a dos grupos que no empataron.
 */
export async function obtenerRankingDeGrupos(cohorteId: string, mes: string): Promise<RankingGruposApi> {
  return validarRespuesta<RankingGruposApi>(
    rankingGruposSchema,
    await apiFetch<unknown>(
      `/api/v1/ranking/groups?cohortId=${encodeURIComponent(cohorteId)}&month=${encodeURIComponent(mes)}`,
    ),
    'GET /api/v1/ranking/groups',
  );
}
