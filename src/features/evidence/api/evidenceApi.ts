import { apiFetch } from '../../../services/http/apiClient';
import { paginaEvidenciasSchema, validarRespuesta, type PaginaEvidenciasApi } from './evidenceSchemas';

/**
 * `GET /api/v1/evidence` — las evidencias del aprendiz.
 *
 * Sin `participanteId`: el backend acota el listado por rol y devuelve solo lo propio. Mandarlo
 * desde el movil no daria mas acceso y si abriria la puerta a pedir el de otro.
 *
 * Vale para CUALQUIER rol, incluido un mentor que ademas cursa el programa. Hasta el arreglo de
 * la autoconsulta esto le devolvia 403: el backend le exigia nombrar un aprendiz y, si mandaba
 * su propio id, comprobaba si estaba asignado a si mismo. Un mentor no podia ver sus propias
 * evidencias por ningun camino.
 */
export async function listarMisEvidencias(cursor?: string): Promise<PaginaEvidenciasApi> {
  const ruta = cursor ? `/api/v1/evidence?cursor=${encodeURIComponent(cursor)}` : '/api/v1/evidence';
  const r = await apiFetch<unknown>(ruta);
  return validarRespuesta(paginaEvidenciasSchema, r, 'GET /api/v1/evidence');
}

/**
 * URL temporal para abrir el archivo de una evidencia.
 *
 * `null` cuando la evidencia es de texto: no hay archivo, su contenido ya viene en el detalle.
 *
 * No se cachea ni se guarda: vence a los diez minutos, y una URL vencida guardada en el estado
 * deja la imagen rota para siempre. Se pide cada vez que alguien quiere abrir una.
 */
export async function urlDeEvidencia(evidenciaId: string): Promise<string | null> {
  const r = await apiFetch<unknown>(`/api/v1/evidence/${encodeURIComponent(evidenciaId)}/url`);
  if (r === null || r === undefined || typeof r !== 'object') return null;
  const url = (r as { url?: unknown }).url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}
