import { useCallback, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import * as authApi from '../api/authApi';
import { conMensaje } from './useRegistroConOtp';

/**
 * Recuperar la contraseña desde la app, sin salir a un navegador (D-102). Pedido textual del
 * dueño: "que salga para enviar correo, lo mismo con OTP. Verifico el OTP y pongo la nueva
 * contraseña".
 *
 * Tres llamadas encadenadas y el orden importa, por eso no viven sueltas en la pantalla — mismo
 * molde que `useRegistroConOtp`:
 *   1. `enviarCodigo`      → `password/forgot`: el backend manda el código de 6 dígitos.
 *   2. `verificarCodigo`   → `password/verify-code`: canjea el código por un `resetToken`.
 *   3. `cambiarContrasena` → `password/reset-confirm`: fija la nueva con ese token.
 *
 * El `resetToken` vive SOLO en memoria y solo entre los pasos 2 y 3: es una credencial de un
 * solo uso, válida 30 minutos en el backend. Si la persona cierra la app en el medio, lo pierde
 * y tiene que pedir otro código — comportamiento correcto, no un bug. Nunca se persiste ni se
 * loguea.
 */
export function useRecuperacionContrasena() {
  const [resetToken, setResetToken] = useState<string | null>(null);

  /**
   * El backend responde 202 exista o no la cuenta, a propósito: si respondiera distinto,
   * serviría para averiguar qué correos están registrados. La pantalla, por lo mismo, siempre
   * dice "si el correo tiene cuenta, te llegó un código".
   */
  const enviarCodigo = useCallback(async (email: string) => {
    try {
      await authApi.solicitarCodigoResetContrasena(email);
    } catch (error) {
      throw conMensaje(error, 'No pudimos enviar el código a tu correo. Intenta más tarde.');
    }
  }, []);

  /** Guarda el token para el paso 3. El código ya quedó consumido en el backend. */
  const verificarCodigo = useCallback(async (email: string, codigo: string) => {
    try {
      const token = await authApi.verificarCodigoResetContrasena(email, codigo);
      setResetToken(token);
    } catch (error) {
      throw conMensaje(error, 'El código no es válido o ya venció. Pedí uno nuevo.');
    }
  }, []);

  /**
   * Consume el token. Si venció o ya se usó, el backend responde 400 y la única salida es
   * volver a pedir un código: reintentar con el mismo token nunca va a funcionar, así que se
   * descarta acá también.
   */
  const cambiarContrasena = useCallback(async (contrasenaNueva: string) => {
    if (!resetToken) {
      // No debería poder pasar (a este paso solo se llega con un token), pero sin él el POST
      // fallaría igual del lado del backend con un mensaje menos claro que este.
      throw new ApiError(0, 'Tu código venció. Vuelve a pedir uno nuevo.');
    }
    try {
      await authApi.confirmarResetContrasena(resetToken, contrasenaNueva);
    } catch (error) {
      throw conMensaje(error, 'No pudimos cambiar tu contraseña. Vuelve a pedir un código.');
    } finally {
      setResetToken(null);
    }
  }, [resetToken]);

  /** Al abandonar el flujo (volver al login, gesto atrás) el token no debe seguir en memoria. */
  const reiniciar = useCallback(() => {
    setResetToken(null);
  }, []);

  return {
    enviarCodigo,
    verificarCodigo,
    cambiarContrasena,
    reiniciar,
  };
}
