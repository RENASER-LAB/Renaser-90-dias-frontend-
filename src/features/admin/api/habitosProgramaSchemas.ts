import { z } from 'zod';

/**
 * Catálogo global de hábitos con audiencia por rol (spec 001 del backend, D-264,
 * `specs/001-habitos-por-rol/contracts/admin-habits.md`). Tolerante a propósito: los enums viajan como
 * `string` (un valor nuevo del servidor no rompe la pantalla) y lo de la audiencia es opcional, para
 * que la app nueva funcione contra un backend anterior a D-264 (sin roles: todo es «para todos»).
 */
export const habitoDelProgramaSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullish(),
    habitType: z.string(),
    category: z.string(),
    evidenceRequirement: z.string(),
    isOptional: z.boolean(),
    mandatoryOnIntoxication: z.boolean().nullish(),
    isActive: z.boolean(),
    systemKey: z.string().nullish(),
    isDeactivatable: z.boolean().nullish(),
    targetRoles: z.array(z.string()).nullish(),
    targetRolesEffectiveFrom: z.string().nullish(),
    audienceChangedAt: z.string().nullish(),
    audienceChangedBy: z.object({ id: z.string(), name: z.string().nullish() }).passthrough().nullish(),
    /** Solo true para un CAMBIO de roles guardado hoy (la audiencia con la que nace un hábito rige ya). */
    targetRolesStartTomorrow: z.boolean().nullish(),
  })
  .passthrough();

export type HabitoDelProgramaApi = z.infer<typeof habitoDelProgramaSchema>;

export const catalogoDelProgramaSchema = z.array(habitoDelProgramaSchema);

export const rolElegibleSchema = z.object({ code: z.string(), name: z.string() }).passthrough();
export type RolElegibleApi = z.infer<typeof rolElegibleSchema>;
export const rolesElegiblesSchema = z.array(rolElegibleSchema);

/** Lo que manda el formulario. En editar no viajan `title` ni `habitType` (el servidor no los cambia). */
export interface CuerpoHabitoDelPrograma {
  title?: string;
  habitType?: string;
  description: string | null;
  category: string;
  evidenceRequirement: string;
  isOptional: boolean;
  mandatoryOnIntoxication: boolean;
  /** `[]` = para todos. */
  targetRoles: string[];
}
