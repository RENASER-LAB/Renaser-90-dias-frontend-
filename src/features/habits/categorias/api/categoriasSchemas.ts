import { z } from 'zod';

import type { CategoriaAdmin, CategoriaDeHabito, CategoriasDeLaFormacion } from '../types/categorias.types';

/**
 * Lo que manda el servidor de las categorías (spec 023), leído con tolerancia: una categoría rota se pierde SOLA, no la lista; un campo
 * nuevo no rompe nada. Lo que no es un objeto con categorías se lee como `null` (backend anterior, sin el endpoint).
 */

const categoriaSchema = z
  .object({
    key: z.string().min(1),
    code: z.string().min(1).nullish(),
    name: z.string().min(1),
    icon: z.string().nullish(),
    order: z.number().nullish(),
  })
  .passthrough();

const categoriasSchema = z
  .object({
    formation: z.string().nullish(),
    categories: z.array(z.unknown()).nullish(),
  })
  .passthrough();

const categoriaAdminSchema = z
  .object({
    key: z.string().min(1),
    code: z.string().min(1).nullish(),
    formation: z.string().min(1),
    name: z.string().min(1),
    icon: z.string().nullish(),
    order: z.number().nullish(),
    isActive: z.boolean().nullish(),
    activeHabits: z.number().nullish(),
    totalHabits: z.number().nullish(),
    canBeDeactivated: z.boolean().nullish(),
    canBeDeleted: z.boolean().nullish(),
  })
  .passthrough();

function categoriaDe(dato: unknown): CategoriaDeHabito | null {
  const lectura = categoriaSchema.safeParse(dato);
  if (!lectura.success) return null;
  const c = lectura.data;
  return { key: c.key, code: c.code ?? c.key, name: c.name.trim(), icon: c.icon ?? null, order: c.order ?? 0 };
}

/** De lo que llegó a las categorías de la formación, en el orden del servidor; `null` si no se entiende (backend anterior). */
export function leerCategoriasDeLaFormacion(dato: unknown): CategoriasDeLaFormacion | null {
  if (dato === null || typeof dato !== 'object') return null;
  const lectura = categoriasSchema.safeParse(dato);
  if (!lectura.success || !Array.isArray(lectura.data.categories)) return null;
  const categorias = lectura.data.categories.flatMap(c => {
    const leida = categoriaDe(c);
    return leida ? [leida] : [];
  });
  return {
    formation: lectura.data.formation ?? null,
    categories: [...categorias].sort((a, b) => a.order - b.order),
  };
}

export function leerCategoriaAdmin(dato: unknown): CategoriaAdmin | null {
  const lectura = categoriaAdminSchema.safeParse(dato);
  if (!lectura.success) return null;
  const c = lectura.data;
  const activos = c.activeHabits ?? 0;
  const total = c.totalHabits ?? 0;
  return {
    key: c.key,
    code: c.code ?? c.key,
    formation: c.formation,
    name: c.name.trim(),
    icon: c.icon ?? null,
    order: c.order ?? 0,
    isActive: c.isActive ?? true,
    activeHabits: activos,
    totalHabits: total,
    canBeDeactivated: c.canBeDeactivated ?? activos === 0,
    canBeDeleted: c.canBeDeleted ?? total === 0,
  };
}

/** La lista de categorías de Administración: una fila rota se pierde sola; algo que no es lista, vacío. */
export function leerCategoriasAdmin(dato: unknown): CategoriaAdmin[] {
  if (!Array.isArray(dato)) return [];
  return dato.flatMap(c => {
    const leida = leerCategoriaAdmin(c);
    return leida ? [leida] : [];
  });
}
