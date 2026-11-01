import { ApiError, apiFetch } from '../../../../services/http/apiClient';
import {
  constanciaSchema,
  detalleDeTerminosSchema,
  quienesAceptaronSchema,
  resumenDeTerminosSchema,
  terminosAceptadosSchema,
  terminosDeMiFormacionSchema,
  versionDeTerminosSchema,
  type ConstanciaApi,
  type DetalleDeTerminosApi,
  type QuienesAceptaronApi,
  type ResumenDeTerminosApi,
  type TerminosAceptadosApi,
  type TerminosDeMiFormacionApi,
  type VersionDeTerminosApi,
} from './terminosSchemas';
import { z } from 'zod';

/**
 * Términos y condiciones (spec 027 del backend). Aquí vive solo el «cómo se llama»; qué hacer con la respuesta es de los hooks y las pantallas.
 * Contra un backend anterior las lecturas devuelven `null`/vacío y la app se comporta como siempre (usa el texto que lleva dentro).
 */

// ── La persona ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** `GET /api/v1/onboarding/terms`: los términos vigentes de MI formación y qué se me pide. `null` si el servidor no los ofrece. */
export async function leerMisTerminos(): Promise<TerminosDeMiFormacionApi | null> {
  try {
    const r = terminosDeMiFormacionSchema.safeParse(await apiFetch<unknown>('/api/v1/onboarding/terms', { timeoutMs: 15_000 }));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** Lo que dice el servidor de los términos que acepté: el texto (con su firma), que nunca acepté unos (404) o que no se pudo leer. */
export type LecturaDeLoAceptado = { tipo: 'listo'; aceptados: TerminosAceptadosApi } | { tipo: 'nunca' } | { tipo: 'error' };

/**
 * `GET /api/v1/onboarding/terms/accepted`: el texto de la versión que acepté (aunque haya otra más nueva), cuándo y con qué firma. Se distingue «nunca
 * acepté» (404) de «no pude leerlo» (red, 5xx, una forma que no calza): quien relee sus términos no puede leer un fallo de red como «no aceptaste nada».
 */
export async function leerTerminosAceptados(): Promise<LecturaDeLoAceptado> {
  try {
    const r = terminosAceptadosSchema.safeParse(await apiFetch<unknown>('/api/v1/onboarding/terms/accepted', { timeoutMs: 15_000 }));
    return r.success ? { tipo: 'listo', aceptados: r.data } : { tipo: 'error' };
  } catch (e) {
    return e instanceof ApiError && e.status === 404 ? { tipo: 'nunca' } : { tipo: 'error' };
  }
}

// ── Administración (ADMIN y ALQUIMISTA) ─────────────────────────────────────────────────────────────────────────────────

export async function listarTerminos(): Promise<ResumenDeTerminosApi[]> {
  const r = z.array(resumenDeTerminosSchema).safeParse(await apiFetch<unknown>('/api/v1/admin/terms', { timeoutMs: 15_000 }));
  return r.success ? r.data : [];
}

export async function leerDetalleDeTerminos(formacion: string): Promise<DetalleDeTerminosApi | null> {
  const r = detalleDeTerminosSchema.safeParse(await apiFetch<unknown>(`/api/v1/admin/terms/${encodeURIComponent(formacion)}`, { timeoutMs: 15_000 }));
  return r.success ? r.data : null;
}

export async function leerVersionDeTerminos(formacion: string, numero: number): Promise<VersionDeTerminosApi | null> {
  const r = versionDeTerminosSchema.safeParse(
    await apiFetch<unknown>(`/api/v1/admin/terms/${encodeURIComponent(formacion)}/versions/${numero}`, { timeoutMs: 15_000 }),
  );
  return r.success ? r.data : null;
}

export async function leerQuienesAceptaron(formacion: string, numero: number): Promise<QuienesAceptaronApi | null> {
  const r = quienesAceptaronSchema.safeParse(
    await apiFetch<unknown>(`/api/v1/admin/terms/${encodeURIComponent(formacion)}/versions/${numero}/acceptances`, { timeoutMs: 15_000 }),
  );
  return r.success ? r.data : null;
}

/** El contenido que se guarda como borrador. `baseNumero` es la versión vigente que quien edita tenía a la vista (`null` si no había ninguna). */
export type ContenidoParaGuardar = { title: string; introduction: string; clauses: string[]; checkboxText: string };

/** `PUT /api/v1/admin/terms/{formacion}/draft`. 409 si otra persona publicó mientras se editaba. */
export async function guardarBorradorDeTerminos(formacion: string, contenido: ContenidoParaGuardar, baseNumero: number | null): Promise<VersionDeTerminosApi | null> {
  const r = versionDeTerminosSchema.safeParse(
    await apiFetch<unknown>(`/api/v1/admin/terms/${encodeURIComponent(formacion)}/draft`, { method: 'PUT', body: { ...contenido, baseNumber: baseNumero } }),
  );
  return r.success ? r.data : null;
}

export async function descartarBorradorDeTerminos(formacion: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/admin/terms/${encodeURIComponent(formacion)}/draft`, { method: 'DELETE' });
}

/** `POST /api/v1/admin/terms/{formacion}/versions/{n}/restore`: pone esa versión como borrador (no se publica sola). */
export async function restaurarComoBorradorDeTerminos(formacion: string, numero: number): Promise<VersionDeTerminosApi | null> {
  const r = versionDeTerminosSchema.safeParse(
    await apiFetch<unknown>(`/api/v1/admin/terms/${encodeURIComponent(formacion)}/versions/${numero}/restore`, { method: 'POST' }),
  );
  return r.success ? r.data : null;
}

/** `POST /api/v1/admin/terms/{formacion}/publish`: el borrador pasa a ser la versión siguiente. */
export async function publicarTerminos(
  formacion: string,
  nota: string,
  pideNuevaAceptacion: boolean,
  baseNumero: number | null,
): Promise<VersionDeTerminosApi | null> {
  const r = versionDeTerminosSchema.safeParse(
    await apiFetch<unknown>(`/api/v1/admin/terms/${encodeURIComponent(formacion)}/publish`, {
      method: 'POST',
      body: { note: nota, asksNewAcceptance: pideNuevaAceptacion, baseNumber: baseNumero },
    }),
  );
  return r.success ? r.data : null;
}

/** `GET /api/v1/admin/terms/people/{id}`: qué versión aceptó una persona, cuándo y con qué firma. Vacío si nunca aceptó o el servidor no lo ofrece. */
export async function leerConstanciaDeUnaPersona(personaId: string): Promise<ConstanciaApi[]> {
  try {
    const r = z.array(constanciaSchema).safeParse(await apiFetch<unknown>(`/api/v1/admin/terms/people/${encodeURIComponent(personaId)}`, { timeoutMs: 15_000 }));
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}
