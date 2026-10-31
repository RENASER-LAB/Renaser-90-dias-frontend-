import { z } from 'zod';

import type { AprendizDeLaLista, PaginaDeAprendices } from '../types/aprendicesDelLider.types';

/**
 * Validación de `GET /api/v1/leadership/people` (2026-10-31). Mismo criterio que el resto del liderazgo: `.nullish()` en
 * todo lo que no es imprescindible, y **una fila rota se pierde sola, no la lista**: las filas se validan una por una.
 * Lo único que hace falta para abrir a una persona es su id.
 */

const filaSchema = z
  .object({
    personId: z.string().trim().min(1),
    nombre: z.string().nullish(),
    photoPath: z.string().nullish(),
    grupoId: z.string().nullish(),
    grupoNombre: z.string().nullish(),
    mentorNombre: z.string().nullish(),
    diaPrograma: z.number().nullish(),
  })
  .passthrough();

const paginaSchema = z
  .object({
    /** Cada una se valida aparte: el arreglo en sí tiene que existir, sus filas pueden no ser todas buenas. */
    items: z.array(z.unknown()),
    page: z.number().nullish(),
    size: z.number().nullish(),
    total: z.number().nullish(),
  })
  .passthrough();

export const SIN_NOMBRE = 'Persona sin nombre';

function limpio(valor: string | null | undefined): string | null {
  const texto = valor?.trim();
  return texto ? texto : null;
}

function entero(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 ? valor : null;
}

function aFila(crudo: z.infer<typeof filaSchema>): AprendizDeLaLista {
  const dia = entero(crudo.diaPrograma);
  return {
    personaId: crudo.personId.trim(),
    nombre: limpio(crudo.nombre) ?? SIN_NOMBRE,
    fotoPath: limpio(crudo.photoPath),
    grupoId: limpio(crudo.grupoId),
    grupoNombre: limpio(crudo.grupoNombre),
    mentorNombre: limpio(crudo.mentorNombre),
    /* El día 0 es «antes del Día 1»: no se dice como un día del programa. */
    diaPrograma: dia !== null && dia >= 1 ? dia : null,
  };
}

/**
 * La página, normalizada. Si el servidor no dice cuántas hay en total, "hay más" es que la página vino llena (contando las
 * filas que se perdieron por rotas, que también ocuparon su lugar).
 *
 * @param pedido lo que se pidió: se usa si la respuesta no repite `page` o `size`.
 */
export function leerPaginaDeAprendices(
  respuesta: unknown,
  pedido: { pagina: number; tamano: number },
  origen: string,
): PaginaDeAprendices {
  const resultado = paginaSchema.safeParse(respuesta);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .slice(0, 3)
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join(' | ');
    throw new Error(`Respuesta inesperada de ${origen} — ${detalle}`);
  }
  const crudo = resultado.data;
  const items: AprendizDeLaLista[] = [];
  for (const fila of crudo.items) {
    const buena = filaSchema.safeParse(fila);
    if (buena.success) items.push(aFila(buena.data));
  }
  const pagina = entero(crudo.page) ?? pedido.pagina;
  const tamano = (entero(crudo.size) ?? 0) > 0 ? (crudo.size as number) : pedido.tamano;
  const total = entero(crudo.total);
  const hayMas = total !== null ? (pagina + 1) * tamano < total : crudo.items.length >= tamano;
  return { items, pagina, tamano, total, hayMas: crudo.items.length === 0 ? false : hayMas };
}
