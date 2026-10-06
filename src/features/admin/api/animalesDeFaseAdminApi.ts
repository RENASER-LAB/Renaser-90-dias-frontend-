import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import { z } from 'zod';
import {
  animalesDeFaseApiSchema,
  BASE_DE_ANIMALES_DE_FASE as BASE,
  type AnimalDeFaseApi,
} from '../../yo/api/animalesDeFaseApi';

/**
 * Cambiar el animal de una fase (backend D-258): solo ADMIN y ALCHEMIST activos; cualquier otro recibe
 * 403 del servidor, que es quien autoriza. Todo lo que cambia algo devuelve las cuatro fases enteras.
 * La imagen se sube en tres pasos, como la portada de un evento: pedir dónde subirla, subirla directo
 * al almacenamiento y confirmar con la RUTA del primer paso (el servidor la revisa al confirmar).
 */
const subidaSchema = z.object({ url: z.string(), ruta: z.string() }).passthrough();
export type SubidaDeImagenApi = z.infer<typeof subidaSchema>;

async function pedir(metodo: 'POST' | 'PUT' | 'DELETE', ruta: string, body?: unknown): Promise<AnimalDeFaseApi[]> {
  return validarRespuesta<AnimalDeFaseApi[]>(
    animalesDeFaseApiSchema,
    await apiFetch<unknown>(`${BASE}${ruta}`, { method: metodo, body }),
    `${metodo} ${BASE}${ruta}`,
  );
}

export async function solicitarSubidaDeImagenDeFase(fase: number, tipoContenido: string): Promise<SubidaDeImagenApi> {
  const ruta = `/${fase}/image/upload-url`;
  return validarRespuesta<SubidaDeImagenApi>(
    subidaSchema,
    await apiFetch<unknown>(`${BASE}${ruta}`, { method: 'POST', body: { contentType: tipoContenido } }),
    `POST ${BASE}${ruta}`,
  );
}

export const confirmarImagenDeFase = (fase: number, ruta: string) => pedir('POST', `/${fase}/image/confirm`, { ruta });
export const restaurarImagenDeFase = (fase: number) => pedir('DELETE', `/${fase}/image`);
/** Un nombre vacío vuelve al que trae la app. */
export const cambiarNombreDelAnimal = (fase: number, nombre: string) => pedir('PUT', `/${fase}/name`, { nombre });
