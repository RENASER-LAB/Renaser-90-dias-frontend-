import { apiFetch } from '../../../services/http/apiClient';
import type { PagoParaElPedido } from '../utils/borradorDelCronograma';
import { leerMiIngreso, leerPagosEnLaFicha, type MiIngreso, type PagosEnLaFicha } from './pagosSchemas';

/**
 * Los pagos contra el servidor (backend spec 032, D-307; ver `contracts/pagos.md`).
 *
 * - **Yo → «Mi ingreso»** (`/me/ingreso`): siempre lo propio, sin id. La confirmación del cronograma nunca bloquea nada.
 * - **Administración y Alquimista** (`/admin/pagos/personas/{id}`): ver el cronograma de una persona, asignarlo o marcarlo «sin cronograma», ajustar las
 *   cuotas pendientes y marcar cada cuota pagada o pendiente. Quien autoriza es el servidor (403 para cualquier otro rol, Soporte TI incluido): nunca
 *   se adivina por el rol.
 *
 * Cada escritura de Administración devuelve el pago entero de la persona: la pantalla queda al día sin volver a pedirlo.
 */
const MIO = '/api/v1/me/ingreso';
const BASE_ADMIN = '/api/v1/admin/pagos/personas';

const deLaPersona = (personaId: string) => `${BASE_ADMIN}/${encodeURIComponent(personaId)}`;

function enLaFicha(respuesta: unknown, origen: string): PagosEnLaFicha {
  const leida = leerPagosEnLaFicha(respuesta);
  if (!leida) throw new Error(`El backend respondió algo inesperado en ${origen}`);
  return leida;
}

/** `null` si la respuesta no se entiende: la pantalla no dibuja nada antes que dibujar algo inventado. */
export async function leerMiIngresoDelServidor(): Promise<MiIngreso | null> {
  return leerMiIngreso(await apiFetch<unknown>(MIO, { timeoutMs: 15_000 }));
}

export async function confirmarMiCronograma(datos: { nombre: string; revisado: boolean }): Promise<MiIngreso | null> {
  return leerMiIngreso(
    await apiFetch<unknown>(`${MIO}/cronograma/confirmacion`, {
      method: 'POST',
      body: { name: datos.nombre.trim(), reviewed: datos.revisado },
    }),
  );
}

export async function leerPagosDeLaPersona(personaId: string): Promise<PagosEnLaFicha> {
  return enLaFicha(await apiFetch<unknown>(deLaPersona(personaId), { timeoutMs: 15_000 }), `GET ${BASE_ADMIN}/{id}`);
}

/** «Sin cronograma» o el cronograma entero, reemplazando el anterior. 409 si ya hay cuotas pagadas. */
export async function asignarPagos(personaId: string, pago: PagoParaElPedido): Promise<PagosEnLaFicha> {
  return enLaFicha(await apiFetch<unknown>(deLaPersona(personaId), { method: 'PUT', body: pago }), `PUT ${BASE_ADMIN}/{id}`);
}

export type CuotaParaElPedido = { dueDate: string; amount: number };

export async function agregarCuota(personaId: string, cuota: CuotaParaElPedido): Promise<PagosEnLaFicha> {
  return enLaFicha(await apiFetch<unknown>(`${deLaPersona(personaId)}/cuotas`, { method: 'POST', body: cuota }), `POST ${BASE_ADMIN}/{id}/cuotas`);
}

export async function editarCuota(personaId: string, cuotaId: string, cuota: CuotaParaElPedido): Promise<PagosEnLaFicha> {
  return enLaFicha(
    await apiFetch<unknown>(`${deLaPersona(personaId)}/cuotas/${encodeURIComponent(cuotaId)}`, { method: 'PUT', body: cuota }),
    `PUT ${BASE_ADMIN}/{id}/cuotas/{cuota}`,
  );
}

export async function quitarCuota(personaId: string, cuotaId: string): Promise<PagosEnLaFicha> {
  return enLaFicha(
    await apiFetch<unknown>(`${deLaPersona(personaId)}/cuotas/${encodeURIComponent(cuotaId)}`, { method: 'DELETE' }),
    `DELETE ${BASE_ADMIN}/{id}/cuotas/{cuota}`,
  );
}

export async function marcarCuota(personaId: string, cuotaId: string, pagada: boolean): Promise<PagosEnLaFicha> {
  return enLaFicha(
    await apiFetch<unknown>(`${deLaPersona(personaId)}/cuotas/${encodeURIComponent(cuotaId)}/estado`, {
      method: 'PUT',
      body: { status: pagada ? 'PAID' : 'PENDING' },
    }),
    `PUT ${BASE_ADMIN}/{id}/cuotas/{cuota}/estado`,
  );
}
