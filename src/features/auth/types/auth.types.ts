/**
 * Tipos de la autenticación: los que espeja el backend Java (`UsuarioApi`, `EstadoSolicitud`)
 * y el que consume la app (`User`). Están separados a propósito — si mañana el backend renombra
 * un campo, el cambio se absorbe en `api/usuarioMapper` y ninguna pantalla se entera.
 */

/** Espejo de `UserResponse` del backend (proyección, no la entidad). */
export type UsuarioApi = {
  id: string;
  email: string;
  role: string;
  status: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  department: string | null;
};

export type ProveedorSocial = 'GOOGLE' | 'APPLE' | 'FACEBOOK';

/**
 * Las respuestas posibles del login social. El backend las distingue por código HTTP
 * (200 / 202 REGISTRO_PENDIENTE / 202 EN_REVISION / 409) y acá se traducen a una variante
 * explícita para que la pantalla no tenga que razonar sobre números.
 *
 * `CONFLICTO_CORREO` es el 409 y faltaba: sin esa variante la pantalla tendría que atrapar un
 * `ApiError` y mirarle el status, que es justo el razonamiento que este tipo viene a evitar.
 *
 * `REGISTRO_PENDIENTE` (D-65, 2026-09-01) reemplaza a la vieja variante `SOLICITUD_CREADA`: el
 * `code` de OAuth es de un solo uso, así que el backend ya no puede crear la `AccountRequest` en
 * esta misma llamada. En su lugar devuelve la identidad verificada por el proveedor
 * (`email`/`fullName`) y un `registroPendienteToken` de un solo uso, válido 10 minutos, que hay
 * que reenviar a `POST /auth/social/complete` recién cuando la persona confirma el formulario.
 */
export type ResultadoLoginSocial =
  | { tipo: 'SESION'; usuario: UsuarioApi }
  | { tipo: 'REGISTRO_PENDIENTE'; registroPendienteToken: string; email: string; fullName: string }
  | { tipo: 'SOLICITUD_EN_REVISION'; accountRequestId: string }
  | { tipo: 'CONFLICTO_CORREO'; mensaje: string };

export type EstadoSolicitud = {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  rejectionReason: string | null;
};

export type DatosAlta = {
  email: string;
  fullName: string;
  /**
   * Opcional desde que el teléfono se pide en la Ficha Inicial del onboarding y no en el alta.
   * El campo sigue viajando —el contrato del backend todavía lo declara— pero va nulo; mientras
   * el alta lo tenga como `@NotBlank`, el POST responde 400.
   */
  phone?: string;
  city?: string;
  verificationToken: string;
  contrasena: string;
};

/**
 * Segundo paso del alta social (`POST /api/v1/auth/social/complete`, D-65). A propósito NO lleva
 * `email`: el backend lo toma del registro pendiente que identifica `registroPendienteToken`,
 * nunca del cuerpo — si el cliente pudiera mandar el correo acá, cualquiera completaría un
 * registro con el correo de otra persona (mismo blindaje que el `role` ausente del alta pública).
 */
export type DatosConfirmacionSocial = {
  registroPendienteToken: string;
  fullName: string;
  phone?: string;
  city?: string;
};

/** El usuario tal como lo usan las pantallas. */
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  bio?: string | null;
  department?: string | null;
};
