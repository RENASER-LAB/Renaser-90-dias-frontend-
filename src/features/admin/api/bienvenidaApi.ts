import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import {
  bienvenidaSchema,
  subidaDePortadaSchema,
  type BienvenidaApi,
  type SubidaDePortadaApi,
} from './bienvenidaSchemas';

/**
 * La bienvenida editable (backend D-210, 27/09): Administración y Alquimista cambian desde la app los
 * tres mensajes y la portada de la tarjeta. Todas las operaciones que cambian algo devuelven la
 * bienvenida entera, así la pantalla queda al día sin volver a pedirla.
 *
 * Solo ADMIN y ALCHEMIST activos: cualquier otro recibe 403 del servidor, que es quien autoriza.
 */
const BASE = '/api/v1/admin/bienvenida';

export async function leerBienvenida(): Promise<BienvenidaApi> {
  return validarRespuesta<BienvenidaApi>(bienvenidaSchema, await apiFetch<unknown>(BASE), `GET ${BASE}`);
}

/** Guarda un texto nuevo para esa pieza. El servidor lo revisa igual que la app (marcadores, largo). */
export async function guardarTextoDeBienvenida(clave: string, texto: string): Promise<BienvenidaApi> {
  return validarRespuesta<BienvenidaApi>(
    bienvenidaSchema,
    await apiFetch<unknown>(`${BASE}/textos/${encodeURIComponent(clave)}`, { method: 'PUT', body: { texto } }),
    `PUT ${BASE}/textos/{clave}`,
  );
}

/** Vuelve al texto original (el del archivo del repo). Queda anotado quién lo hizo y cuándo. */
export async function volverAlTextoOriginal(clave: string): Promise<BienvenidaApi> {
  return validarRespuesta<BienvenidaApi>(
    bienvenidaSchema,
    await apiFetch<unknown>(`${BASE}/textos/${encodeURIComponent(clave)}`, { method: 'DELETE' }),
    `DELETE ${BASE}/textos/{clave}`,
  );
}

/**
 * Paso 1 de la portada: dónde subir la imagen. Con el almacenamiento de marcador (local) `url` sale
 * `about:blank#pendiente-s3/...`; quien llama lo detecta con `almacenamientoSinConfigurar` antes del PUT.
 */
export async function solicitarSubidaDePortada(tipoContenido: string): Promise<SubidaDePortadaApi> {
  return validarRespuesta<SubidaDePortadaApi>(
    subidaDePortadaSchema,
    await apiFetch<unknown>(`${BASE}/portada/upload-url`, { method: 'POST', body: { contentType: tipoContenido } }),
    `POST ${BASE}/portada/upload-url`,
  );
}

/** Paso 3: deja vigente la portada ya subida y revisada. Lleva la RUTA del paso 1, no una URL. */
export async function confirmarPortadaDeBienvenida(ruta: string): Promise<BienvenidaApi> {
  return validarRespuesta<BienvenidaApi>(
    bienvenidaSchema,
    await apiFetch<unknown>(`${BASE}/portada/confirm`, { method: 'POST', body: { ruta } }),
    `POST ${BASE}/portada/confirm`,
  );
}

/** Vuelve a la portada original (la tarjeta de Operaciones). */
export async function volverALaPortadaOriginal(): Promise<BienvenidaApi> {
  return validarRespuesta<BienvenidaApi>(
    bienvenidaSchema,
    await apiFetch<unknown>(`${BASE}/portada`, { method: 'DELETE' }),
    `DELETE ${BASE}/portada`,
  );
}

/**
 * La ruta de la vista previa de la tarjeta (`GET …/tarjeta`), relativa al backend. Sin `portada`, la
 * vigente; con `portada`, la candidata recién subida. Es una imagen, así que no pasa por `apiFetch`:
 * la trae `utils/tarjetaDeMuestra.ts`.
 */
export function rutaDeLaTarjetaDeMuestra(nombre: string, portada?: string | null): string {
  const partes = [`nombre=${encodeURIComponent(nombre)}`];
  if (portada) partes.push(`portada=${encodeURIComponent(portada)}`);
  return `${BASE}/tarjeta?${partes.join('&')}`;
}
