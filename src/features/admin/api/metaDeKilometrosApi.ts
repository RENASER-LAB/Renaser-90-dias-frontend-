import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import { BASE_DE_HABITOS_DEL_PROGRAMA } from './habitosProgramaApi';

/**
 * La meta diaria de «Kilómetros diarios» (spec 037 del backend, D-310): `GET/PUT /api/v1/admin/habits/{id}/measurement-goal`.
 * Solo ADMIN y ALQUIMISTA; cualquier otro recibe 403 del servidor, que es quien autoriza. `meta: null` en el PUT vuelve a la del
 * programa (5 km). Un backend anterior responde 404: la pantalla no dibuja la sección.
 */
const metaSchema = z
  .object({
    unidad: z.string(),
    meta: z.number(),
    porDefecto: z.number(),
    minimo: z.number(),
    maximo: z.number(),
    esLaPorDefecto: z.boolean(),
  })
  .passthrough();

export type MetaDeKilometros = z.infer<typeof metaSchema>;

const rutaDe = (habitoId: string) => `${BASE_DE_HABITOS_DEL_PROGRAMA}/${encodeURIComponent(habitoId)}/measurement-goal`;

export async function leerLaMetaDeKilometros(habitoId: string): Promise<MetaDeKilometros> {
  const ruta = rutaDe(habitoId);
  return validarRespuesta<MetaDeKilometros>(metaSchema, await apiFetch<unknown>(ruta), `GET ${ruta}`);
}

export async function fijarLaMetaDeKilometros(habitoId: string, meta: number | null): Promise<MetaDeKilometros> {
  const ruta = rutaDe(habitoId);
  return validarRespuesta<MetaDeKilometros>(
    metaSchema,
    await apiFetch<unknown>(ruta, { method: 'PUT', body: { meta } }),
    `PUT ${ruta}`,
  );
}
