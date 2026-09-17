import { useCallback, useEffect, useState } from 'react';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import * as authApi from '../api/authApi';
import type { DatosConfirmacionSocial, EstadoSolicitud } from '../types/auth.types';
import { almacenamientoSeguro } from '../../../services/storage/almacenamientoSeguro';

/**
 * El alta real contra el backend Java, en un solo lugar.
 *
 * Son tres llamadas encadenadas y el orden importa, por eso no viven sueltas en la pantalla:
 *   1. `email-verification/send`    → manda el código de 6 dígitos.
 *   2. `email-verification/confirm` → canjea el código por un `verificationToken`.
 *   3. `account-requests`           → crea la SOLICITUD usando ese token.
 *
 * El punto que más se malinterpreta: el OTP NO da acceso. El paso 3 devuelve un
 * `accountRequestId` y la cuenta queda PENDIENTE hasta que un ADMIN/ALQUIMISTA la apruebe,
 * así que la app no debe entrar al home al verificar el código.
 */

/** El backend exige `@Size(min = 12, max = 200)` en la contraseña del alta y del reset. */
export const MIN_CONTRASENA = 12;
export const MAX_CONTRASENA = 200;

/**
 * Los datos tal como los tipea la persona, no como los recibe el backend: el formulario pide
 * nombres y apellidos por separado, así la validación puede decir cuál de los dos falta. La
 * concatenación a `fullName` ocurre una sola vez, al borde de la red (`confirmarYRegistrar`);
 * si el tipo llevara el nombre ya armado, un apellido vacío sería indistinguible de un nombre
 * vacío y el mensaje volvería a ser el genérico que veníamos evitando.
 */
export type DatosRegistro = {
  nombres: string;
  apellidos: string;
  email: string;
  city?: string;
  contrasena: string;
};

/** El backend espera un único `fullName`; partirlo en la BD sería una migración, no un ajuste. */
function nombreCompleto(datos: DatosRegistro): string {
  return `${datos.nombres.trim()} ${datos.apellidos.trim()}`;
}

/**
 * La regla de la contraseña, una sola vez: la usan el alta y la recuperación (D-102). Vive acá y
 * no en la pantalla para que los 12 caracteres tengan un solo dueño: si el backend la cambia, se
 * toca un archivo. Devuelve el mensaje a mostrar o `null` si está todo bien.
 */
export function validarContrasenaNueva(contrasena: string, confirmacion: string): string | null {
  if (contrasena.length < MIN_CONTRASENA) {
    return `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres`;
  }
  if (contrasena.length > MAX_CONTRASENA) {
    return `La contraseña no puede superar los ${MAX_CONTRASENA} caracteres`;
  }
  if (contrasena !== confirmacion) {
    return 'Las contraseñas no coinciden';
  }
  return null;
}

/**
 * Valida lo mismo que el backend, antes de gastar una llamada de red. Devuelve el mensaje a
 * mostrar o `null` si está todo bien.
 */
export function validarDatosRegistro(datos: DatosRegistro, confirmacion: string): string | null {
  if (!datos.nombres.trim()) {
    return 'Por favor ingresa tus nombres';
  }
  if (!datos.apellidos.trim()) {
    return 'Por favor ingresa tus apellidos';
  }
  if (!datos.email.trim() || !datos.email.includes('@')) {
    return 'Por favor ingresa un correo electrónico válido';
  }
  // El teléfono ya no se valida acá: se pide en la Ficha Inicial del onboarding.
  return validarContrasenaNueva(datos.contrasena, confirmacion);
}

/**
 * Reemplaza el mensaje por defecto de un error conservando su código HTTP. Sin esto, los dos
 * pasos del alta fallan con el mismo texto genérico y no se sabe si el problema fue el código
 * o la solicitud. Exportada porque la recuperación de contraseña tiene el mismo problema.
 */
export function conMensaje(error: unknown, porDefecto: string): ApiError {
  const texto = mensajeDeError(error, porDefecto);
  if (error instanceof ApiError) {
    return new ApiError(error.status, texto, error.body);
  }
  return new ApiError(0, texto, error);
}

export function useRegistroConOtp() {
  const [accountRequestId, setAccountRequestId] = useState<string | null>(null);

  /**
   * El id de la solicitud es la ÚNICA credencial para consultar su estado (el backend lo dice
   * explícitamente: no hay actor todavía, la credencial es poseer el UUID). Si vive solo en
   * memoria, cerrar la app deja a la persona sin forma de saber si la aprobaron. Se rehidrata
   * al montar y se guarda cifrado, igual que el token de sesión.
   */
  useEffect(() => {
    let vigente = true;
    void almacenamientoSeguro.leerSolicitud().then(id => {
      if (vigente && id) setAccountRequestId(id);
    });
    return () => {
      vigente = false;
    };
  }, []);
  const [estadoSolicitud, setEstadoSolicitud] = useState<EstadoSolicitud | null>(null);

  /** El reenvío se salta la comprobación de disponibilidad: ya se hizo al pedir el primero. */
  const reenviarCodigo = useCallback(async (email: string) => {
    try {
      await authApi.enviarCodigoVerificacion(email);
    } catch (error) {
      throw conMensaje(error, 'No se pudo enviar el código a tu correo. Intentá más tarde.');
    }
  }, []);

  /**
   * Antes de mandar el código se pregunta si el correo está libre: si ya tiene cuenta o una
   * solicitud en curso, el alta iba a fallar igual tres pasos más adelante, y para entonces la
   * persona ya tipeó el código de 6 dígitos para nada.
   */
  const enviarCodigo = useCallback(async (email: string) => {
    let disponible: boolean;
    try {
      disponible = await authApi.correoDisponible(email);
    } catch (error) {
      throw conMensaje(error, 'No pudimos verificar tu correo. Intentá de nuevo.');
    }
    if (!disponible) {
      throw new ApiError(409, 'Ese correo ya tiene una cuenta o una solicitud en curso. Prueba iniciando sesión.');
    }
    await reenviarCodigo(email);
  }, [reenviarCodigo]);

  /**
   * Canjea el código por el token y crea la solicitud. Devuelve el `accountRequestId`, que es la
   * única credencial para consultar el estado después: no hay sesión que guardar acá.
   */
  const confirmarYRegistrar = useCallback(async (datos: DatosRegistro, codigo: string) => {
    let verificationToken: string;
    try {
      verificationToken = await authApi.confirmarCodigoVerificacion(datos.email, codigo);
    } catch (error) {
      throw conMensaje(error, 'El código no es válido o ya venció. Pedí uno nuevo.');
    }

    try {
      const id = await authApi.registrarSolicitud({
        email: datos.email,
        fullName: nombreCompleto(datos),
        city: datos.city,
        contrasena: datos.contrasena,
        verificationToken,
      });
      void almacenamientoSeguro.guardarSolicitud(id);
      setAccountRequestId(id);
      setEstadoSolicitud({ status: 'PENDING', rejectionReason: null });
      return id;
    } catch (error) {
      throw conMensaje(error, 'No pudimos registrar tu solicitud. Revisa tus datos e inténtalo de nuevo.');
    }
  }, []);

  /**
   * Segundo paso del alta social (D-65): contraparte de `confirmarYRegistrar` para el camino de
   * Google/Apple/Facebook. Un solo POST en vez de tres — no hace falta OTP porque el proveedor
   * ya verificó el correo — pero el resultado se guarda igual (`accountRequestId` en estado y en
   * almacenamiento seguro) para que la pantalla de acuse y "consultar estado" funcionen idéntico
   * sin importar por qué camino se llegó a la solicitud.
   */
  const confirmarRegistroSocial = useCallback(async (datos: DatosConfirmacionSocial) => {
    try {
      const id = await authApi.completarRegistroSocial(datos);
      void almacenamientoSeguro.guardarSolicitud(id);
      setAccountRequestId(id);
      setEstadoSolicitud({ status: 'PENDING', rejectionReason: null });
      return id;
    } catch (error) {
      throw conMensaje(error, 'No pudimos completar tu registro. Intentá de nuevo.');
    }
  }, []);

  /** Relee el estado de la solicitud ya creada (PENDING / APPROVED / REJECTED). */
  const consultarEstado = useCallback(async () => {
    if (!accountRequestId) {
      return null;
    }
    try {
      const estado = await authApi.consultarEstadoSolicitud(accountRequestId);
      setEstadoSolicitud(estado);
      return estado;
    } catch (error) {
      throw conMensaje(error, 'No pudimos consultar el estado de tu solicitud.');
    }
  }, [accountRequestId]);

  const reiniciar = useCallback(() => {
    setAccountRequestId(null);
    setEstadoSolicitud(null);
  }, []);

  return {
    accountRequestId,
    estadoSolicitud,
    enviarCodigo,
    reenviarCodigo,
    confirmarYRegistrar,
    confirmarRegistroSocial,
    consultarEstado,
    reiniciar,
  };
}
