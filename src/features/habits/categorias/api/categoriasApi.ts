import { apiFetch } from '../../../../services/http/apiClient';
import type { CategoriaAdmin, CategoriasDeLaFormacion } from '../types/categorias.types';
import { leerCategoriaAdmin, leerCategoriasAdmin, leerCategoriasDeLaFormacion } from './categoriasSchemas';

/**
 * Las categorías de hábito (spec 023 del backend). Aquí vive solo el «cómo se llama»; qué hacer con la respuesta es del estado y de las
 * pantallas. Contra un backend anterior el endpoint no existe (404) y quien llama usa las cuatro de la Escuela.
 */

/** `GET /api/v1/habit-categories`: las dimensiones de Training de la formación de quien pregunta. */
export async function leerCategoriasDeMiFormacion(): Promise<CategoriasDeLaFormacion | null> {
  return leerCategoriasDeLaFormacion(await apiFetch<unknown>('/api/v1/habit-categories', { timeoutMs: 15_000 }));
}

// ── Administración (ADMIN y ALQUIMISTA) ─────────────────────────────────────────────────────────────────────────────────

/** `GET /api/v1/admin/habit-categories?formation=`: las de una formación; sin `formacion`, las de las tres (cada una con la suya). */
export async function listarCategoriasAdmin(formacion?: string | null): Promise<CategoriaAdmin[]> {
  const ruta = formacion ? `/api/v1/admin/habit-categories?formation=${encodeURIComponent(formacion)}` : '/api/v1/admin/habit-categories';
  return leerCategoriasAdmin(await apiFetch<unknown>(ruta, { timeoutMs: 15_000 }));
}

/** `POST /api/v1/admin/habit-categories`: crea una al final de la formación. */
export async function crearCategoriaAdmin(datos: { formacion: string; nombre: string; icono: string | null }): Promise<CategoriaAdmin | null> {
  return leerCategoriaAdmin(
    await apiFetch<unknown>('/api/v1/admin/habit-categories', {
      method: 'POST',
      body: { formation: datos.formacion, name: datos.nombre, icon: datos.icono },
    }),
  );
}

/** `PUT /api/v1/admin/habit-categories/{key}`: renombra y/o cambia el ícono. `changesIcon` distingue «no lo toques» de «quítaselo». */
export async function actualizarCategoriaAdmin(
  clave: string,
  datos: { nombre?: string; icono?: string | null; cambiaElIcono: boolean },
): Promise<CategoriaAdmin | null> {
  return leerCategoriaAdmin(
    await apiFetch<unknown>(`/api/v1/admin/habit-categories/${encodeURIComponent(clave)}`, {
      method: 'PUT',
      body: { name: datos.nombre, icon: datos.icono ?? '', changesIcon: datos.cambiaElIcono },
    }),
  );
}

/** `PUT /api/v1/admin/habit-categories/{key}/active`. 409 con el motivo si tiene hábitos activos. */
export async function cambiarActivaCategoriaAdmin(clave: string, activa: boolean): Promise<CategoriaAdmin | null> {
  return leerCategoriaAdmin(
    await apiFetch<unknown>(`/api/v1/admin/habit-categories/${encodeURIComponent(clave)}/active`, {
      method: 'PUT',
      body: { isActive: activa },
    }),
  );
}

/** `PUT /api/v1/admin/habit-categories/order`: deja las de la formación en ese orden (todas las claves, una vez cada una). */
export async function ordenarCategoriasAdmin(formacion: string, claves: string[]): Promise<CategoriaAdmin[]> {
  return leerCategoriasAdmin(
    await apiFetch<unknown>('/api/v1/admin/habit-categories/order', { method: 'PUT', body: { formation: formacion, keys: claves } }),
  );
}

/** `DELETE /api/v1/admin/habit-categories/{key}`: 409 con el motivo si tiene hábitos. */
export async function eliminarCategoriaAdmin(clave: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/admin/habit-categories/${encodeURIComponent(clave)}`, { method: 'DELETE' });
}
