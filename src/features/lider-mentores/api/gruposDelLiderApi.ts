import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { agregarAprendiz, asignarMentor, listarGruposDeCohorte, quitarMentor, sumarMentorAGrupo } from '../../admin/api/adminApi';
import { grupoDetalleSchema, perfilAdminSchema, type GrupoDetalleApi } from '../../admin/api/adminSchemas';
import { planParaAsignarMentor } from '../../admin/utils/asignarMentor';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import type { GrupoDelLider } from '../types/gruposDelLider.types';

/**
 * Los grupos del líder (spec 056 FR-006 a FR-010). Todo sale de `/admin/cells…`, que desde el 18/11 el líder también puede usar sobre las
 * formaciones que tiene activas; fuera de ellas el servidor responde 403 `FUERA_DE_SU_ALCANCE`, con su motivo.
 *
 * El tablero (`/admin/cells/dashboard`) trae todos los grupos de sus formaciones, con su generación, su mentor y su tope. No dice el tipo ni
 * si el grupo está en curso: eso lo trae la lista de cada generación (`/admin/cells?cohortId=`), que se pide una vez por generación. Si esa
 * segunda lectura cae, el grupo se lee con lo del tablero (en curso si su generación está activa) y no se pierde ninguno.
 */
const tableroSchema = z.array(
  z
    .object({
      id: z.string(),
      name: z.string(),
      cohortId: z.string(),
      cohortStatus: z.string().nullish(),
      memberCount: z.number().nullish(),
      mentor: perfilAdminSchema.nullish(),
      formation: z.string().nullish(),
      capacity: z.number().nullish(),
    })
    .passthrough(),
);

const ESTADOS_EN_CURSO = new Set(['VIGENTE', 'SIN_PERIODO']);

export async function obtenerGruposDelLider(): Promise<GrupoDelLider[]> {
  const tablero = validarRespuesta<z.infer<typeof tableroSchema>>(tableroSchema, await apiFetch<unknown>('/api/v1/admin/cells/dashboard'), 'GET /admin/cells/dashboard');
  const cohortes = [...new Set(tablero.map(g => g.cohortId))];
  const porCohorte = await Promise.allSettled(cohortes.map(id => listarGruposDeCohorte(id)));
  const detalle = new Map<string, { status?: string | null; type?: string | null; learnerCount?: number | null }>();
  for (const r of porCohorte) if (r.status === 'fulfilled') for (const g of r.value) detalle.set(g.id, g);

  return tablero.map(g => {
    const d = detalle.get(g.id);
    const cohorteActiva = g.cohortStatus === 'ACTIVE';
    return {
      id: g.id,
      nombre: g.name.trim() || 'Grupo sin nombre',
      cohorteId: g.cohortId,
      formacion: g.formation ?? null,
      mentorId: g.mentor?.id ?? null,
      mentorNombre: g.mentor?.fullName?.trim() || null,
      aprendices: d?.learnerCount ?? g.memberCount ?? null,
      cupo: g.capacity ?? null,
      esRecepcion: d?.type === 'RECEPCION' || d?.type === 'RECEPTION',
      enCurso: d?.status ? ESTADOS_EN_CURSO.has(d.status) : cohorteActiva,
      cohorteActiva,
    };
  });
}

/**
 * `POST /admin/cells`: un grupo regular nuevo, sin período (no caduca) y con el tope de la política de su generación. Nace en la formación del
 * líder (`formacion`); sin ella, en la Escuela. Devuelve el grupo para sumarle el mentor y los aprendices.
 */
export async function crearGrupoDelLider(datos: { nombre: string; cohorteId: string; formacion: string | null }): Promise<GrupoDetalleApi> {
  return validarRespuesta<GrupoDetalleApi>(
    grupoDetalleSchema,
    await apiFetch<unknown>('/api/v1/admin/cells', {
      method: 'POST',
      body: { name: datos.nombre.trim(), cohortId: datos.cohorteId, type: 'REGULAR', ...(datos.formacion ? { formation: datos.formacion } : {}) },
    }),
    'POST /admin/cells',
  );
}

/**
 * «Asignar» o «Cambiar mentor» de un grupo (spec 056 FR-009), con la regla de Administración (E-372): el mentor conserva los grupos que ya acompaña. Sin otros
 * grupos es el traslado de siempre (`PUT …/mentor`, que además saca al mentor que tuviera el grupo); con otros, se suma (`POST …/additional-mentor`) y, si el
 * grupo tenía otro mentor, antes se lo quita. Si la segunda operación falla tras quitar al anterior, el grupo queda sin mentor y se dice. Devuelve `nada` si
 * ya era su mentor.
 */
export async function asignarMentorDelLider(
  grupo: { id: string; nombre: string; mentorId: string | null },
  mentor: { userId: string; fullName: string; grupos: readonly string[] },
): Promise<'nada' | 'asignado'> {
  const plan = planParaAsignarMentor({ grupoId: grupo.id, mentorDelGrupoId: grupo.mentorId, mentor: { userId: mentor.userId, cellId: null, cellIds: [...mentor.grupos] } });
  if (plan.tipo === 'nada') return 'nada';
  if (plan.tipo === 'asignar') {
    await asignarMentor(grupo.id, mentor.userId);
    return 'asignado';
  }
  if (plan.quitarAlActual) await quitarMentor(grupo.id);
  try {
    await sumarMentorAGrupo(grupo.id, mentor.userId);
  } catch (e) {
    if (!plan.quitarAlActual) throw e;
    throw new Error(`${grupo.nombre} quedó sin mentor: no se pudo sumar a ${mentor.fullName}. Vuelve a elegirlo.`);
  }
  return 'asignado';
}

/**
 * Suma aprendices sin grupo a un grupo (spec 056 FR-009), uno por uno y en orden: el servidor valida el cupo y el alcance de cada uno. Se detiene en el
 * primer rechazo y dice cuántos entraron (`sumados`) y por qué paró (`fallo`).
 */
export async function sumarAprendicesAlGrupo(grupoId: string, aprendizIds: readonly string[]): Promise<{ sumados: number; fallo: unknown | null }> {
  let sumados = 0;
  for (const id of aprendizIds) {
    try {
      await agregarAprendiz(grupoId, id);
      sumados += 1;
    } catch (e) {
      return { sumados, fallo: e };
    }
  }
  return { sumados, fallo: null };
}
