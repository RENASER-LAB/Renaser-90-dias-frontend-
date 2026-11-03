import { apiFetch } from '../../../services/http/apiClient';
import type {
  ComunidadDeLaFormacion,
  DatosDeTraslado,
  DatosParaGuardarFormacion,
  DetalleDeFormacion,
  FormacionDeLaSesion,
  FormacionDeUnaPersona,
  ResumenDeFormacion,
  TarjetaDeFormacion,
  TipoDeComunidad,
} from '../types/formaciones.types';
import {
  aTarjetas,
  leerComunidadDeLaFormacion,
  leerDetalle,
  leerFormacionDeLaSesion,
  leerFormacionDeUnaPersona,
  leerResumen,
  tarjetasSchema,
} from './formacionesSchemas';

/**
 * Las formaciones (spec 022 del backend). Aquí vive solo el «cómo se llama»; qué hacer con la respuesta es de `context/` y
 * de las pantallas. Todo es aditivo: contra un backend anterior, la sesión no trae formación y la app se comporta como siempre.
 */

/** `GET /api/v1/me/formacion`: la formación de esta sesión. La app lo relee al volver al frente (detecta un traslado). */
export async function leerMiFormacion(): Promise<FormacionDeLaSesion | null> {
  return leerFormacionDeLaSesion(await apiFetch<unknown>('/api/v1/me/formacion', { timeoutMs: 15_000 }));
}

/** `PUT /api/v1/me/formacion/activa`: el personal con varias formaciones elige en cuál trabaja. */
export async function elegirMiFormacion(codigo: string): Promise<FormacionDeLaSesion | null> {
  return leerFormacionDeLaSesion(
    await apiFetch<unknown>('/api/v1/me/formacion/activa', { method: 'PUT', body: { codigo }, timeoutMs: 15_000 }),
  );
}

// ── Administración (ADMIN y ALQUIMISTA) ─────────────────────────────────────────────────────────────────────────────────

/** `GET /api/v1/admin/formaciones`: las tres, con lo que Administración mira primero. */
export async function listarFormaciones(): Promise<TarjetaDeFormacion[]> {
  const respuesta = await apiFetch<unknown>('/api/v1/admin/formaciones', { timeoutMs: 15_000 });
  const lectura = tarjetasSchema.safeParse(respuesta);
  return lectura.success ? aTarjetas(lectura.data) : [];
}

/** `GET /api/v1/admin/formaciones/{codigo}`. */
export async function leerFormacion(codigo: string): Promise<DetalleDeFormacion | null> {
  return leerDetalle(await apiFetch<unknown>(`/api/v1/admin/formaciones/${encodeURIComponent(codigo)}`, { timeoutMs: 15_000 }));
}

/** `PUT /api/v1/admin/formaciones/{codigo}`: nombre, descripción, estado y duraciones. 409 si otra persona la cambió antes. */
export async function guardarFormacion(codigo: string, datos: DatosParaGuardarFormacion): Promise<ResumenDeFormacion | null> {
  return leerResumen(
    await apiFetch<unknown>(`/api/v1/admin/formaciones/${encodeURIComponent(codigo)}`, { method: 'PUT', body: datos }),
  );
}

/** `GET /api/v1/admin/users/{id}/formaciones`: la formación de una persona, su historial y, si es personal, dónde trabaja. */
export async function leerFormacionDeUnaPersonaApi(personaId: string): Promise<FormacionDeUnaPersona | null> {
  return leerFormacionDeUnaPersona(
    await apiFetch<unknown>(`/api/v1/admin/users/${encodeURIComponent(personaId)}/formaciones`, { timeoutMs: 15_000 }),
  );
}

/** `PUT /api/v1/admin/users/{id}/formaciones`: en cuáles trabaja el personal (al menos una) y, si se quiere, cuál queda activa. */
export async function asignarFormaciones(personaId: string, formaciones: string[], activa: string | null): Promise<void> {
  await apiFetch<unknown>(`/api/v1/admin/users/${encodeURIComponent(personaId)}/formaciones`, {
    method: 'PUT',
    body: { formaciones, activa },
  });
}

/** `POST /api/v1/admin/trainees/{id}/formacion`: pasa a un aprendiz a otra formación. Reinicia su programa en la nueva. */
export async function trasladarAprendiz(personaId: string, datos: DatosDeTraslado): Promise<void> {
  await apiFetch<unknown>(`/api/v1/admin/trainees/${encodeURIComponent(personaId)}/formacion`, { method: 'POST', body: datos });
}

/**
 * `POST /api/v1/admin/trainees/{id}/duracion` (spec 025, decisión 025-2 A): cambia la duración del programa de un aprendiz que YA empezó, con un
 * motivo escrito. Conserva su día y mueve el último; queda en la bitácora de ajustes del reloj. 409 si ya terminó, si ya tiene esa duración o si su
 * día actual no cabe en la nueva; 400 si la formación no ofrece esa duración.
 */
export async function cambiarDuracionDelPrograma(personaId: string, duracionDias: number, motivo: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/admin/trainees/${encodeURIComponent(personaId)}/duracion`, {
    method: 'POST',
    body: { duracionDias, motivo },
  });
}

/**
 * `GET /api/v1/admin/formaciones/{codigo}/comunidad` (spec 024): los cuatro tipos de comunidad de la formación, si están prendidos y
 * cuántas conversaciones esconde cada uno si se apaga. Un backend anterior responde 404 (la sección no se dibuja).
 */
export async function leerComunidadDeLaFormacionApi(codigo: string): Promise<ComunidadDeLaFormacion | null> {
  return leerComunidadDeLaFormacion(
    await apiFetch<unknown>(`/api/v1/admin/formaciones/${encodeURIComponent(codigo)}/comunidad`, { timeoutMs: 15_000 }),
    codigo,
  );
}

/**
 * `PUT /api/v1/admin/formaciones/{codigo}/comunidad/{tipo}` `{ prendido }`: prende o apaga un tipo de comunidad. Apagar ESCONDE sin
 * borrar (los mensajes quedan y vuelven al prender); rige al instante. Es idempotente. Solo Administración y Alquimista.
 */
export async function cambiarTipoDeComunidad(codigo: string, tipo: TipoDeComunidad, prendido: boolean): Promise<void> {
  await apiFetch<unknown>(`/api/v1/admin/formaciones/${encodeURIComponent(codigo)}/comunidad/${encodeURIComponent(tipo)}`, {
    method: 'PUT',
    body: { prendido },
    timeoutMs: 15_000,
  });
}
