import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import {
  emergenciaParaSoporteSchema,
  miEmergenciaSchema,
  pedidoDeEmergenciaSchema,
  type EmergenciaParaSoporte,
  type MiEmergencia,
  type PedidoDeEmergencia,
} from './emergenciaSchemas';

/**
 * El botón de emergencia contra el servidor (backend D-244). Pedir NO cambia el día: le llega a soporte,
 * que lo aplica con «Cambiar día del programa» (`PUT /admin/trainees/{id}/program-day`), y eso deja el
 * pedido resuelto solo.
 */
export const RUTA_MIA = '/api/v1/me/emergency-request';

export async function leerMiEmergencia(): Promise<MiEmergencia> {
  return validarRespuesta<MiEmergencia>(miEmergenciaSchema, await apiFetch<unknown>(RUTA_MIA), `GET ${RUTA_MIA}`);
}

export async function pedirAyudaPorEmergencia(cuerpo: { queOcurrio: string; diaPedido: number }): Promise<PedidoDeEmergencia> {
  return validarRespuesta<PedidoDeEmergencia>(
    pedidoDeEmergenciaSchema,
    await apiFetch<unknown>(RUTA_MIA, { method: 'POST', body: cuerpo }),
    `POST ${RUTA_MIA}`,
  );
}

export const rutaDeLaEmergenciaDe = (aprendizId: string) =>
  `/api/v1/admin/trainees/${encodeURIComponent(aprendizId)}/emergency-request`;

/** El pedido abierto de esa persona, o `null` si no tiene (204). */
export async function leerEmergenciaAbierta(aprendizId: string): Promise<EmergenciaParaSoporte | null> {
  const ruta = rutaDeLaEmergenciaDe(aprendizId);
  const respuesta = await apiFetch<unknown>(ruta);
  if (respuesta === undefined || respuesta === null) return null;
  return validarRespuesta<EmergenciaParaSoporte>(emergenciaParaSoporteSchema, respuesta, `GET ${ruta}`);
}

export async function cerrarEmergenciaSinCambio(solicitudId: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/admin/emergency-requests/${encodeURIComponent(solicitudId)}/close`, { method: 'POST' });
}
