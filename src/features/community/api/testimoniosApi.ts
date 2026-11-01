import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { formacionTolerante } from '../../formaciones/api/formacionTolerante';
import { agregarLaFormacion } from '../../formaciones/estado/formacionDeLaComunidad';

/**
 * `/api/v1/testimonios` (backend `community`, `TestimonioController`): los testimonios de la Comunidad (spec 024: los de cada
 * formación se ven solo en ella). Acá solo vive el «cómo se llama»; la sección Testimonios de Comunidad los pide con
 * `useTestimonios`.
 *
 * **Tolerante a propósito.** Lo único indispensable de una fila es `id` y `texto`; una fila que no se entiende se pierde SOLA, no la
 * lista, y todo lo demás es opcional (la app no se actualiza por aire). Si la respuesta ni siquiera es una lista, sí lanza: eso ya
 * no es un testimonio raro, es otro contrato.
 */

const testimonioSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().nullish().catch(null),
    wallPostId: z.string().nullish().catch(null),
    nombre: z.string().nullish().catch(null),
    rol: z.string().nullish().catch(null),
    avatarUrl: z.string().nullish().catch(null),
    fotoEventoUrl: z.string().nullish().catch(null),
    texto: z.string(),
    estrellas: z.number().nullish().catch(null),
    createdAt: z.string().nullish().catch(null),
    // Spec 024: la formación del testimonio.
    formation: formacionTolerante,
  })
  .passthrough();

export type Testimonio = {
  id: string;
  nombre: string;
  rol: string | null;
  avatarUrl: string | null;
  texto: string;
  /** De 1 a 5; `null` si no vino o no es un número razonable. */
  estrellas: number | null;
  /** Spec 024: el código de la formación. Ausente con un servidor anterior. */
  formacion?: string | null;
};

const NOMBRE_SIN_DATO = 'Miembro Renaser';

export function leerTestimonios(datos: unknown): Testimonio[] {
  if (!Array.isArray(datos)) throw new Error('Respuesta inesperada de GET /api/v1/testimonios');
  const filas: Testimonio[] = [];
  for (const fila of datos) {
    const lectura = testimonioSchema.safeParse(fila);
    if (!lectura.success || !lectura.data.texto.trim()) continue;
    const d = lectura.data;
    filas.push({
      id: d.id,
      nombre: d.nombre?.trim() || NOMBRE_SIN_DATO,
      rol: d.rol?.trim() || null,
      avatarUrl: d.avatarUrl && /^https?:\/\//.test(d.avatarUrl) ? d.avatarUrl : null,
      texto: d.texto.trim(),
      estrellas: typeof d.estrellas === 'number' && d.estrellas >= 1 && d.estrellas <= 5 ? Math.round(d.estrellas) : null,
      ...(d.formation ? { formacion: d.formation } : {}),
    });
  }
  return filas;
}

/**
 * Los testimonios destacados. `formation` (spec 024) solo lo pasa la Comunidad de quien ve todas las formaciones y eligió una; los
 * demás reciben los de la suya.
 */
export async function obtenerTestimonios(formation?: string | null): Promise<Testimonio[]> {
  return leerTestimonios(await apiFetch<unknown>(agregarLaFormacion('/api/v1/testimonios', formation)));
}

/**
 * Un testimonio escrito a mano (solo ADMIN y ALCHEMIST). Nace en la formación de `formation`: Administración tiene que elegirla
 * (el servidor responde 400 sin ella). Hoy la app no tiene una pantalla que lo cree; esto deja el camino listo y con la regla.
 */
export async function crearTestimonio(
  datos: { nombre: string; rol: string; texto: string; estrellas?: number },
  formation?: string | null,
): Promise<Testimonio | null> {
  const cuerpo = { ...datos, ...(formation ? { formation } : {}) };
  const respuesta = await apiFetch<unknown>('/api/v1/testimonios', { method: 'POST', body: cuerpo });
  return leerTestimonios([respuesta])[0] ?? null;
}
