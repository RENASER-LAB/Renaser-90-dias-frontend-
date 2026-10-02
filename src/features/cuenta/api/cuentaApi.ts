import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import {
  comoSeConfirmaSchema,
  cuentaCerradaSchema,
  type ComoSeConfirma,
  type CuentaCerrada,
} from './cuentaSchemas';

/**
 * Eliminar la propia cuenta (backend D-243). Dos caminos al mismo resultado:
 *
 * - **Desde la app** (Yo → Eliminar mi cuenta), con la sesión: contraseña o código al correo.
 * - **Desde la web pública** (`/eliminar-cuenta`, el enlace que pide Google Play), sin sesión:
 *   correo + código. Esas llamadas van con `conSesion: false` a propósito: la página tiene que
 *   funcionar igual aunque en ese navegador haya otra sesión iniciada, y no debe mandar su token.
 */

// ── Con sesión (Yo) ───────────────────────────────────────────────────────

export async function leerComoSeConfirma(): Promise<ComoSeConfirma> {
  return validarRespuesta<ComoSeConfirma>(
    comoSeConfirmaSchema,
    await apiFetch<unknown>('/api/v1/users/me/account-deletion'),
    'GET /api/v1/users/me/account-deletion',
  );
}

/** 202: el código va al correo de la cuenta. Para quien entra solo con Google o Apple. */
export async function enviarmeCodigoParaEliminar(): Promise<void> {
  await apiFetch<unknown>('/api/v1/users/me/account-deletion/code', { method: 'POST' });
}

export type ConfirmacionPropia = { contrasena: string } | { codigo: string };

/** Tras el 200 el servidor ya cerró TODAS las sesiones de la cuenta. */
export async function eliminarMiCuenta(confirmacion: ConfirmacionPropia): Promise<CuentaCerrada> {
  return validarRespuesta<CuentaCerrada>(
    cuentaCerradaSchema,
    await apiFetch<unknown>('/api/v1/users/me/account-deletion', { method: 'POST', body: confirmacion }),
    'POST /api/v1/users/me/account-deletion',
  );
}

// ── Sin sesión (página web pública) ───────────────────────────────────────

/** Responde 202 SIEMPRE, exista o no la cuenta: no revela quién está registrado. */
export async function pedirCodigoPorCorreo(email: string): Promise<void> {
  await apiFetch<unknown>('/api/v1/account-deletion/request-code', {
    method: 'POST',
    body: { email },
    conSesion: false,
  });
}

export async function confirmarConCodigo(email: string, codigo: string): Promise<CuentaCerrada> {
  return validarRespuesta<CuentaCerrada>(
    cuentaCerradaSchema,
    await apiFetch<unknown>('/api/v1/account-deletion/confirm', {
      method: 'POST',
      body: { email, codigo },
      conSesion: false,
    }),
    'POST /api/v1/account-deletion/confirm',
  );
}
