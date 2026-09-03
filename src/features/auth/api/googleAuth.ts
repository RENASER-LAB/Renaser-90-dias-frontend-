import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { API_CONFIG } from '../../../config/apiConfig';
import { ApiError, apiFetch } from '../../../services/http/apiClient';
import { registroPendienteSocialSchema, validarRespuesta } from './authSchemas';
import type { ProveedorSocial, ResultadoLoginSocial, UsuarioApi } from '../types/auth.types';

/**
 * Login con Google por Authorization Code + PKCE.
 *
 * La app NO canjea el código contra Google: consigue el `code` y su `codeVerifier`, y se los
 * pasa al backend, que es el único que tiene el `client_secret`. Por eso acá no hay
 * `tokenEndpoint` ni `exchangeCodeAsync` — un secreto incrustado en el bundle de una app móvil
 * es un secreto publicado, y PKCE existe justamente para no necesitarlo del lado del cliente.
 */

/**
 * En web, Google no vuelve a esta pantalla: vuelve al propio origen de la app dentro de una
 * ventana emergente, que carga el bundle otra vez desde cero. Esta llamada es la que, desde esa
 * ventana, le devuelve la URL con el `code` a la ventana original y se cierra sola. Va a nivel
 * de módulo porque tiene que correr al cargar la app, mucho antes de que nadie toque un botón.
 * En nativo no hace nada.
 */
WebBrowser.maybeCompleteAuthSession();

/**
 * Endpoint de autorización de Google, escrito a mano en vez de resolverlo con `useAutoDiscovery`.
 * Ese hook descarga el documento OIDC en cada arranque — una espera de red para obtener una URL
 * que Google no cambia hace años — y además obligaría a que todo esto fuera un hook de React,
 * cuando el flujo arranca desde el `onPress` de un botón y no desde el render.
 */
const AUTORIZACION_GOOGLE: AuthSession.AuthDiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

/** Lo mínimo que el backend necesita para saber quién entró: identidad y correo verificado. */
const PERMISOS_GOOGLE = ['openid', 'profile', 'email'];

/** Lo que la app le manda al backend para que él sí canjee el código. */
export type CodigoAutorizacion = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

/** Cuerpo del 202 cuando ya había una solicitud abierta esperando que un ADMIN la apruebe. */
type SolicitudAbierta = { accountRequestId: string; estado: string };

/**
 * Cuerpo del 202 cuando la identidad es nueva (D-65): todavía no existe ninguna
 * `AccountRequest`, solo la identidad que verificó el proveedor y el token de un solo uso que
 * hay que reenviar a `POST /auth/social/complete` para recién ahí crearla.
 */
type RegistroPendienteAbierta = { registroPendienteToken: string; email: string; fullName: string };

/**
 * A dónde vuelve Google después de autorizar. Se expone porque es el dato que hay que registrar
 * a mano en Google Cloud (Credenciales > URIs de redireccionamiento autorizados) y no coincide
 * entre plataformas: web usa el origen del navegador, nativo usa el esquema de la app.
 *
 * Con la configuración actual devuelve:
 *  - Web (expo start --web): `http://localhost:8081`
 *  - Web desplegado:         `https://<dominio>` (el origen, sin barra final)
 *  - Expo Go:                `exp://<IP-LAN>:8081`
 *  - Build nativo:           `renaser://` — requiere `"scheme": "renaser"` en app.json
 */
export function redirectUriGoogle(): string {
  return AuthSession.makeRedirectUri({ scheme: 'renaser' });
}

/**
 * Abre el navegador del sistema contra Google y vuelve con el código de autorización.
 *
 * Devuelve `null` si la persona cerró la ventana: cancelar no es un fallo, y tratarlo como
 * excepción terminaría mostrando un mensaje rojo por algo que hizo a propósito.
 */
export async function pedirCodigoGoogle(): Promise<CodigoAutorizacion | null> {
  if (!API_CONFIG.GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error(
      'Falta EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID en el .env: no se puede abrir el login de Google.'
    );
  }

  const redirectUri = redirectUriGoogle();
  const solicitud = new AuthSession.AuthRequest({
    clientId: API_CONFIG.GOOGLE_OAUTH_CLIENT_ID,
    redirectUri,
    scopes: PERMISOS_GOOGLE,
    responseType: AuthSession.ResponseType.Code,
    // Explícito aunque sea el valor por defecto: PKCE es lo que reemplaza al client_secret
    // en la app, así que si alguien lo apaga sin querer el flujo entero deja de tener sentido.
    usePKCE: true,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    // Sin esto Google entra en silencio con la sesión que ya haya en el navegador. En un
    // teléfono compartido eso significa entrar con la cuenta de otra persona sin poder elegir.
    prompt: AuthSession.Prompt.SelectAccount,
  });

  // `promptAsync` genera la URL de autorización por dentro, y ahí es donde se calcula el par
  // codeVerifier/codeChallenge. Antes de esta llamada `solicitud.codeVerifier` todavía es undefined.
  const resultado = await solicitud.promptAsync(AUTORIZACION_GOOGLE);

  if (resultado.type === 'error') {
    throw new Error(resultado.error?.message || 'Google rechazó la autorización.');
  }
  if (resultado.type !== 'success') {
    // 'cancel' y 'dismiss' son la persona cerrando la ventana; 'locked' es un segundo intento
    // mientras el primero sigue abierto. Ninguno amerita un mensaje de error.
    return null;
  }

  const code = resultado.params.code;
  const codeVerifier = solicitud.codeVerifier;
  if (!code || !codeVerifier) {
    throw new Error('Google no devolvió el código de autorización.');
  }

  return { code, codeVerifier, redirectUri };
}

/**
 * POST /api/v1/auth/social — el backend canjea el código con su `client_secret` y decide.
 *
 * Desde D-65 (2026-09-01) este paso ya NO manda `phone`/`city`: el backend solo verifica la
 * identidad contra el proveedor. Si la identidad es nueva, esos datos —y el resto del
 * formulario de confirmación— se piden después, en `POST /auth/social/complete`
 * (`completarRegistroSocial`, en `authApi.ts`).
 */
export async function iniciarSesionSocial(
  proveedor: ProveedorSocial,
  codigo: CodigoAutorizacion
): Promise<ResultadoLoginSocial> {
  let respuesta: UsuarioApi | SolicitudAbierta | RegistroPendienteAbierta;
  try {
    respuesta = await apiFetch<UsuarioApi | SolicitudAbierta | RegistroPendienteAbierta>('/api/v1/auth/social', {
      method: 'POST',
      body: {
        proveedor,
        code: codigo.code,
        codeVerifier: codigo.codeVerifier,
        redirectUri: codigo.redirectUri,
      },
      conSesion: false,
    });
  } catch (error) {
    // 409: el correo ya tiene cuenta propia y esta identidad de Google no está vinculada. Es una
    // respuesta esperable del contrato, no una falla, así que se devuelve como variante para que
    // la pantalla pueda mandar a la persona a su contraseña en vez de mostrar un error genérico.
    if (error instanceof ApiError && error.esConflicto) {
      return { tipo: 'CONFLICTO_CORREO', mensaje: error.message };
    }
    // Lo demás (sin red, 500, sesión rara) sube tal cual: ApiError ya distingue cada caso.
    throw error;
  }

  // `apiFetch` devuelve el cuerpo ya parseado pero no el código HTTP, así que 200 y 202 se
  // distinguen por su forma. Ninguna comparte campos con las otras dos: la sesión trae el
  // usuario (`id`, `email`), la solicitud ya abierta trae `accountRequestId`, y la identidad
  // nueva trae `registroPendienteToken`. La distinción es firme, no una heurística.
  if ('registroPendienteToken' in respuesta) {
    const validado = validarRespuesta<RegistroPendienteAbierta>(
      registroPendienteSocialSchema, respuesta, 'POST /api/v1/auth/social (202 registro pendiente)');
    return {
      tipo: 'REGISTRO_PENDIENTE',
      registroPendienteToken: validado.registroPendienteToken,
      email: validado.email,
      fullName: validado.fullName,
    };
  }
  if ('accountRequestId' in respuesta) {
    return { tipo: 'SOLICITUD_EN_REVISION', accountRequestId: respuesta.accountRequestId };
  }
  return { tipo: 'SESION', usuario: respuesta };
}

/**
 * El flujo completo: navegador → código → backend. Devuelve `null` si la persona canceló.
 */
export async function loginConGoogle(): Promise<ResultadoLoginSocial | null> {
  const codigo = await pedirCodigoGoogle();
  if (!codigo) {
    return null;
  }
  return iniciarSesionSocial('GOOGLE', codigo);
}
