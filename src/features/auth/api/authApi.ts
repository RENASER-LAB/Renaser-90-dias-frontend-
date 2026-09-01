import { apiFetch, setTokenSesion } from '../../../services/http/apiClient';
import type { DatosAlta, DatosConfirmacionSocial, EstadoSolicitud, UsuarioApi } from '../types/auth.types';
import {
  disponibilidadEmailSchema,
  estadoSolicitudSchema,
  solicitudCreadaSchema,
  usuarioApiSchema,
  validarRespuesta,
  verificacionEmailSchema,
} from './authSchemas';

/**
 * Endpoints de autenticación del backend Java. Acá solo vive el "cómo se llama": las reglas de
 * qué hacer con la respuesta son del contexto, no de esta capa.
 */

// Los tipos se reexportan para que quien consuma la API no tenga que importar de dos lugares.
export type {
  DatosAlta,
  DatosConfirmacionSocial,
  EstadoSolicitud,
  ProveedorSocial,
  ResultadoLoginSocial,
  UsuarioApi,
} from '../types/auth.types';

// ---------------------------------------------------------------- sesión

export async function iniciarSesion(email: string, contrasena: string): Promise<UsuarioApi> {
  const r = await apiFetch<unknown>('/api/v1/auth/login', {
    method: 'POST',
    body: { email: email.trim(), contrasena },
    conSesion: false,
  });
  return validarRespuesta<UsuarioApi>(usuarioApiSchema, r, 'POST /api/v1/auth/login');
}

export async function perfilActual(): Promise<UsuarioApi> {
  const r = await apiFetch<unknown>('/api/v1/auth/me');
  return validarRespuesta<UsuarioApi>(usuarioApiSchema, r, 'GET /api/v1/auth/me');
}

export async function cerrarSesion(): Promise<void> {
  try {
    await apiFetch<void>('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    // La sesión local se descarta pase lo que pase: si el servidor no contesta, dejar el token
    // guardado solo lograría que la app siga creyéndose autenticada.
    setTokenSesion(null);
  }
}

// ---------------------------------------------------------------- alta de cuenta

/** `true` si el correo está libre para registrarse. */
export async function correoDisponible(email: string): Promise<boolean> {
  const r = await apiFetch<unknown>('/api/v1/account-requests/check-email', {
    method: 'POST',
    body: { email: email.trim() },
    conSesion: false,
  });
  return validarRespuesta<{ available: boolean }>(disponibilidadEmailSchema, r,
    'POST /api/v1/account-requests/check-email').available;
}

export function enviarCodigoVerificacion(email: string): Promise<void> {
  return apiFetch<void>('/api/v1/auth/email-verification/send', {
    method: 'POST',
    body: { email: email.trim() },
    conSesion: false,
  });
}

/** Devuelve el `verificationToken` que exige el alta: el OTP no da acceso, habilita el registro. */
export async function confirmarCodigoVerificacion(email: string, codigo: string): Promise<string> {
  const r = await apiFetch<unknown>('/api/v1/auth/email-verification/confirm', {
    method: 'POST',
    body: { email: email.trim(), codigo },
    conSesion: false,
  });
  return validarRespuesta<{ verificationToken: string }>(verificacionEmailSchema, r,
    'POST /api/v1/auth/email-verification/confirm').verificationToken;
}

/**
 * Devuelve el id de la solicitud, NO una sesión: el alta queda pendiente hasta que un
 * ADMIN/ALQUIMISTA la apruebe. Ese id es la única credencial para consultar el estado después.
 */
export async function registrarSolicitud(datos: DatosAlta): Promise<string> {
  const r = await apiFetch<unknown>('/api/v1/account-requests', {
    method: 'POST',
    body: {
      email: datos.email.trim(),
      fullName: datos.fullName.trim(),
      // Nulo cuando el formulario no lo pide: inventar un teléfono para esquivar el @NotBlank
      // sería meter un dato falso en la base, así que se manda vacío y se acepta el 400.
      phone: datos.phone?.trim() || null,
      city: datos.city?.trim() || null,
      verificationToken: datos.verificationToken,
      contrasena: datos.contrasena,
    },
    conSesion: false,
  });
  return validarRespuesta<{ accountRequestId: string }>(solicitudCreadaSchema, r,
    'POST /api/v1/account-requests').accountRequestId;
}

/**
 * Segundo paso del alta social (`POST /api/v1/auth/social/complete`, D-65). Recién acá se crea
 * la `AccountRequest`: el paso anterior (`iniciarSesionSocial`) solo verificó la identidad con
 * el proveedor y devolvió un `registroPendienteToken` de un solo uso, válido 10 minutos.
 *
 * El correo NUNCA viaja en este body a propósito: el backend lo toma del registro pendiente que
 * identifica el token, no de lo que mande el cliente (§5.3.3 de CLAUDE.md, mismo blindaje que el
 * `role` ausente del alta pública). Si el token venció o ya se usó, el backend responde 400 con
 * un mensaje que ya dice la única salida real — rehacer el login con el proveedor — así que acá
 * no hace falta traducirlo, `mensajeDeError` lo muestra tal cual.
 */
export async function completarRegistroSocial(datos: DatosConfirmacionSocial): Promise<string> {
  const r = await apiFetch<unknown>('/api/v1/auth/social/complete', {
    method: 'POST',
    body: {
      registroPendienteToken: datos.registroPendienteToken,
      fullName: datos.fullName.trim(),
      phone: datos.phone?.trim() || null,
      city: datos.city?.trim() || null,
    },
    conSesion: false,
  });
  return validarRespuesta<{ accountRequestId: string }>(solicitudCreadaSchema, r,
    'POST /api/v1/auth/social/complete').accountRequestId;
}

export async function consultarEstadoSolicitud(accountRequestId: string): Promise<EstadoSolicitud> {
  const r = await apiFetch<unknown>(`/api/v1/account-requests/${accountRequestId}/status`, {
    conSesion: false,
  });
  return validarRespuesta<EstadoSolicitud>(estadoSolicitudSchema, r,
    'GET /api/v1/account-requests/{id}/status');
}

// ---------------------------------------------------------------- recuperar contraseña

export function solicitarResetContrasena(email: string): Promise<void> {
  return apiFetch<void>('/api/v1/auth/password/reset-request', {
    method: 'POST',
    body: { email: email.trim() },
    conSesion: false,
  });
}
