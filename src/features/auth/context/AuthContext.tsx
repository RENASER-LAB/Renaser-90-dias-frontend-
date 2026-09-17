import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

import { registrarTokenPushNativo, escucharRotacionDeToken } from '../../mentor/notificaciones/pushNativo';
import { escucharAperturaDeAviso, olvidarRutaPendiente } from '../../mentor/notificaciones/rutaDeAviso';
import { FichaInicialData } from '../../onboarding/types/onboarding.types';
import * as authApi from '../api/authApi';
import { conexionChat } from '../../chat/tiempoReal/conexionStomp';
import * as onboardingApi from '../../onboarding/api/onboardingApi';
import { aUsuario } from '../api/usuarioMapper';
import { loginConGoogle } from '../api/googleAuth';
/* `mentorApi` es el único dueño del cliente de `/mentor/context`, así que la pregunta se hace
   ahí y no se duplica acá. No hay ciclo: ese archivo solo depende de `apiClient` y de sus
   propios schemas — el que mira hacia auth es `useEsMentor`, que es otro módulo. */
import { capacidadesDePrograma } from '../../mentor/api/mentorApi';
import {
  ApiError,
  cargarTokenPersistido,
  setTokenSesion,
  suscribirSesionVencida,
} from '../../../services/http/apiClient';
import {
  USUARIO_DEMO_APPLE,
  USUARIO_DEMO_EXISTENTE,
  USUARIO_DEMO_NUEVO,
  esperaSimulada,
} from '../data/usuariosDemo';
import type { ResultadoLoginSocial, User } from '../types/auth.types';

/**
 * Resuelve si el onboarding ya está completo consultando `GET /onboarding/state` — la fuente de
 * verdad real, no un booleano fijo. Las dos formas de fallo se tratan distinto a propósito:
 *
 * - **403**: el backend lo devuelve específicamente cuando la cuenta está SUSPENDED
 *   (`EstadoOnboardingService.requireActorActivo`, backend — no es un permiso de rol distinto).
 *   No es un fallo ambiguo, es una respuesta definitiva: esta cuenta no puede usar la app, y
 *   todas las demás pantallas van a fallar con el mismo 403 igual. Se relanza para que quien
 *   llama cierre la sesión en vez de adivinar un valor de onboarding sin sentido.
 * - **Cualquier otro error** (sin red, 500, timeout): es ambiguo, no sabemos si el onboarding
 *   terminó o no. Se elige `false` (mostrar el flujo de onboarding) porque el daño de repetirlo
 *   es una molestia menor; asumir `true` de forma optimista dejaría entrar sin la Ficha Inicial
 *   (datos obligatorios) a una cuenta que en realidad nunca la completó — un daño mayor y
 *   silencioso, justo el tipo de bug que esto viene a corregir.
 */
async function resolverOnboardingCompletado(): Promise<boolean> {
  try {
    const estado = await onboardingApi.obtenerEstado();
    return estado.completed;
  } catch (e) {
    if (e instanceof ApiError && e.esProhibido) {
      throw e;
    }
    return false;
  }
}

/**
 * Si esta persona puede entrar a la app sin haber completado el onboarding.
 *
 * El programa de 90 días es obligatorio para el aprendiz y opcional para quien acompaña (D-07).
 * Hasta ahora el gate no hacía esa distinción: un mentor que nunca activó su programa quedaba
 * atrapado en la Ficha Inicial, sin forma de llegar a su grupo.
 *
 * Quien lo decide es el servidor, no el rol que viaja en el perfil. Deducirlo en el móvil es lo
 * que ya falló una vez: los roles existen en dos idiomas y comprobar solo uno manda a un mentor
 * por la rama del aprendiz sin que nada avise.
 *
 * Ante la duda, el gate se CIERRA. Si no se pudo averiguar —endpoint sin desplegar, sin red— se
 * exige el onboarding, que es el comportamiento de siempre: un gate que se abre cuando no sabe
 * deja pasar justo a quien tenía que completarlo.
 */
async function resolverPuedeEntrarSinOnboarding(): Promise<boolean> {
  const capacidades = await capacidadesDePrograma();
  return capacidades?.programRequired === false;
}

/** Onboarding completo, o exento de completarlo. */
async function resolverGateDeIngreso(): Promise<boolean> {
  if (await resolverOnboardingCompletado()) {
    return true;
  }
  return resolverPuedeEntrarSinOnboarding();
}

export type { User } from '../types/auth.types';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  /** true mientras se rehidrata la sesión guardada. Permite evitar el parpadeo del login. */
  sesionCargando: boolean;
  isOnboardingCompleted: boolean;
  /**
   * false mientras `isOnboardingCompleted` todavía no refleja una respuesta confirmada para el
   * usuario logueado actual (login/rehidratación en curso). `RootNavigator` debe esperar a que
   * sea `true` antes de decidir entre `OnboardingFlow` y `MainTabs` — ver el comentario junto a
   * `useState` más abajo.
   */
  onboardingResuelto: boolean;
  fichaData: FichaInicialData | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<ResultadoLoginSocial | null>;
  loginWithApple: () => Promise<boolean>;
  sendOtp: (email: string) => Promise<boolean>;
  verifyOtp: (name: string, email: string, otp: string) => Promise<boolean>;
  actualizarPerfil: (datos: authApi.DatosActualizarPerfil) => Promise<void>;
  refrescarPerfil: () => Promise<void>;
  completeOnboarding: (ficha?: FichaInicialData) => void;
  restartOnboarding: () => void;
  demoLogin: () => void;
  demoNewUser: () => void;
  logout: () => void;
};

const AuthCtx = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [fichaData, setFichaData] = useState<FichaInicialData | null>(null);
  const [sesionCargando, setSesionCargando] = useState<boolean>(true);
  /**
   * true solo cuando `isOnboardingCompleted` refleja una respuesta real de
   * `resolverOnboardingCompletado` para el usuario logueado actual. Existe para que
   * `RootNavigator` pueda distinguir "todavía no sé" de "ya sé que no está completo": entre
   * `setUser(...)` y que resuelva la llamada a `/onboarding/state` hay un instante en que `user`
   * ya está seteado pero `isOnboardingCompleted` todavía arrastra su valor por defecto (`false`).
   * Sin esta bandera, ese instante se renderiza como "onboarding no completo" (se ve la Ficha
   * Inicial) y al resolver la promesa, si el valor real es `true`, la pantalla salta a Home — el
   * parpadeo "aparece la Ficha Inicial y se va sola" reportado en vivo. Se resetea a `false` al
   * arrancar cada intento de login/rehidratación y a `true` recién cuando el valor está confirmado
   * (en cualquiera de los dos sentidos).
   */
  const [onboardingResuelto, setOnboardingResuelto] = useState<boolean>(false);

  /**
   * Rehidrata la sesión al abrir la app: lee el token guardado en el Keychain/Keystore y pregunta
   * al backend quién es. Si el token venció en Redis, /me responde 401 y se descarta.
   *
   * Se pregunta al servidor en vez de guardar el perfil junto al token porque el rol o el estado
   * pueden haber cambiado mientras la app estaba cerrada: un usuario SUSPENDED con perfil cacheado
   * seguiría entrando como si nada.
   */
  useEffect(() => {
    let vigente = true;
    (async () => {
      const token = await cargarTokenPersistido();
      if (!token) {
        if (vigente) setSesionCargando(false);
        return;
      }
      try {
        const api = await authApi.perfilActual();
        if (!vigente) return;
        setUser(aUsuario(api));
        setOnboardingResuelto(false);
        try {
          const completado = await resolverGateDeIngreso();
          if (!vigente) return;
          setIsOnboardingCompleted(completado);
          setOnboardingResuelto(true);
        } catch {
          // 403 = cuenta suspendida (ver resolverOnboardingCompletado). Mismo tratamiento que un
          // token vencido: se descarta la sesión y la app arranca en el login, no se deja a la
          // persona entrar a Home con una cuenta que no puede usar ninguna pantalla.
          setUser(null);
          setTokenSesion(null);
        }
      } catch {
        // Token vencido o revocado: se limpia y la app arranca en el login, como corresponde.
        setTokenSesion(null);
      } finally {
        if (vigente) setSesionCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  /**
   * La sesión también puede morir con la app ABIERTA: el token vence en Redis, o se cierra desde
   * otro lado. `apiClient` lo detecta en un solo lugar —un 401 en una request que sí mandó
   * sesión— y avisa acá.
   *
   * Sin esto, cada pantalla fallaba por su cuenta y nadie llevaba a la persona al login: se
   * quedaba adentro de una app que no respondía. En el chat se veía peor que en ningún lado,
   * porque lo único que aparecía era un `Error 403` sin explicación.
   *
   * No se reusa `logout()` a propósito: ese le pide al backend cerrar una sesión que ya no
   * existe. Acá alcanza con limpiar lo local — el token ya lo descartó `apiClient` antes de
   * avisar.
   */
  useEffect(() => suscribirSesionVencida(() => {
    setUser(null);
    setIsOnboardingCompleted(false);
    setOnboardingResuelto(false);
    setFichaData(null);
    olvidarRutaPendiente();
  }), []);

  /**
   * El push nativo vive y muere con la sesion (RF-25).
   *
   * Se registra **cuando ya hay usuario**, no al arrancar la app: `POST /api/v1/push-tokens`
   * identifica al dueño del telefono por la sesion, asi que pedirlo antes lo ataria a nadie. Y se
   * suelta al salir, junto con cualquier ruta que un aviso hubiera dejado esperando — el aviso
   * era para la persona que se fue, y aplicarlo a la que entra despues en el mismo telefono
   * intentaria abrir la ficha de un alumno ajeno.
   *
   * El registro no bloquea nada ni muestra errores: si falla —sin permiso, sin credenciales del
   * proyecto, sin red— el aviso igual queda en la bandeja de la aplicacion. El push es el atajo,
   * no el canal.
   */
  useEffect(() => {
    if (!user) {
      olvidarRutaPendiente();
      return;
    }
    void registrarTokenPushNativo();
    const dejarDeEscucharToken = escucharRotacionDeToken();
    const dejarDeEscucharAvisos = escucharAperturaDeAviso();
    return () => {
      dejarDeEscucharToken();
      dejarDeEscucharAvisos();
    };
  }, [user]);

  /**
   * Login real contra POST /api/v1/auth/login. El backend responde el perfil y devuelve el
   * identificador de sesión en el header X-Auth-Token, que apiClient guarda solo.
   *
   * Los errores se dejan salir tal cual (ApiError con su status): LoginScreen decide el mensaje.
   * Tragarlos acá y devolver `false` fue lo que hacía el mock, y borra la diferencia entre
   * "contraseña incorrecta" y "el servidor no responde", que para quien usa la app no es lo mismo.
   */
  const login = useCallback(async (email: string, pass: string) => {
    const api = await authApi.iniciarSesion(email, pass);
    setUser(aUsuario(api));
    // Se resetea en el mismo tick que `setUser` (sin ningún `await` entre medio), así que React
    // los aplica en el mismo render: nunca hay un frame con `user` seteado y `onboardingResuelto`
    // todavía en `true` de una sesión anterior.
    setOnboardingResuelto(false);
    try {
      const completado = await resolverGateDeIngreso();
      setIsOnboardingCompleted(completado);
      setOnboardingResuelto(true);
    } catch (e) {
      // 403 = cuenta suspendida (ver resolverOnboardingCompletado): se deshace el login para que
      // LoginScreen lo trate igual que credenciales rechazadas (mensajeDeError ya sabe mostrar
      // "Tu cuenta no está habilitada para ingresar." para un ApiError con esProhibido), en vez
      // de dejar a la persona "adentro" a medias con una cuenta que no puede usar la app.
      setUser(null);
      setTokenSesion(null);
      throw e;
    }
    return true;
  }, []);

  /**
   * Login real con Google (Authorization Code + PKCE contra POST /api/v1/auth/social).
   *
   * Devuelve el resultado en crudo y no un booleano porque las respuestas del backend no se
   * reducen a "entró / no entró": dos dejan una solicitud esperando aprobación de un ADMIN y
   * otra manda a la persona a su contraseña. Achatarlas a `false` obliga a la pantalla a
   * adivinar qué pasó. `null` es que cerró el navegador — una decisión, no un error.
   */
  const loginWithGoogle = useCallback(async () => {
    const resultado = await loginConGoogle();
    if (resultado?.tipo === 'SESION') {
      setUser(aUsuario(resultado.usuario));
      setOnboardingResuelto(false);
      // El backend solo devuelve sesión si la cuenta ya existe y está aprobada — pero "ya existe"
      // no es lo mismo que "ya completó el onboarding" (pudo haberse creado por invitación de un
      // admin sin pasar por la Ficha Inicial todavía). Mismo bug que tenía `login`, mismo arreglo:
      // se pregunta al backend en vez de asumir. Ver `resolverOnboardingCompletado`.
      try {
        const completado = await resolverGateDeIngreso();
        setIsOnboardingCompleted(completado);
        setOnboardingResuelto(true);
      } catch (e) {
        setUser(null);
        setTokenSesion(null);
        throw e;
      }
    }
    return resultado;
  }, []);

  const loginWithApple = useCallback(async () => {
    await esperaSimulada(600);
    setUser(USUARIO_DEMO_APPLE);
    setIsOnboardingCompleted(false);
    setOnboardingResuelto(true);
    return true;
  }, []);

  /** Manda el código de 6 dígitos al correo (POST /api/v1/auth/email-verification/send). */
  const sendOtp = useCallback(async (email: string) => {
    await authApi.enviarCodigoVerificacion(email);
    return true;
  }, []);

  const verifyOtp = useCallback(async (name: string, email: string, otp: string) => {
    await esperaSimulada(600);
    if (otp.length === 6) {
      setUser({
        id: 'demo-otp',
        name: name.trim() || email.split('@')[0] || 'Miembro Renaser',
        email: email.trim(),
        role: 'TRAINEE',
        status: 'ACTIVE',
        avatarUrl: null,
      });
      setIsOnboardingCompleted(false);
      setOnboardingResuelto(true);
      return true;
    }
    throw new Error('Código OTP inválido');
  }, []);

  const register = useCallback(async (name: string, email: string, _pass: string) => {
    await esperaSimulada(500);
    setUser({
      id: 'demo-register',
      name: name.trim() || 'Miembro Renaser',
      email: email.trim(),
      role: 'TRAINEE',
      status: 'ACTIVE',
      avatarUrl: null,
    });
    setIsOnboardingCompleted(false);
    setOnboardingResuelto(true);
    return true;
  }, []);

  const refrescarPerfil = useCallback(async () => {
    const api = await authApi.miPerfil();
    setUser(aUsuario(api));
  }, []);

  const actualizarPerfil = useCallback(async (datos: authApi.DatosActualizarPerfil) => {
    await authApi.actualizarMiPerfil(datos);
    await refrescarPerfil();
  }, [refrescarPerfil]);

  const completeOnboarding = useCallback((data?: FichaInicialData) => {
    if (data) {
      setFichaData(data);
    }
    // Se refleja en el estado local ANTES de la llamada de red: es lo que hace que
    // `RootNavigator` reaccione al instante y muestre Home sin esperar al servidor.
    setIsOnboardingCompleted(true);
    // POST /onboarding/complete en el backend, sin esperarlo (fire-and-forget): si falla, la
    // persona ya está en Home igual — es preferible eso a dejarla atascada en un flujo que ya
    // terminó de llenar. Si el usuario vuelve a abrir la app después y esta llamada no llegó a
    // guardarse, `resolverOnboardingCompletado` volverá a preguntar y mostrará el flujo otra vez;
    // no hay pérdida de datos, solo tendría que repetirlo.
    void onboardingApi.completarOnboarding().catch(e => {
      console.warn('No se pudo confirmar el onboarding completo en el backend:', e);
    });
  }, []);

  const restartOnboarding = useCallback(() => {
    setIsOnboardingCompleted(false);
  }, []);

  // Demo Login: usuario existente con onboarding culminado (va directo a Home). Sin backend.
  const demoLogin = useCallback(() => {
    setUser(USUARIO_DEMO_EXISTENTE);
    setIsOnboardingCompleted(true);
    setOnboardingResuelto(true);
  }, []);

  // Demo New User: para recorrer el Onboarding entero desde cero. Sin backend.
  const demoNewUser = useCallback(() => {
    setUser(USUARIO_DEMO_NUEVO);
    setIsOnboardingCompleted(false);
    setOnboardingResuelto(true);
  }, []);

  const logout = useCallback(() => {
    // Se limpia el estado local sin esperar al servidor: cerrar sesión nunca debe poder fallar
    // desde el punto de vista de quien usa la app. authApi ya descarta el token igual.
    //
    // El socket del chat se corta ACÁ y no en la pantalla: lleva el token de quien se está
    // yendo, y el servidor cuenta esa conexión como "en línea". Sin esto, alguien que cierra
    // sesión seguiría figurando conectado para sus compañeros hasta que el sistema operativo
    // se dignara a cerrar el socket.
    conexionChat.cerrarTodo();
    void authApi.cerrarSesion().catch(() => undefined);
    setUser(null);
    setIsOnboardingCompleted(false);
    setOnboardingResuelto(false);
    setFichaData(null);
    olvidarRutaPendiente();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      sesionCargando,
      isOnboardingCompleted,
      onboardingResuelto,
      fichaData,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      sendOtp,
      verifyOtp,
      actualizarPerfil,
      refrescarPerfil,
      completeOnboarding,
      restartOnboarding,
      demoLogin,
      demoNewUser,
      logout,
    }),
    [
      user,
      sesionCargando,
      isOnboardingCompleted,
      onboardingResuelto,
      fichaData,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      sendOtp,
      verifyOtp,
      actualizarPerfil,
      refrescarPerfil,
      completeOnboarding,
      restartOnboarding,
      demoLogin,
      demoNewUser,
      logout,
    ]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const context = useContext(AuthCtx);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

export { ApiError };
