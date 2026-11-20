import { z } from 'zod';

import { ApiError, apiFetch } from '../../../services/http/apiClient';
import type { HistorialRadarApi } from '../../radar/types/radar.types';
import type { AlumnoCelula, MiCelula } from '../types/mentor.types';
import { aSemanaDePersona, cumplimientoDelLiderSchemas } from '../../lider-mentores/api/cumplimientoDelLiderSchemas';
import { leerObjetivosDeLaPersona } from '../../lider-mentores/api/objetivosDeLaPersonaSchemas';
import type { ObjetivosDeLaPersona } from '../../lider-mentores/types/objetivosDeLaPersona.types';
import type { SemanaDePersona } from '../../lider-mentores/types/cumplimientoDelLider.types';
import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';
import {
  aprendicesGrupoSchema,
  diasDelAprendizSchema,
  contextoMentorSchema,
  evaluacionPropiaSchema,
  radarDelAlumnoSchema,
  rankingGruposSchema,
  validarRespuesta,
  type AprendicesGrupoApi,
  type AsignacionMentorApi,
  type ContextoMentorApi,
  type EvaluacionPropiaApi,
  type RankingGruposApi,
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
 *
 * `grupoElegido`: cuál de sus grupos mirar. Si ya no lo acompaña (rotó) o no se eligió ninguno,
 * se abre el primero de `gruposQueAcompana`.
 */
export async function obtenerMiCelula(grupoElegido: string | null = null): Promise<MiCelula> {
  const contexto = validarRespuesta<ContextoMentorApi>(
    contextoMentorSchema,
    await apiFetch<unknown>('/api/v1/mentor/context'),
    'GET /api/v1/mentor/context',
  );

  const grupos = gruposQueAcompana(contexto.assignments);
  const grupo = grupos.find(g => g.groupId === grupoElegido) ?? grupos[0];
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

  return { celula: celulaDe(grupo), alumnos, grupos: grupos.map(celulaDe) };
}

function celulaDe(grupo: AsignacionMentorApi): MiCelula['celula'] {
  return {
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
  };
}

/**
 * Los grupos en curso que acompaña, uno por grupo, con los estables primero: sin grupo elegido,
 * "Mi grupo" abre el estable y la recepción queda como otra opción (plan.md §10). Desde D-141 un
 * mentor puede tener varios; antes la app se quedaba con uno solo y los demás no se veían.
 *
 * El servidor ya filtra los vigentes (asignación abierta y periodo del grupo sin cerrar). Se
 * deduplica por `groupId` por si una misma persona figurara con dos funciones en el mismo grupo.
 */
export function gruposQueAcompana(asignaciones: AsignacionMentorApi[]): AsignacionMentorApi[] {
  const unicos = new Map<string, AsignacionMentorApi>();
  for (const a of asignaciones) if (!unicos.has(a.groupId)) unicos.set(a.groupId, a);
  const lista = [...unicos.values()];
  return [...lista.filter(a => a.type === 'REGULAR'), ...lista.filter(a => a.type !== 'REGULAR')];
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
      await apiFetch<unknown>('/api/v1/mentor/context', { timeoutMs: 15_000 }),
      'GET /api/v1/mentor/context',
    );
    return contexto.capabilities;
  } catch {
    return null;
  }
}

/**
 * El Código Renaser de un aprendiz: sus registros horarios (los días 1 a 7 y, desde el 8, los de Mi Radar).
 *
 * Paginado por cursor, de lo más nuevo a lo más viejo, igual que `/api/v1/radar/history`.
 * `nextCursor` se normaliza a `null` —nunca `undefined`— para que quien llame tenga una sola
 * forma de preguntar si hay más páginas.
 *
 * Una lista vacía acá es el caso esperado, no un fallo. Desde la spec 012 trae además `miRadar` (si la persona
 * lo encendió y a qué horas) y sus registros siguen desde el día 8.
 */
export async function obtenerRadarDeAlumno(
  grupoId: string,
  alumnoId: string,
  cursor?: string | null,
): Promise<HistorialRadarApi> {
  const ruta =
    `/api/v1/mentor/groups/${encodeURIComponent(grupoId)}/learners/${encodeURIComponent(alumnoId)}/radar` +
    (cursor ? `?cursor=${encodeURIComponent(cursor)}` : '');

  const datos = validarRespuesta<HistorialRadarApi>(
    radarDelAlumnoSchema,
    await apiFetch<unknown>(ruta),
    'GET /api/v1/mentor/groups/{g}/learners/{u}/radar',
  );
  return { entries: datos.entries, nextCursor: datos.nextCursor ?? null, miRadar: datos.miRadar ?? null };
}

/**
 * Spec 057 FR-001: los objetivos de un aprendiz que el mentor acompaña hoy, con la misma forma que los del líder más `duracionDias` y
 * `fase`. 403 = ya no lo acompaña; 404 con `codigo: SIN_PROGRAMA_ACTIVO` = sin programa, Día 0 o suspendido (lo lee quien lo muestra).
 */
export async function obtenerObjetivosDelAprendiz(grupoId: string, aprendizId: string): Promise<ObjetivosDeLaPersona> {
  const ruta = `/api/v1/mentor/groups/${encodeURIComponent(grupoId)}/learners/${encodeURIComponent(aprendizId)}/objetivos`;
  return leerObjetivosDeLaPersona(await apiFetch<unknown>(ruta), 'GET /api/v1/mentor/groups/{g}/learners/{u}/objetivos');
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

/** Spec 055 FR-011: la semana del aprendiz (sábado a viernes) con `diaUno`, el primer día de su programa (`null` si no lo activó). */
export type SemanaDelAprendiz = SemanaDePersona & { diaUno: string | null };

const rutaDelAprendiz = (grupoId: string, aprendizId: string) =>
  `/api/v1/mentor/groups/${encodeURIComponent(grupoId)}/learners/${encodeURIComponent(aprendizId)}`;

/**
 * `GET /mentor/groups/{g}/learners/{u}/semana?semanaHasta=` (spec 055, contrato `api.md`): la MISMA semana que arma la ficha del
 * líder, con la puerta del mentor (acompañante vigente de ese grupo). `semanaHasta` es un viernes; sin él, la semana en curso en la
 * zona del aprendiz —que no es la del teléfono, así que no se calcula acá—. 400 `SEMANA_INVALIDA` / `FUERA_DEL_PROGRAMA`,
 * 403 `NO_ACOMPANA`: el `ApiError` trae el motivo del servidor.
 */
export async function obtenerSemanaDelAprendiz(grupoId: string, aprendizId: string, semanaHasta?: string | null): Promise<SemanaDelAprendiz> {
  const ruta = `${rutaDelAprendiz(grupoId, aprendizId)}/semana${semanaHasta ? `?semanaHasta=${encodeURIComponent(semanaHasta)}` : ''}`;
  return aSemanaDelAprendiz(await apiFetch<unknown>(ruta), aprendizId, 'GET /api/v1/mentor/groups/{g}/learners/{u}/semana');
}

/**
 * Valida y normaliza una respuesta de `…/semana`. Es la misma forma por la puerta del mentor y por la del líder (spec 056: `GET
 * /leadership/people/{p}/semana`), así que las dos pasan por acá. Si el servidor no repitió quién es, es a quien se pidió.
 */
export function aSemanaDelAprendiz(crudo: unknown, aprendizId: string, origen: string): SemanaDelAprendiz {
  const semana = aSemanaDePersona(validarRespuesta(cumplimientoDelLiderSchemas.semana, crudo, origen));
  const diaUno = (crudo as { diaUno?: unknown } | null)?.diaUno;
  return { ...semana, personaId: semana.personaId || aprendizId, diaUno: typeof diaUno === 'string' ? diaUno : null };
}

/** El color de un día del semáforo, tal como lo calculó el servidor (`/dias`). */
export interface DiaDeColor {
  fecha: string;
  color: ColorSemaforo;
  porcentaje: number | null;
  /** `MEDIDO`, `SIN_DATOS`, `PAUSADO`, `CUENTA_SUSPENDIDA`, `PENDIENTE`; lo que no se conoce llega como `SIN_DATOS`. */
  estado: string;
}

export interface DiasDelAprendiz {
  zona: string | null;
  diaUno: string | null;
  dias: DiaDeColor[];
}

const COLORES_CONOCIDOS: readonly string[] = ['VERDE', 'AMARILLO', 'ROJO'];

/** `GET /mentor/groups/{g}/learners/{u}/dias?desde&hasta` (spec 055 FR-012): máximo 62 días; 400 `RANGO_INVALIDO` si se pasa. */
export async function obtenerDiasDelAprendiz(grupoId: string, aprendizId: string, desde: string, hasta: string): Promise<DiasDelAprendiz> {
  const ruta = `${rutaDelAprendiz(grupoId, aprendizId)}/dias?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
  return aDiasDelAprendiz(await apiFetch<unknown>(ruta), 'GET /api/v1/mentor/groups/{g}/learners/{u}/dias');
}

/** Valida y normaliza una respuesta de `…/dias`: la misma forma por la puerta del mentor y por la del líder (spec 056). */
export function aDiasDelAprendiz(crudo: unknown, origen: string): DiasDelAprendiz {
  const datos = validarRespuesta<{ zona?: string | null; diaUno?: string | null; dias: Array<{ fecha: string; estado?: string | null; color?: string | null; porcentaje?: number | null }> }>(
    diasDelAprendizSchema,
    crudo,
    origen,
  );
  return {
    zona: datos.zona ?? null,
    diaUno: datos.diaUno ?? null,
    dias: datos.dias.map(d => {
      const color = d.color?.trim().toUpperCase() ?? '';
      return {
        fecha: d.fecha,
        color: COLORES_CONOCIDOS.includes(color) ? (color as ColorSemaforo) : 'SIN_DATOS',
        porcentaje: typeof d.porcentaje === 'number' ? d.porcentaje : null,
        estado: d.estado?.trim().toUpperCase() || 'SIN_DATOS',
      };
    }),
  };
}

// ------------------------------------------------------------------------------------------
// Spec 055, historia 4: la nota privada del mentor sobre un aprendiz
// ------------------------------------------------------------------------------------------

/** Una nota privada. `puedeCorregir` lo decide el servidor (solo su autor y solo el día en que la escribió); la app no lo recalcula. */
export interface NotaDelMentor {
  id: string;
  texto: string;
  autor: { id: string; nombre: string | null };
  creadoEn: string;
  corregidoEn: string | null;
  puedeCorregir: boolean;
}

/** Quién lee: el mentor que lo acompaña hoy (y escribe), el líder de su formación o Administración (solo leen). */
export type OrigenDeLasNotas =
  | { quien: 'mentor'; grupoId: string; aprendizId: string }
  | { quien: 'lider'; personaId: string }
  | { quien: 'admin'; aprendizId: string };

/** El largo máximo de una nota, sin contar los espacios de los extremos (FR-026). */
export const LARGO_MAXIMO_DE_LA_NOTA = 2000;

const notaSchema = z
  .object({
    id: z.string(),
    texto: z.string(),
    autor: z.object({ id: z.string(), nombre: z.string().nullish() }).passthrough(),
    creadoEn: z.string(),
    corregidoEn: z.string().nullish(),
    puedeCorregir: z.boolean().nullish(),
  })
  .passthrough();
const notasSchema = z.object({ notas: z.array(notaSchema) }).passthrough();

function aNota(n: z.infer<typeof notaSchema>, soloLectura: boolean): NotaDelMentor {
  return {
    id: n.id,
    texto: n.texto,
    autor: { id: n.autor.id, nombre: n.autor.nombre?.trim() || null },
    creadoEn: n.creadoEn,
    corregidoEn: n.corregidoEn ?? null,
    /* Quien solo lee nunca corrige, diga lo que diga el cuerpo: la regla es del servidor, pero la puerta de lectura también. */
    puedeCorregir: !soloLectura && n.puedeCorregir === true,
  };
}

function rutaDeLasNotas(origen: OrigenDeLasNotas): string {
  switch (origen.quien) {
    case 'mentor':
      return `${rutaDelAprendiz(origen.grupoId, origen.aprendizId)}/notas`;
    case 'lider':
      return `/api/v1/leadership/people/${encodeURIComponent(origen.personaId)}/notas`;
    case 'admin':
      return `/api/v1/admin/trainees/${encodeURIComponent(origen.aprendizId)}/notas`;
  }
}

/** `GET …/notas`: de la más nueva a la más vieja. Al líder y a Administración solo se les lee (FR-024). */
export async function obtenerNotasDelAprendiz(origen: OrigenDeLasNotas): Promise<NotaDelMentor[]> {
  const datos = validarRespuesta<z.infer<typeof notasSchema>>(notasSchema, await apiFetch<unknown>(rutaDeLasNotas(origen)), 'GET …/notas');
  return datos.notas.map(n => aNota(n, origen.quien !== 'mentor'));
}

/** `POST /notas` `{ texto }` → 201 con la nota creada. 400 `NOTA_INVALIDA`, 403 `NO_ACOMPANA`. */
export async function crearNotaDelAprendiz(grupoId: string, aprendizId: string, texto: string): Promise<NotaDelMentor> {
  const crudo = await apiFetch<unknown>(`${rutaDelAprendiz(grupoId, aprendizId)}/notas`, { method: 'POST', body: { texto } });
  return aNota(validarRespuesta<z.infer<typeof notaSchema>>(notaSchema, crudo, 'POST …/notas'), false);
}

/** `PATCH /notas/{id}` `{ texto }`. 403 `NO_ES_EL_AUTOR`, 409 `YA_NO_SE_PUEDE_CORREGIR`. */
export async function corregirNotaDelAprendiz(grupoId: string, aprendizId: string, notaId: string, texto: string): Promise<NotaDelMentor> {
  const crudo = await apiFetch<unknown>(`${rutaDelAprendiz(grupoId, aprendizId)}/notas/${encodeURIComponent(notaId)}`, {
    method: 'PATCH',
    body: { texto },
  });
  return aNota(validarRespuesta<z.infer<typeof notaSchema>>(notaSchema, crudo, 'PATCH …/notas/{id}'), false);
}
