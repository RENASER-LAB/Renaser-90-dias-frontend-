import { ApiError, apiFetch } from '../../../services/http/apiClient';
import type { AlumnoCelula, MiCelula } from '../types/mentor.types';
import {
  celulaDetalleSchema,
  celulaResumenSchema,
  cohorteSchema,
  validarRespuesta,
  type CelulaDetalleApi,
  type CelulaResumenApi,
  type CohorteApi,
} from './mentorSchemas';

/**
 * La célula que acompaña el mentor, encadenando endpoints que YA EXISTEN.
 *
 * No hace falta un endpoint nuevo. Revisado el backend el 2026-09-09, tres rutas de
 * `/api/v1/admin/**` dejan pasar a un MENTOR y le devuelven solo lo suyo — y no es solo lo que
 * dicen sus anotaciones, está implementado:
 *
 *   `CohorteService.listar`      → `if (actor.role() == MENTOR) loadCelulaPort.porMentor(actorId)`
 *   `CelulaService.listarPorCohorte` → el mismo filtro
 *   `CelulaService.obtener`      → idem, sobre la célula que lidera
 *
 * De ahí la cadena de tres saltos:
 *
 *   1. `GET /admin/cohorts`               → su cohorte (lista vacía si no lidera ninguna célula)
 *   2. `GET /admin/cells?cohortId=…`      → la célula que lidera dentro de esa cohorte
 *   3. `GET /admin/cells/{id}`            → el detalle, que es el único que trae `members`
 *
 * Son tres peticiones donde bastaría una. Se asume a propósito: un endpoint dedicado es trabajo
 * de backend, y esto funciona hoy sin pedirle nada a nadie. Si algún día existe
 * `GET /api/v1/mentor/celula`, se cambia SOLO esta función — los hooks y las pantallas leen
 * `MiCelula`, que no cambia.
 *
 * Lo que estas rutas NO dan es el progreso de cada aprendiz: `PerfilBasicoResponse` es
 * `{id, fullName, avatarUrl}` y nada más. El día de programa, los hábitos de la semana y las
 * evidencias pendientes viven en `participantes_programa` y en los módulos de hábitos y
 * evidencia, sin endpoint que los exponga por célula. Por eso se rellenan con `null`, que la
 * interfaz pinta como «—» y no como cero.
 */
export async function obtenerMiCelula(): Promise<MiCelula> {
  const cohortes = validarRespuesta<CohorteApi[]>(
    cohorteSchema.array(),
    await apiFetch<unknown>('/api/v1/admin/cohorts'),
    'GET /api/v1/admin/cohorts',
  );
  if (cohortes.length === 0) throw new SinCelula();

  /* Una cohorte activa por mentor es el caso real; si hubiera varias se toma la primera, que
     es lo que el backend devuelve para un MENTOR (una sola, la de su célula). */
  const celulas = validarRespuesta<CelulaResumenApi[]>(
    celulaResumenSchema.array(),
    await apiFetch<unknown>(`/api/v1/admin/cells?cohortId=${encodeURIComponent(cohortes[0].id)}`),
    'GET /api/v1/admin/cells',
  );
  if (celulas.length === 0) throw new SinCelula();

  const detalle = validarRespuesta<CelulaDetalleApi>(
    celulaDetalleSchema,
    await apiFetch<unknown>(`/api/v1/admin/cells/${encodeURIComponent(celulas[0].id)}`),
    'GET /api/v1/admin/cells/{id}',
  );

  const alumnos: AlumnoCelula[] = detalle.members.map(m => ({
    participanteId: m.id,
    nombre: m.fullName,
    /* Todo lo de abajo es `null` y NO cero: son datos que existen en la base
       (`participantes_programa.dia_programa`, habitos, evidencias) pero que ningun endpoint
       expone por celula todavia. Cero seria mentir. */
    diaPrograma: null,
    ultimaActividadEn: null,
    habitosProgramados: null,
    habitosCumplidos: null,
    evidenciasPendientes: null,
  }));

  return {
    celula: {
      id: detalle.id,
      nombre: detalle.name,
      cohorte: cohortes[0].name,
      proximaSesionEn: detalle.nextSessionAt,
      urlVideollamada: detalle.videoCallUrl,
    },
    alumnos,
  };
}

/** El mentor no lidera ninguna célula todavía. Es un estado válido, no un fallo. */
export class SinCelula extends Error {
  constructor() {
    super('Todavía no lideras ninguna célula.');
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
