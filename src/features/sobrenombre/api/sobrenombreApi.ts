import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';

/** Spec 046 (D-331): el sobrenombre en el Muro. El servidor valida todo; la app repite la forma para avisar antes. */
export type MiSobrenombre = { sobrenombre: string | null; puedeCambiarDesde: string | null; invitacionDescartada: boolean };

const miSchema = z.object({
  sobrenombre: z.string().nullish().catch(null),
  puedeCambiarDesde: z.string().nullish().catch(null),
  invitacionDescartada: z.boolean().catch(false),
});

function leerMio(crudo: unknown): MiSobrenombre {
  const r = miSchema.parse(crudo ?? {});
  return { sobrenombre: r.sobrenombre ?? null, puedeCambiarDesde: r.puedeCambiarDesde ?? null, invitacionDescartada: r.invitacionDescartada };
}

export async function obtenerMiSobrenombre(): Promise<MiSobrenombre> {
  return leerMio(await apiFetch<unknown>('/api/v1/me/sobrenombre'));
}

export async function elegirSobrenombre(sobrenombre: string): Promise<MiSobrenombre> {
  return leerMio(await apiFetch<unknown>('/api/v1/me/sobrenombre', { method: 'PUT', body: { sobrenombre } }));
}

export async function quitarMiSobrenombre(): Promise<MiSobrenombre> {
  return leerMio(await apiFetch<unknown>('/api/v1/me/sobrenombre', { method: 'DELETE' }));
}

/** «Ahora no» a la invitación del día 7: no vuelve (D2). */
export async function descartarInvitacionDelSobrenombre(): Promise<MiSobrenombre> {
  return leerMio(await apiFetch<unknown>('/api/v1/me/sobrenombre/descartar', { method: 'POST' }));
}

// ---------------------------------------------------------------- Administración (MODERATE_WALL)

export type PersonaConSobrenombre = { personaId: string; sobrenombre: string; nombreReal: string; desde: string | null };

const filaSchema = z.object({
  personaId: z.string(),
  sobrenombre: z.string(),
  nombreReal: z.string().catch(''),
  desde: z.string().nullish().catch(null),
});

/** Una fila rota se pierde ella, no la lista. */
export async function listarSobrenombres(buscar: string): Promise<PersonaConSobrenombre[]> {
  const q = buscar.trim() ? `?q=${encodeURIComponent(buscar.trim())}` : '';
  const crudo = await apiFetch<unknown>(`/api/v1/admin/sobrenombres${q}`);
  if (!Array.isArray(crudo)) return [];
  return crudo.flatMap(f => {
    const r = filaSchema.safeParse(f);
    return r.success ? [{ ...r.data, desde: r.data.desde ?? null }] : [];
  });
}

export async function sobrenombreDeLaPersona(personaId: string): Promise<string | null> {
  const r = await apiFetch<{ sobrenombre?: string | null }>(`/api/v1/admin/personas/${encodeURIComponent(personaId)}/sobrenombre`);
  return typeof r?.sobrenombre === 'string' ? r.sobrenombre : null;
}

export async function cambiarSobrenombreDeLaPersona(personaId: string, sobrenombre: string, motivo: string): Promise<string | null> {
  const r = await apiFetch<{ sobrenombre?: string | null }>(`/api/v1/admin/personas/${encodeURIComponent(personaId)}/sobrenombre`, {
    method: 'PUT',
    body: { sobrenombre, motivo },
  });
  return typeof r?.sobrenombre === 'string' ? r.sobrenombre : null;
}

export async function quitarSobrenombreDeLaPersona(personaId: string, motivo: string): Promise<void> {
  await apiFetch<unknown>(
    `/api/v1/admin/personas/${encodeURIComponent(personaId)}/sobrenombre?motivo=${encodeURIComponent(motivo)}`,
    { method: 'DELETE' },
  );
}

export type PalabrasProhibidas = { deLaListaBase: number; deAdministracion: string[] };

function leerPalabras(crudo: unknown): PalabrasProhibidas {
  const r = z
    .object({ deLaListaBase: z.number().catch(0), deAdministracion: z.array(z.string()).catch([]) })
    .catch({ deLaListaBase: 0, deAdministracion: [] })
    .parse(crudo ?? {});
  return r;
}

export async function palabrasProhibidas(): Promise<PalabrasProhibidas> {
  return leerPalabras(await apiFetch<unknown>('/api/v1/admin/sobrenombres/palabras-prohibidas'));
}

export async function agregarPalabraProhibida(palabra: string): Promise<PalabrasProhibidas> {
  return leerPalabras(await apiFetch<unknown>('/api/v1/admin/sobrenombres/palabras-prohibidas', { method: 'POST', body: { palabra } }));
}

export async function quitarPalabraProhibida(palabra: string): Promise<PalabrasProhibidas> {
  return leerPalabras(
    await apiFetch<unknown>(`/api/v1/admin/sobrenombres/palabras-prohibidas/${encodeURIComponent(palabra)}`, { method: 'DELETE' }),
  );
}
