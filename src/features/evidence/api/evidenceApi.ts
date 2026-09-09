import { apiFetch } from '../../../services/http/apiClient';
import { paginaEvidenciasSchema, validarRespuesta, type PaginaEvidenciasApi } from './evidenceSchemas';

/**
 * `GET /api/v1/evidence` — las evidencias del aprendiz.
 *
 * Sin `participanteId`: el backend acota el listado por rol y, para un aprendiz normal, devuelve
 * solo lo propio (ver el javadoc de `EvidenciaController.listar`). Mandarlo desde el movil no
 * daria mas acceso y si abriria la puerta a pedir el de otro.
 */
export async function listarMisEvidencias(cursor?: string): Promise<PaginaEvidenciasApi> {
  const ruta = cursor ? `/api/v1/evidence?cursor=${encodeURIComponent(cursor)}` : '/api/v1/evidence';
  const r = await apiFetch<unknown>(ruta);
  return validarRespuesta(paginaEvidenciasSchema, r, 'GET /api/v1/evidence');
}
