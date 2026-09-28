import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import {
  contenidoDeLaCajaSchema,
  detalleDeCajaSchema,
  estadoDeCajaSchema,
  fondoDeLaCartaSchema,
  listaDeCajasSchema,
  miCajaSchema,
  subidaDeCajaSchema,
  type ContenidoDeLaCaja,
  type DetalleDeCaja,
  type DestinoDeMiCaja,
  type FondoDeLaCarta,
  type ListaDeCajas,
  type MiCaja,
  type SubidaDeCaja,
} from './cajaSchemas';

/**
 * La Caja Renaser contra el servidor (backend D-219, spec §9). Solo ADMIN opera; el mentor ve el
 * estado de sus aprendices y el aprendiz, la suya. Quien autoriza es el servidor: un 403 se muestra
 * con palabras, sin pantalla rota.
 *
 * Toda operación del Admin sobre una caja devuelve el detalle entero: la pantalla queda al día sin
 * volver a pedirlo. Un 409 es «falta algo o el estado no corresponde», con el motivo en `message`.
 */
export const BASE_ADMIN = '/api/v1/admin/caja';

const rutaDe = (aprendizId: string) => `${BASE_ADMIN}/${encodeURIComponent(aprendizId)}`;

/**
 * `page` empieza en 0; `size` por defecto 50 y máximo 200 en el servidor. Sin `estado` el servidor
 * devuelve todas menos `NO_APLICA` (spec §11).
 */
export interface FiltroDeCajas {
  estado?: string | null;
  q?: string | null;
  page?: number;
  size?: number;
}

/** La consulta sin `URLSearchParams` (Hermes lo trae a medias), solo con lo que tiene valor. */
export function consultaDeLaLista(filtro: FiltroDeCajas): string {
  const partes: string[] = [];
  if (filtro.estado) partes.push(`estado=${encodeURIComponent(filtro.estado)}`);
  const q = filtro.q?.trim();
  if (q) partes.push(`q=${encodeURIComponent(q)}`);
  if (filtro.page !== undefined) partes.push(`page=${filtro.page}`);
  if (filtro.size !== undefined) partes.push(`size=${filtro.size}`);
  return partes.length > 0 ? `?${partes.join('&')}` : '';
}

export async function listarCajas(filtro: FiltroDeCajas): Promise<ListaDeCajas> {
  return validarRespuesta<ListaDeCajas>(
    listaDeCajasSchema,
    await apiFetch<unknown>(`${BASE_ADMIN}${consultaDeLaLista(filtro)}`),
    `GET ${BASE_ADMIN}`,
  );
}

export async function leerCaja(aprendizId: string): Promise<DetalleDeCaja> {
  return detalle(await apiFetch<unknown>(rutaDe(aprendizId)), 'GET');
}

function detalle(respuesta: unknown, metodo: string, tramo = ''): DetalleDeCaja {
  return validarRespuesta<DetalleDeCaja>(detalleDeCajaSchema, respuesta, `${metodo} ${BASE_ADMIN}/{id}${tramo}`);
}

/** Las acciones de un solo toque: `aprobar`, `armar`, `reenviar`. */
export type AccionSimple = 'aprobar' | 'armar' | 'reenviar';

export async function ejecutarAccion(aprendizId: string, accion: AccionSimple): Promise<DetalleDeCaja> {
  return detalle(await apiFetch<unknown>(`${rutaDe(aprendizId)}/${accion}`, { method: 'POST' }), 'POST', `/${accion}`);
}

export interface DatosParaEnviar {
  medio: string;
  courier: string | null;
  codigo: string;
  costo: number | null;
}

export async function marcarEnviada(aprendizId: string, datos: DatosParaEnviar): Promise<DetalleDeCaja> {
  return detalle(
    await apiFetch<unknown>(`${rutaDe(aprendizId)}/enviar`, { method: 'POST', body: datos }),
    'POST',
    '/enviar',
  );
}

/** `previa`: «Ya se envió antes» (spec §8): entregada sin datos y sin avisarle al aprendiz. */
export async function marcarEntregada(aprendizId: string, previa = false): Promise<DetalleDeCaja> {
  return detalle(
    await apiFetch<unknown>(`${rutaDe(aprendizId)}/entregada`, { method: 'POST', body: previa ? { previa: true } : {} }),
    'POST',
    '/entregada',
  );
}

export type MotivoDeProblema = 'PERDIDA' | 'DANADA' | 'DEVUELTA' | 'OTRO';

export async function reportarProblema(
  aprendizId: string,
  problema: { motivo: MotivoDeProblema; nota: string },
): Promise<DetalleDeCaja> {
  return detalle(
    await apiFetch<unknown>(`${rutaDe(aprendizId)}/problema`, { method: 'POST', body: problema }),
    'POST',
    '/problema',
  );
}

export async function guardarChecklist(aprendizId: string, marcados: string[]): Promise<DetalleDeCaja> {
  return detalle(
    await apiFetch<unknown>(`${rutaDe(aprendizId)}/contenido`, { method: 'PUT', body: { marcados } }),
    'PUT',
    '/contenido',
  );
}

/** Las dos imágenes de una caja: la foto de la caja armada y el comprobante del envío. */
export type ImagenDeCaja = 'foto' | 'comprobante';

/** Paso 1: dónde subir la imagen. Se confirma con la RUTA, no con la URL. */
export async function pedirSubidaDeImagen(
  aprendizId: string,
  cual: ImagenDeCaja,
  tipoContenido: string,
): Promise<SubidaDeCaja> {
  return validarRespuesta<SubidaDeCaja>(
    subidaDeCajaSchema,
    await apiFetch<unknown>(`${rutaDe(aprendizId)}/${cual}/upload-url`, {
      method: 'POST',
      body: { contentType: tipoContenido },
    }),
    `POST ${BASE_ADMIN}/{id}/${cual}/upload-url`,
  );
}

/** Paso 3 (el 2 es el PUT directo al almacenamiento): deja la imagen en la caja. */
export async function confirmarImagen(aprendizId: string, cual: ImagenDeCaja, ruta: string): Promise<DetalleDeCaja> {
  return detalle(
    await apiFetch<unknown>(`${rutaDe(aprendizId)}/${cual}/confirm`, { method: 'POST', body: { ruta } }),
    'POST',
    `/${cual}/confirm`,
  );
}

export async function leerContenidoDeLaCaja(): Promise<ContenidoDeLaCaja> {
  return validarRespuesta<ContenidoDeLaCaja>(
    contenidoDeLaCajaSchema,
    await apiFetch<unknown>(`${BASE_ADMIN}/contenido`),
    `GET ${BASE_ADMIN}/contenido`,
  );
}

export async function guardarContenidoDeLaCaja(
  elementos: Array<{ valor: string; etiqueta: string }>,
): Promise<ContenidoDeLaCaja> {
  const respuesta = await apiFetch<unknown>(`${BASE_ADMIN}/contenido`, { method: 'PUT', body: { elementos } });
  // Si el servidor responde vacío (204), la lista guardada es la que se mandó.
  if (respuesta === undefined) return { elementos };
  return validarRespuesta<ContenidoDeLaCaja>(contenidoDeLaCajaSchema, respuesta, `PUT ${BASE_ADMIN}/contenido`);
}

export async function pedirSubidaDelFondo(tipoContenido: string): Promise<SubidaDeCaja> {
  return validarRespuesta<SubidaDeCaja>(
    subidaDeCajaSchema,
    await apiFetch<unknown>(`${BASE_ADMIN}/carta/fondo/upload-url`, {
      method: 'POST',
      body: { contentType: tipoContenido },
    }),
    `POST ${BASE_ADMIN}/carta/fondo/upload-url`,
  );
}

const FONDO = `${BASE_ADMIN}/carta/fondo`;

function fondo(respuesta: unknown, metodo: string, tramo = ''): FondoDeLaCarta {
  return validarRespuesta<FondoDeLaCarta>(fondoDeLaCartaSchema, respuesta, `${metodo} ${FONDO}${tramo}`);
}

/** Si la carta tiene un fondo cambiado y si este servidor puede guardar uno. */
export async function leerFondoDeLaCarta(): Promise<FondoDeLaCarta> {
  return fondo(await apiFetch<unknown>(FONDO), 'GET');
}

export async function confirmarFondo(ruta: string): Promise<FondoDeLaCarta> {
  return fondo(await apiFetch<unknown>(`${FONDO}/confirm`, { method: 'POST', body: { ruta } }), 'POST', '/confirm');
}

export async function volverAlFondoOriginal(): Promise<FondoDeLaCarta> {
  return fondo(await apiFetch<unknown>(FONDO, { method: 'DELETE' }), 'DELETE');
}

/** Rutas de archivos (no pasan por `apiFetch`: son una imagen y un CSV, con la sesión aparte). */
export const RUTA_DEL_CSV = `${BASE_ADMIN}/export.csv`;
export const rutaDeLaCarta = (aprendizId: string) => `${rutaDe(aprendizId)}/carta`;

// ─── Mentor y aprendiz ───────────────────────────────────────────────────────

export async function leerEstadoDeCajaDelMentor(aprendizId: string): Promise<string> {
  const ruta = `/api/v1/mentor/trainees/${encodeURIComponent(aprendizId)}/caja`;
  return validarRespuesta<{ estado: string }>(estadoDeCajaSchema, await apiFetch<unknown>(ruta), `GET ${ruta}`).estado;
}

const MI_CAJA = '/api/v1/me/caja';

export async function leerMiCaja(): Promise<MiCaja> {
  return validarRespuesta<MiCaja>(miCajaSchema, await apiFetch<unknown>(MI_CAJA), `GET ${MI_CAJA}`);
}

/**
 * Lo que el aprendiz puede cambiar antes del envío. Se manda el formulario entero: un campo `null`
 * BORRA lo que había (spec §11), no lo deja como estaba.
 */
export async function guardarMiDestino(destino: DestinoDeMiCaja): Promise<void> {
  await apiFetch<unknown>(`${MI_CAJA}/destino`, { method: 'PUT', body: destino });
}

export async function confirmarQueLaRecibi(): Promise<void> {
  await apiFetch<unknown>(`${MI_CAJA}/recibida`, { method: 'POST' });
}
