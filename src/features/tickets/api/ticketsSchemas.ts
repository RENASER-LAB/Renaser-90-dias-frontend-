import { z } from 'zod';

export const wireTicketMentorSchema = z
  .object({
    id: z.string(),
    traineeProfileId: z.string(),
    blockDescription: z.string(),
    attemptedSolutions: z.string(),
    smartGoalImpact: z.string(),
    status: z.enum(['OPEN', 'ANSWERED']),
    mentorAnswer: z.string().nullable().optional(),
    answeredAt: z.string().nullable().optional(),
    savedToLibrary: z.boolean().optional().default(false),
    createdAt: z.string(),
  })
  .passthrough();

export const wireTicketsMentorPageSchema = z
  .object({
    tickets: z.array(wireTicketMentorSchema),
    nextCursor: z.string().nullable().optional(),
  })
  .passthrough();

export function validarRespuesta<T>(schema: z.ZodType, dato: unknown, endpoint: string): T {
  const resultado = schema.safeParse(dato);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('; ');
    throw new Error(`El backend respondió algo inesperado en ${endpoint} — ${detalle}`);
  }
  return resultado.data as T;
}
