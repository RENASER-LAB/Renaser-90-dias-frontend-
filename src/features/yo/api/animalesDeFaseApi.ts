import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';

/**
 * El animal de cada fase tal como lo configuró Administración (backend D-258). Lo lee cualquier cuenta
 * activa (Yo); lo cambia solo Administración y Alquimista (`features/admin/api/animalesDeFaseAdminApi`).
 * `nombre` e `imagenUrl` en `null` = la app usa los que trae incluidos (`data/animalesDeFase.ts`).
 */
export const BASE_DE_ANIMALES_DE_FASE = '/api/v1/phase-animals';

export const animalDeFaseApiSchema = z
  .object({
    fase: z.number(),
    nombre: z.string().nullish(),
    /** URL firmada de lectura; cambia cada hora, por eso `imagenRuta` es la clave de caché. */
    imagenUrl: z.string().nullish(),
    imagenRuta: z.string().nullish(),
    personalizada: z.boolean(),
  })
  .passthrough();

export const animalesDeFaseApiSchema = z.array(animalDeFaseApiSchema);

export type AnimalDeFaseApi = z.infer<typeof animalDeFaseApiSchema>;

export async function leerAnimalesDeFase(): Promise<AnimalDeFaseApi[]> {
  return validarRespuesta<AnimalDeFaseApi[]>(
    animalesDeFaseApiSchema,
    await apiFetch<unknown>(BASE_DE_ANIMALES_DE_FASE),
    `GET ${BASE_DE_ANIMALES_DE_FASE}`,
  );
}
