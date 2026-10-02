import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TargetedEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { useAuth } from '../context/AuthContext';
import { mensajeDeError } from '../services/http/apiClient';
import { Icon } from '../components/Icon';
import { MicroLabel } from '../components/ui';
import { Presionable } from '../components/Presionable';
import { tacto } from '../utils/tacto';
import {
  useRegistroConOtp,
  validarDatosRegistro,
  validarContrasenaNueva,
  MIN_CONTRASENA,
} from '../features/auth/hooks/useRegistroConOtp';
import { useRecuperacionContrasena } from '../features/auth/hooks/useRecuperacionContrasena';
import { useDisponibilidadCorreo } from '../features/auth/hooks/useDisponibilidadCorreo';
import { CodigoOtpInput, LARGO_CODIGO } from '../features/auth/components/CodigoOtpInput';
import { desplazamientoParaVerElCampo } from '../features/auth/utils/campoBajoElTeclado';
import { CabeceraDelIngreso } from '../features/auth/components/CabeceraDelIngreso';
import { CampoDelIngreso, MensajeBajoElCampo } from '../features/auth/components/CampoDelIngreso';
import { BotonDelIngreso } from '../features/auth/components/BotonDelIngreso';
import { EntradaEscalonada } from '../features/auth/components/EntradaEscalonada';
import { useSacudida } from '../features/auth/hooks/useSacudida';
import { abrirPoliticaDePrivacidad } from '../features/legal/enlacesLegales';

/**
 * `forgot` → `forgot_otp` → `forgot_new_password` es la recuperación de contraseña dentro de la
 * app (D-102): correo, código de 6 dígitos, contraseña nueva, y de vuelta al login. Reemplaza al
 * `forgot_sent` de antes, que solo decía "revisa tu bandeja" y esperaba un link hacia un
 * frontend web que no existe.
 */
type AuthStep =
  | 'form'
  | 'otp'
  | 'forgot'
  | 'forgot_otp'
  | 'forgot_new_password'
  | 'social_confirmar'
  | 'solicitud_enviada';
/** `register` es la vista «Solicitar acceso» (antes la pestaña «Crear cuenta»). */
type Tab = 'login' | 'register';
/** Bajo qué campo va el mensaje de error del formulario; `null`, al final de los campos. */
type CampoDelError = 'email' | 'password' | null;

/** Menos que esto no es un teclado en pantalla (ver `tecladoAbierto`). */
const ALTO_MINIMO_DE_UN_TECLADO = 120;

/** Aire bajo el campo enfocado en el formulario: lo que mide «¿Olvidaste tu contraseña?» y su separación. */
const MARGEN_EN_EL_FORMULARIO = 56;

/**
 * El nodo nativo que viaja en el `onFocus` de un `TextInput`. Se saca del tipo del evento en vez
 * de importarlo de las entrañas de React Native para no atarse a una ruta interna: es el mismo
 * objeto, y lo único que se le pide es `measureInWindow`.
 */
type CampoMedible = Exclude<NativeSyntheticEvent<TargetedEvent>['target'], number | undefined>;

export default function LoginScreen() {
  /* Sin `mode`/`toggle` desde el 2026-10-05: el botón de luna se quitó del login (el modo oscuro
     se elige en Yo). `isShort`/`isSmall` se fueron con el logotipo de texto: la cabecera nueva
     calcula su alto sola (`cabeceraDelIngreso`). */
  const { c, t } = useTheme();
  const { isTablet, horizontalPadding } = useResponsive();
  const {
    login,
    register,
    loginWithGoogle,
    // Sigue en el destructure aunque el boton de Apple este retirado: `handleSocialLogin`
    // conserva su rama 'apple' para cuando vuelva (ver el comentario del bloque quitado).
    loginWithApple,
  } = useAuth();

  // El alta real (OTP + solicitud pendiente de aprobación) vive en su propio hook: la pantalla
  // solo decide qué mostrar, no en qué orden se llaman los tres endpoints del backend.
  const {
    accountRequestId,
    estadoSolicitud,
    enviarCodigo,
    reenviarCodigo,
    confirmarYRegistrar,
    confirmarRegistroSocial,
    consultarEstado,
  } = useRegistroConOtp();

  // La recuperación de contraseña (código + contraseña nueva, D-102) sigue el mismo criterio:
  // el hook conoce el orden de los tres endpoints, la pantalla solo decide qué mostrar.
  const recuperacion = useRecuperacionContrasena();

  // Navigation / Step state
  const [step, setStep] = useState<AuthStep>('form');
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const enRecuperacion = step === 'forgot' || step === 'forgot_otp' || step === 'forgot_new_password';

  // Form fields
  // Nombres y apellidos se piden por separado porque así los lee y corrige la persona; el
  // backend sigue recibiendo un solo `fullName` y la concatenación la hace el hook del alta.
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  /* ==========================================================================================
     QUE EL TECLADO NO TAPE EL CAMPO QUE SE ESTÁ LLENANDO (2026-09-21)

     BUG: en "Crear cuenta", al tocar Contraseña el teclado subía y se comía el campo — no se veía
     lo que se escribía — y Confirmar contraseña quedaba directamente abajo del teclado. En
     "Iniciar sesión" pasaba lo mismo en pantallas cortas, porque el formulario es el mismo.

     Eran DOS cosas, no una:

     1. El `KeyboardAvoidingView` de abajo tenía `behavior` sólo en iOS (`Platform.OS === 'ios' ?
        'padding' : undefined`). Con `behavior` en `undefined` ese componente no hace absolutamente
        nada: devuelve un `View` pelado. Andaba igual mientras Android encogía la ventana al abrir
        el teclado, y desde que el modo edge-to-edge es obligatorio (Android, SDK 54+) eso ya no
        pasa: la app sigue dibujando debajo del teclado. Es el mismo arreglo que ya se hizo en el
        chat de Comunidad y en RENASIA — acá quedó sin hacer porque nadie había reportado el login.

     2. Aun con el área achicada, el formulario NO se mueve solo. El campo deja de estar tapado
        pero sigue estando abajo del pliegue, así que habría que arrastrar con el dedo mientras se
        escribe. El scroll nativo al hijo enfocado tampoco lo resuelve: Android lo decide en el
        momento del foco, cuando el teclado todavía no subió y el campo se ve perfecto.

     Por eso además de arreglar el `KeyboardAvoidingView` se lleva la lista hasta el campo. El
     disparador es el cambio de alto de la propia lista, no un evento de teclado: cuando el área
     se achica —la encoja el `KeyboardAvoidingView` o la encoja el sistema— hay que reacomodar, y
     así la misma cuenta sirve en las dos situaciones. Y se mide el área visible de verdad en vez
     de calcularla desde la posición del teclado, así el resultado no depende de que el
     `keyboardVerticalOffset` de más abajo esté fino al píxel.
     ========================================================================================== */
  const insets = useSafeAreaInsets();
  const listaRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const campoEnfocado = useRef<CampoMedible | null>(null);
  const desplazamientoDeLaLista = useRef(0);
  const altoDeLaLista = useRef(0);

  /**
   * Corre la lista, si hace falta, hasta que el campo enfocado entre entero en lo que queda
   * visible. `altoVisible` llega desde `onLayout` porque ése es el alto definitivo que calculó el
   * motor de layout; medirlo con `measureInWindow` en ese mismo instante daría un valor a mitad de
   * la animación con la que sube el teclado.
   */
  const asegurarCampoVisible = (altoVisible?: number) => {
    const lista = listaRef.current;
    const campo = campoEnfocado.current;
    /* El `ScrollView` de React Native no se mide a sí mismo: hay que pedirle el nodo nativo, que
       además es el que corresponde: su recuadro es el área visible, no el alto del contenido. */
    const nodoDeLaLista = lista?.getNativeScrollRef();
    if (!lista || !campo || !nodoDeLaLista) return;
    nodoDeLaLista.measureInWindow((_x, listaY, _ancho, listaAlto) => {
      campo.measureInWindow((_campoX, campoY, _campoAncho, campoAlto) => {
        const destino = desplazamientoParaVerElCampo(
          { y: campoY, alto: campoAlto },
          { y: listaY, alto: altoVisible ?? listaAlto },
          desplazamientoDeLaLista.current,
          // En el login, bajo la contraseña está «¿Olvidaste tu contraseña?» (44 px de alto
          // táctil): con el teclado arriba también tiene que verse, no quedar justo bajo el pliegue.
          step === 'form' ? MARGEN_EN_EL_FORMULARIO : undefined,
        );
        if (destino !== null) lista.scrollTo({ y: destino, animated: true });
      });
    });
  };

  /**
   * Reemplaza al `onFocus` de una línea que tenían los campos: además de prender el borde
   * dorado, guarda el nodo para poder medirlo. Acomoda de una cuando el teclado YA estaba abierto
   * (pasar de un campo al siguiente): ahí no va a haber cambio de alto que dispare el reacomodo.
   */
  const enfocarCampo = (nombre: string, evento: NativeSyntheticEvent<TargetedEvent>) => {
    setFocusedField(nombre);
    /* El `target` del evento es el nodo nativo del campo. La comprobación no es ceremonia: en la
       arquitectura vieja de React Native ahí venía un número, y esta pantalla es la puerta de
       entrada a la app — si algún día llegara algo que no se puede medir, lo que corresponde es
       quedarse sin el reacomodo, no reventar el login. */
    const nodo = evento.target;
    campoEnfocado.current =
      typeof nodo === 'object' && nodo !== null && typeof nodo.measureInWindow === 'function'
        ? nodo
        : null;
    asegurarCampoVisible();
  };

  /* Con el teclado arriba el pie muestra sólo el botón: «¿No tienes cuenta? Solicitar acceso» no
     sirve mientras se escribe y le quita 48 px a lo que se está llenando. Se escucha el teclado
     (dos eventos por apertura, no por cuadro) y no se anima nada: aparece y desaparece con él. */
  const [tecladoAbierto, setTecladoAbierto] = useState(false);
  useEffect(() => {
    /* Sólo cuenta un teclado de verdad. Con un teclado físico (o en el emulador), Gboard muestra
       una barrita flotante que también dispara `keyboardDidShow`, con un alto chico: por ella no
       se esconde nada. */
    const alAbrir = Keyboard.addListener('keyboardDidShow', evento =>
      setTecladoAbierto(evento.endCoordinates.height > ALTO_MINIMO_DE_UN_TECLADO),
    );
    const alCerrar = Keyboard.addListener('keyboardDidHide', () => setTecladoAbierto(false));
    return () => {
      alAbrir.remove();
      alCerrar.remove();
    };
  }, []);

  const desenfocarCampo = () => {
    setFocusedField(null);
    campoEnfocado.current = null;
  };

  /**
   * La lista cambió de alto. Sólo interesa cuando ENCOGIÓ: eso es el teclado apareciendo. Cuando
   * crece —el teclado se fue— no se toca nada, para no arrancarle el contenido de los ojos a
   * alguien que acaba de cerrar el teclado a propósito.
   */
  const alAcomodarLaLista = (evento: LayoutChangeEvent) => {
    const alto = evento.nativeEvent.layout.height;
    const encogio = altoDeLaLista.current > 0 && alto < altoDeLaLista.current;
    altoDeLaLista.current = alto;
    if (encogio) asegurarCampoVisible(alto);
  };

  // Aviso en vivo de disponibilidad del correo, solo en la pestaña de crear cuenta: en login
  // no ayuda a nadie saber si un correo existe. Se le pasa string vacío fuera de esa pestaña
  // para que el hook quede en 'idle' sin consultar nada.
  const disponibilidadCorreo = useDisponibilidadCorreo(activeTab === 'register' ? email : '');

  // Segundo paso del alta social (D-65): credencial de un solo uso, válida 10 minutos, que
  // llega en el 202 de `POST /auth/social` y hay que reenviar tal cual a `/social/complete`.
  // Nunca se loguea ni se persiste: si la persona cierra la app en el medio, se pierde el paso
  // y tiene que rehacer el login con el proveedor — comportamiento correcto, no un bug.
  const [registroPendienteToken, setRegistroPendienteToken] = useState<string | null>(null);

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const otpInputRef = useRef<TextInput>(null);

  /* La tecla de acción del teclado lleva al campo siguiente («Siguiente») y, en el último, envía
     («Ir»), como en cualquier formulario de una app (2026-10-05). Antes todos los campos mostraban
     el tilde de «listo», que sólo cerraba el teclado: había que buscar el botón con el dedo. */
  const apellidosRef = useRef<TextInput>(null);
  const correoRef = useRef<TextInput>(null);
  const contrasenaRef = useRef<TextInput>(null);
  const confirmarRef = useRef<TextInput>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [campoDelError, setCampoDelError] = useState<CampoDelError>(null);
  const sacudida = useSacudida();

  /**
   * El ingreso no se pudo: el mensaje va debajo del campo que hay que corregir, el borde de ese
   * campo pasa a rojo, el bloque de campos se sacude y el teléfono vibra con el patrón de error,
   * todo en el mismo instante (`apple-design` §13: causa y respuesta en el mismo cuadro). La
   * vibración nunca va sola: muchos teléfonos la tienen apagada.
   */
  const rechazarIngreso = (mensaje: string, campo: CampoDelError) => {
    setErrorMessage(mensaje);
    setCampoDelError(campo);
    tacto.error();
    sacudida.sacudir();
    /* Con el teclado arriba, el mensaje nuevo empuja «¿Olvidaste tu contraseña?» bajo el pliegue
       (visto en el emulador): se lleva la lista hasta el final, que es justo el mensaje y ese
       enlace. Sin teclado el formulario entra entero y esto no mueve nada. */
    setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 60);
  };

  /**
   * Pasar entre «Iniciar sesión» y «Solicitar acceso» (el pie, la flecha de arriba y el atrás del
   * sistema). Hace lo mismo que hacían las pestañas: cambia la vista y limpia los avisos, sin
   * borrar lo que la persona ya escribió.
   */
  const irA = (pestana: Tab) => {
    setActiveTab(pestana);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCampoDelError(null);
  };

  // Timer for OTP resend — el mismo para el código del alta y el de la recuperación.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if ((step === 'otp' || step === 'forgot_otp') && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleReturnToLogin = () => {
    setStep('form');
    setActiveTab('login');
    setOtpCode('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setCampoDelError(null);
    // Es una credencial de un solo uso: si la persona abandona el formulario de confirmación
    // social, no queda nada creado (el backend lo vence solo a los 10 minutos) y acá tampoco
    // debería seguir viviendo en memoria.
    setRegistroPendienteToken(null);
    // Mismo criterio para el token de reset (D-102), y los campos de contraseña se comparten
    // entre el alta y la contraseña nueva: no deben quedar cargados al volver al login.
    recuperacion.reiniciar();
    setPassword('');
    setConfirmPassword('');
  };

  /**
   * El gesto lateral del sistema retrocede UN paso y nunca cierra la app (AGENTS.md §6). En la
   * recuperación, "un paso atrás" desde el código o desde la contraseña nueva es volver a pedir
   * el código: el que se tipeó ya quedó consumido en el backend, así que mostrar de nuevo las
   * casillas sería mentir. Para el resto de subpantallas, atrás es el login.
   */
  const handleBack = () => {
    if (step === 'forgot_otp' || step === 'forgot_new_password') {
      setErrorMessage(null);
      setSuccessMessage(null);
      setOtpCode('');
      setPassword('');
      setConfirmPassword('');
      recuperacion.reiniciar();
      setStep('forgot');
      return;
    }
    handleReturnToLogin();
  };

  // Interceptar gestos táctiles de retroceso en cualquier subpantalla (OTP, recuperación, etc.).
  // Desde que «Solicitar acceso» es una vista y no una pestaña (2026-10-05), atrás desde ahí vuelve
  // al login en vez de salir de la app.
  useSystemBackHandler(() => {
    if (step !== 'form') {
      handleBack();
      return true;
    }
    if (activeTab === 'register') {
      irA('login');
      return true;
    }
    return false;
  }, step !== 'form' || activeTab === 'register');

  const handleFormSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setCampoDelError(null);

    if (activeTab === 'register') {
      // Las mismas reglas que el backend (incluida la contraseña de 12 caracteres), en un solo
      // lugar: validarlas acá evita un 400 después de haber tipeado el código de 6 dígitos.
      const errorDeValidacion = validarDatosRegistro(
        { nombres, apellidos, email, contrasena: password },
        confirmPassword,
      );
      if (errorDeValidacion) {
        setErrorMessage(errorDeValidacion);
        return;
      }

      // Enviar código OTP y pasar a pantalla de verificación
      try {
        setLoading(true);
        await enviarCodigo(email);
        setStep('otp');
        setResendTimer(45);
        setCanResend(false);
        setOtpCode('');
        setSuccessMessage(`Código enviado a ${email.trim()}`);
        setTimeout(() => otpInputRef.current?.focus(), 300);
      } catch (error) {
        setErrorMessage(mensajeDeError(error, 'Error al enviar el código de confirmación'));
      } finally {
        setLoading(false);
      }
    } else {
      // Iniciar sesión. Los mensajes son los de siempre; lo nuevo (2026-10-05) es DÓNDE se ven:
      // debajo del campo que hay que corregir, con la sacudida y la vibración de error. Lo que
      // responde el servidor (credenciales, cuenta suspendida, demasiados intentos…) va bajo la
      // contraseña, que es lo que la persona vuelve a escribir.
      if (!email.trim() || !email.includes('@')) {
        rechazarIngreso('Por favor ingresa tu correo electrónico', 'email');
        return;
      }
      if (!password) {
        rechazarIngreso('Por favor ingresa tu contraseña', 'password');
        return;
      }

      try {
        setLoading(true);
        await login(email, password);
      } catch (error) {
        rechazarIngreso(mensajeDeError(error, 'No pudimos iniciar tu sesión.'), 'password');
      } finally {
        setLoading(false);
      }
    }
  };

  /**
   * Un código que el backend rechazó, o que un reenvío acaba de invalidar, no sirve para nada
   * más: se vacían las casillas y vuelve el foco al input para tipear el nuevo. Sin esto, los
   * seis dígitos viejos quedaban en pantalla y, como el `TextInput` real está oculto, la persona
   * no encontraba cómo borrarlos (reporte de prueba de campo, 2026-09-16). Lo usan el alta y la
   * recuperación de contraseña, que comparten `CodigoOtpInput`.
   */
  const descartarCodigo = () => {
    setOtpCode('');
    setTimeout(() => otpInputRef.current?.focus(), 300);
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    if (otpCode.length !== LARGO_CODIGO) {
      setErrorMessage('Por favor ingresa los 6 dígitos del código');
      return;
    }

    try {
      setLoading(true);
      // El código verifica el correo y habilita el alta, pero NO abre sesión: la solicitud queda
      // pendiente de que un ADMIN/ALQUIMISTA la apruebe. Por eso la pantalla siguiente es el
      // acuse de recibo y no el home.
      await confirmarYRegistrar({ nombres, apellidos, email, contrasena: password }, otpCode);
      setSuccessMessage(null);
      setStep('solicitud_enviada');
    } catch (error) {
      setErrorMessage(mensajeDeError(error, 'Código inválido o expirado. Inténtalo de nuevo.'));
      descartarCodigo();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      await reenviarCodigo(email);
      setResendTimer(45);
      setCanResend(false);
      setSuccessMessage('Nuevo código enviado a tu correo.');
      descartarCodigo();
    } catch (error) {
      setErrorMessage(mensajeDeError(error, 'No se pudo reenviar el código. Inténtalo más tarde.'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * El `accountRequestId` es la única credencial para saber cómo viene la solicitud mientras no
   * haya sesión, así que la pantalla de acuse permite releer el estado sin salir de ahí.
   */
  const handleConsultarEstado = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      setLoading(true);
      const estado = await consultarEstado();
      if (estado) {
        setSuccessMessage(
          estado.status === 'APPROVED'
            ? 'Tu solicitud fue aprobada. Ya puedes iniciar sesión.'
            : estado.status === 'REJECTED'
            ? estado.rejectionReason || 'Tu solicitud fue rechazada.'
            : 'Tu solicitud sigue en revisión.',
        );
      }
    } catch (error) {
      setErrorMessage(mensajeDeError(error, 'No pudimos consultar el estado de tu solicitud.'));
    } finally {
      setLoading(false);
    }
  };

  /** Paso 1 de la recuperación (D-102): pedir el código de 6 dígitos al correo. */
  const handleForgotPasswordSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor ingresa un correo electrónico válido');
      return;
    }

    try {
      setLoading(true);
      await recuperacion.enviarCodigo(email);
      setStep('forgot_otp');
      setResendTimer(45);
      setCanResend(false);
      setOtpCode('');
      // El backend responde 202 exista o no la cuenta; el mensaje tiene que decir lo mismo en
      // los dos casos, si no la pantalla revelaría qué correos están registrados.
      setSuccessMessage(`Si ${email.trim()} tiene cuenta, te enviamos un código.`);
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (error) {
      setErrorMessage(mensajeDeError(error, 'No pudimos enviar el código. Intenta más tarde.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendForgotOtp = async () => {
    if (!canResend || loading) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      await recuperacion.enviarCodigo(email);
      setResendTimer(45);
      setCanResend(false);
      setSuccessMessage('Nuevo código enviado a tu correo.');
      descartarCodigo();
    } catch (error) {
      setErrorMessage(mensajeDeError(error, 'No se pudo reenviar el código. Inténtalo más tarde.'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Paso 2: canjear el código por el token de reset. El código no cambia nada por sí solo —
   * recién con el token en mano se pide la contraseña nueva, así que la persona no tipea una
   * contraseña que después no se va a poder guardar.
   */
  const handleVerifyForgotOtp = async () => {
    setErrorMessage(null);
    if (otpCode.length !== LARGO_CODIGO) {
      setErrorMessage('Por favor ingresa los 6 dígitos del código');
      return;
    }

    try {
      setLoading(true);
      await recuperacion.verificarCodigo(email, otpCode);
      setSuccessMessage(null);
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setStep('forgot_new_password');
    } catch (error) {
      setErrorMessage(mensajeDeError(error, 'Código inválido o expirado. Inténtalo de nuevo.'));
      descartarCodigo();
    } finally {
      setLoading(false);
    }
  };

  /** Paso 3: la misma regla de contraseña que el alta, validada antes de gastar la llamada. */
  const handleChangePassword = async () => {
    setErrorMessage(null);
    const errorDeValidacion = validarContrasenaNueva(password, confirmPassword);
    if (errorDeValidacion) {
      setErrorMessage(errorDeValidacion);
      return;
    }

    try {
      setLoading(true);
      await recuperacion.cambiarContrasena(password);
      // De vuelta al login con el correo ya cargado: solo falta tipear la contraseña nueva.
      handleReturnToLogin();
      setSuccessMessage('Tu contraseña se actualizó. Inicia sesión con la nueva.');
    } catch (error) {
      // El token es de un solo uso: si venció o ya se usó, reintentar con la misma contraseña
      // nunca va a funcionar. El mensaje tiene que decir la única salida real.
      setErrorMessage(mensajeDeError(error, 'No pudimos cambiar tu contraseña. Vuelve a pedir un código.'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Google abre el navegador del sistema (Authorization Code + PKCE) y el backend decide qué
   * pasa: entrar, quedar en solicitud, o mandar a la persona a su contraseña. Solo una de esas
   * respuestas la saca de esta pantalla, así que las otras hay que contarlas acá o se queda
   * mirando un botón que dejó de girar sin explicación.
   */
  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      setSocialLoading(provider);
      if (provider === 'apple') {
        await loginWithApple();
        return;
      }

      const resultado = await loginWithGoogle();
      // `null` = cerró la ventana de Google. Cancelar es una decisión, no un fallo: no se dice nada.
      if (!resultado) {
        return;
      }
      // 'SESION' ya cambió el usuario en el contexto y la navegación se encarga del resto.
      if (resultado.tipo === 'REGISTRO_PENDIENTE') {
        // Identidad nueva (D-65): todavía no existe ninguna solicitud. Prellenamos el formulario
        // de confirmación con lo que devolvió Google y recién al confirmar se crea la
        // AccountRequest — el `code` de OAuth ya se gastó, así que no hay otra forma de pedir
        // estos datos que no sea un segundo paso.
        // Partimos el nombre completo en nombres/apellidos como en el alta por formulario: es
        // lo mejor que se puede hacer con un solo campo, y la persona puede corregirlo.
        const partes = resultado.fullName.trim().split(/\s+/).filter(Boolean);
        setNombres(partes[0] || '');
        setApellidos(partes.slice(1).join(' '));
        setEmail(resultado.email);
        setRegistroPendienteToken(resultado.registroPendienteToken);
        setStep('social_confirmar');
      } else if (resultado.tipo === 'SOLICITUD_EN_REVISION') {
        setSuccessMessage(
          'Ya tenías una solicitud en revisión. Te avisamos por correo apenas un administrador la apruebe.',
        );
      } else if (resultado.tipo === 'CONFLICTO_CORREO') {
        // Reintentar con Google nunca va a funcionar, así que el mensaje tiene que decir la
        // única salida real en vez de un "error al conectar" que la deje probando el mismo botón.
        setErrorMessage('Ese correo ya tiene una cuenta. Ingresa con tu contraseña.');
      }
    } catch (error) {
      setErrorMessage(
        mensajeDeError(error, `Error al conectar con ${provider === 'google' ? 'Google' : 'Apple'}`),
      );
    } finally {
      setSocialLoading(null);
    }
  };

  /**
   * Confirma el formulario que prellenó `handleSocialLogin` y recién ACÁ se crea la
   * `AccountRequest` (D-65): hasta este punto solo existe una identidad verificada por Google,
   * retenida 10 minutos en el backend. El correo no se manda —ni se puede editar, ver más
   * abajo— porque el backend lo toma del registro pendiente, nunca del cuerpo del request.
   */
  const handleConfirmarRegistroSocial = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nombres.trim()) {
      setErrorMessage('Por favor ingresa tus nombres');
      return;
    }
    if (!apellidos.trim()) {
      setErrorMessage('Por favor ingresa tus apellidos');
      return;
    }
    if (!registroPendienteToken) {
      // No debería poder pasar (a este paso solo se llega con un token), pero sin él el POST
      // fallaría igual del lado del backend con un mensaje menos claro que este.
      setErrorMessage('Tu verificación con Google venció. Vuelve a intentar con Google.');
      return;
    }

    try {
      setLoading(true);
      await confirmarRegistroSocial({
        registroPendienteToken,
        fullName: `${nombres.trim()} ${apellidos.trim()}`,
      });
      setRegistroPendienteToken(null);
      setStep('solicitud_enviada');
    } catch (error) {
      // El token es de un solo uso: si venció o ya se usó, el `code` de OAuth original también
      // está gastado, así que la única salida real es rehacer el login con Google desde cero —
      // reintentar "Enviar solicitud" con el mismo token nunca va a funcionar. El backend ya
      // manda ese mensaje exacto en el 400 (`RegistroPendienteSocialInvalidoException`), así que
      // alcanza con mostrarlo tal cual viene.
      setErrorMessage(mensajeDeError(error, 'No pudimos completar tu registro. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  /* El login es la única vista con la cabecera alta; «Solicitar acceso» y los pasos que siguen
     (código, recuperación, acuse) llevan la baja, con la flecha para volver. */
  const enElLogin = step === 'form' && activeTab === 'login';
  const anchoDelContenido = {
    paddingHorizontal: horizontalPadding,
    maxWidth: isTablet ? 460 : undefined,
    alignSelf: isTablet ? ('center' as const) : ('stretch' as const),
    width: isTablet ? ('100%' as const) : undefined,
  };

  return (
    /*
      REDISEÑO DEL 2026-10-05 (pedido del dueño, con la imagen de cabecera que generó él): el fénix
      a sangre arriba, fundido con el fondo en un degradado largo (`CabeceraDelIngreso`), el
      formulario sobre fondo liso y el botón fijo abajo, en la zona del pulgar. Lo que se fue y por
      qué:

      - **Las pestañas «Iniciar sesión / Crear cuenta»** como navegación principal: crear cuenta pasó
        a ser una vista propia, «Solicitar acceso», a la que se llega desde el pie. La lógica del
        alta no cambió (sigue siendo por solicitud aprobada, con el mismo hook y las mismas
        validaciones); sólo cambió la puerta.
      - **El botón de luna/sol**: la pantalla sigue el modo que la persona eligió en Yo → «Modo
        oscuro» (queda guardado en el teléfono), como el resto de la app desde el 2026-09-18. Si
        nunca eligió, el claro: `app.json` fija `userInterfaceStyle: "light"`, así que el tema del
        sistema hoy no llega a la app.
      - **«Google · Próximamente», el separador «o accede con» y la frase del pie**: un botón que
        no hace nada y una frase que repetía la marca. `handleSocialLogin` y el paso de
        confirmación social quedan intactos para cuando Google vuelva (como pasó con Apple).
      - **«Recordarme»: no se agregó**, porque la app ya mantiene la sesión abierta (el token queda
        guardado en el teléfono y sólo se cierra con «Cerrar sesión» o si vence en el servidor).

      Sin `SafeAreaView`: la imagen tiene que llegar detrás de la barra de estado. El borde seguro
      de arriba lo respeta la flecha de volver (`insets.top`) y el de abajo, el pie.
    */
    <View style={[styles.raiz, { backgroundColor: c.bg }]}>
      {/*
        `behavior` en las dos plataformas: ver el bloque «QUE EL TECLADO NO TAPE EL CAMPO…». La
        vista empieza en el borde de arriba de la pantalla (ya no hay `SafeAreaView` encima), así
        que no hace falta compensar la barra de estado: el desfase es 0 en las dos plataformas.
      */}
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={styles.raiz}>
        <ScrollView
          ref={listaRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: step === 'form' ? 16 : insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onLayout={alAcomodarLaLista}
          onScroll={(evento: NativeSyntheticEvent<NativeScrollEvent>) => {
            desplazamientoDeLaLista.current = evento.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <CabeceraDelIngreso
            variante={enElLogin ? 'alta' : 'baja'}
            alVolver={enElLogin ? undefined : step === 'form' ? () => irA('login') : handleReturnToLogin}
          />

          <View style={[styles.cuerpo, anchoDelContenido]}>
          {/* ========================================================================= */}
          {/* VISTA 1: INICIAR SESIÓN / SOLICITAR ACCESO                                 */}
          {/* ========================================================================= */}
          {step === 'form' && (
            <>
              {/* La `key` con la pestaña hace que el título y los campos vuelvan a entrar al pasar
                  de una vista a la otra; dentro de una misma vista no se vuelve a animar nada. */}
              <EntradaEscalonada key={`titulo-${activeTab}`} indice={0}>
                <Text accessibilityRole="header" style={[styles.titulo, { color: c.textStrong }]}>
                  {activeTab === 'login' ? 'Iniciar sesión' : 'Solicitar acceso'}
                </Text>
                <View style={[styles.subrayadoDelTitulo, { backgroundColor: c.gold }]} />
              </EntradaEscalonada>

              <EntradaEscalonada key={`campos-${activeTab}`} indice={1}>
                {/* Lo que se sacude cuando el ingreso se rechaza. */}
                <Animated.View style={[styles.campos, sacudida.estilo]}>
                  {/* Avisos que llegan desde otro paso: «contraseña actualizada» (D-102) o «ya
                      tenías una solicitud en revisión» (login social). */}
                  {successMessage ? (
                    <View style={[styles.alertBox, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
                      <Text style={[t.small, { color: c.goldInk, textAlign: 'center' }]}>{successMessage}</Text>
                    </View>
                  ) : null}

                  {activeTab === 'register' && (
                    <CampoDelIngreso
                      etiqueta="Nombres"
                      icono="user"
                      enfocado={focusedField === 'nombres'}
                      value={nombres}
                      onChangeText={setNombres}
                      placeholder="Ej. Sebastián"
                      onFocus={evento => enfocarCampo('nombres', evento)}
                      onBlur={desenfocarCampo}
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="given-name"
                      textContentType="givenName"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => apellidosRef.current?.focus()}
                    />
                  )}

                  {activeTab === 'register' && (
                    <CampoDelIngreso
                      ref={apellidosRef}
                      etiqueta="Apellidos"
                      icono="user"
                      enfocado={focusedField === 'apellidos'}
                      value={apellidos}
                      onChangeText={setApellidos}
                      placeholder="Ej. Arango"
                      onFocus={evento => enfocarCampo('apellidos', evento)}
                      onBlur={desenfocarCampo}
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="family-name"
                      textContentType="familyName"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => correoRef.current?.focus()}
                    />
                  )}

                  <CampoDelIngreso
                    ref={correoRef}
                    testID="campo-email"
                    etiqueta="Correo electrónico"
                    icono="mail"
                    enfocado={focusedField === 'email'}
                    conError={errorMessage !== null && campoDelError === 'email'}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tucorreo@ejemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType={activeTab === 'login' ? 'username' : 'emailAddress'}
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => contrasenaRef.current?.focus()}
                    onFocus={evento => enfocarCampo('email', evento)}
                    onBlur={desenfocarCampo}
                    debajo={
                      <>
                        {errorMessage && campoDelError === 'email' ? <MensajeBajoElCampo texto={errorMessage} /> : null}
                        {/* Aviso en vivo de disponibilidad: solo al solicitar acceso, y solo cuando
                            hay un veredicto real. "Verificando" y "idle" no muestran nada para no
                            agregar ruido mientras la persona todavía está escribiendo. */}
                        {activeTab === 'register' && disponibilidadCorreo === 'verificando' && (
                          <Text style={[t.micro, { color: c.textSoft }]}>Verificando disponibilidad...</Text>
                        )}
                        {activeTab === 'register' && disponibilidadCorreo === 'disponible' && (
                          <Text style={[t.micro, { color: c.goldInk }]}>Este correo está disponible.</Text>
                        )}
                        {activeTab === 'register' && disponibilidadCorreo === 'tomado' && (
                          <Text style={[t.micro, { color: c.danger }]}>
                            Ese correo ya tiene una cuenta. Puedes iniciar sesión.
                          </Text>
                        )}
                      </>
                    }
                  />

                  {/* El teléfono se pide en la Ficha Inicial del onboarding, no acá: el alta tiene
                      que ser lo más liviana posible para que nadie la abandone a mitad de camino. */}

                  <CampoDelIngreso
                    ref={contrasenaRef}
                    testID="campo-password"
                    etiqueta="Contraseña"
                    icono="lock"
                    enfocado={focusedField === 'password'}
                    conError={errorMessage !== null && campoDelError === 'password'}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={activeTab === 'register' ? `Mínimo ${MIN_CONTRASENA} caracteres` : 'Tu contraseña'}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    // Al solicitar acceso el gestor de contraseñas propone una nueva; al entrar, la guardada.
                    autoComplete={activeTab === 'register' ? 'new-password' : 'current-password'}
                    textContentType={activeTab === 'register' ? 'newPassword' : 'password'}
                    returnKeyType={activeTab === 'register' ? 'next' : 'go'}
                    submitBehavior={activeTab === 'register' ? 'submit' : 'blurAndSubmit'}
                    onSubmitEditing={() => {
                      if (activeTab === 'register') confirmarRef.current?.focus();
                      else void handleFormSubmit();
                    }}
                    onFocus={evento => enfocarCampo('password', evento)}
                    onBlur={desenfocarCampo}
                    accesorio={
                      /* 44 × 44 de área táctil dentro del recuadro de 52: se acierta sin apuntar. */
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.ojo}
                      >
                        <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} color={c.tabInactive} />
                      </Pressable>
                    }
                    debajo={
                      errorMessage && campoDelError === 'password' ? <MensajeBajoElCampo texto={errorMessage} /> : null
                    }
                  />

                  {activeTab === 'login' && (
                    <Pressable
                      hitSlop={{ left: 12, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Recuperar la contraseña"
                      onPress={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setStep('forgot');
                      }}
                      style={styles.olvido}
                    >
                      {({ pressed }) => (
                        <Text style={[t.small, styles.textoOlvido, { color: c.goldInk, opacity: pressed ? 0.6 : 1 }]}>
                          ¿Olvidaste tu contraseña?
                        </Text>
                      )}
                    </Pressable>
                  )}

                  {activeTab === 'register' && (
                    <CampoDelIngreso
                      ref={confirmarRef}
                      etiqueta="Confirmar contraseña"
                      icono="lock"
                      enfocado={focusedField === 'confirmPassword'}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repite tu contraseña"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="go"
                      onSubmitEditing={() => void handleFormSubmit()}
                      onFocus={evento => enfocarCampo('confirmPassword', evento)}
                      onBlur={desenfocarCampo}
                    />
                  )}

                  {/* Un error que no es de un campo en particular (las validaciones del alta, un
                      fallo al enviar el código) va al final de los campos, junto al botón. */}
                  {errorMessage && campoDelError === null ? <MensajeBajoElCampo texto={errorMessage} /> : null}
                </Animated.View>
              </EntradaEscalonada>

              {/*
                "ACCESO DIRECTO (MODO DEMO)" retirado (2026-09-05, pedido del dueno del proyecto).

                No era un atajo de UI: `demoLogin` (AuthContext) entraba a la app SIN ninguna
                llamada al servidor — fijaba USUARIO_DEMO_EXISTENTE en estado local y marcaba el
                onboarding como completo. Cualquiera que abriera la app quedaba adentro con esa
                identidad, y como el actor viaja hoy en el header X-Actor-Id, el backend lo
                atendia como a ese usuario.

                `demoLogin`/`demoNewUser` siguen declarados en AuthContext y ya no los llama
                nadie. Conviene borrarlos antes de publicar: sin caller son inertes, pero es un
                bypass de autenticacion esperando a que alguien lo vuelva a cablear.
              */}
              {/*
                Ingreso con Apple retirado (2026-09-05) y Google retirado de la vista (2026-10-05;
                del 2026-09-23 al 2026-10-05 se mostró apagado como «Google · Próximamente»).

                OJO PARA CUANDO VUELVAN: en iOS, si la app ofrece cualquier otro login social, las
                reglas de la App Store EXIGEN ofrecer también "Sign in with Apple". El backend ya
                tiene su lado resuelto (`renaser.auth.apple.*`) y `loginWithGoogle`/`loginWithApple`
                siguen en AuthContext; `handleSocialLogin` y la vista 5 (confirmar datos) siguen
                acá: volver a prenderlos es agregar el botón que llame a `handleSocialLogin`.
              */}
            </>
          )}
          {/* ========================================================================= */}
          {/* VISTA 2: VERIFICACIÓN DE CÓDIGO OTP DE 6 DÍGITOS                          */}
          {/* ========================================================================= */}
          {step === 'otp' && (
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <MicroLabel>Verificación de seguridad</MicroLabel>
                <Text style={[t.sectionTitle, { color: c.text, textAlign: 'center', marginTop: 4 }]}>
                  INGRESA TU CÓDIGO
                </Text>
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', lineHeight: 18, marginTop: 4 }]}>
                  Hemos enviado un código de 6 dígitos a:
                </Text>
                <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>{email}</Text>
              </View>

              {errorMessage ? (
                <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                  <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={[styles.alertBox, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
                  <Text style={[t.small, { color: c.goldInk, textAlign: 'center' }]}>{successMessage}</Text>
                </View>
              ) : null}

              {/* Casillas del código + reenvío: el mismo componente que usa la recuperación */}
              <CodigoOtpInput
                codigo={otpCode}
                onChange={codigo => {
                  setOtpCode(codigo);
                  if (codigo.length === LARGO_CODIGO) {
                    setErrorMessage(null);
                  }
                }}
                inputRef={otpInputRef}
                segundosParaReenviar={resendTimer}
                puedeReenviar={canResend}
                onReenviar={handleResendOtp}
                deshabilitado={loading}
              />

              {/* Botón Confirmar Código OTP */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Verificar el código"
                onPress={handleVerifyOtp}
                disabled={loading || otpCode.length !== LARGO_CODIGO}
                style={[
                  styles.submitBtn,
                  { shadowColor: c.gold, opacity: otpCode.length === LARGO_CODIGO ? 1 : 0.65 }
                ]}
              >
                <LinearGradient
                  colors={c.goldGrad}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.gradientBtn}
                >
                  {loading ? (
                    <ActivityIndicator color={c.onGold} size="small" />
                  ) : (
                    <Text style={[t.cardTitle, { color: c.onGold, letterSpacing: 0.1, fontFamily: 'Jost_500Medium', fontSize: 15 }]}>
                      CONFIRMAR Y ENVIAR SOLICITUD
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Botón de Retorno al Login */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver a iniciar sesión"
                onPress={handleReturnToLogin}
                style={[styles.returnLoginBtn, { borderColor: c.border }]}
              >
                <Icon name="arrowLeft" size={14} color={c.textSoft} />
                <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1.5 }]}>
                  VOLVER AL INICIO DE SESIÓN
                </Text>
              </Pressable>
            </View>
          )}

          {/* ========================================================================= */}
          {/* VISTA 3: RECUPERACIÓN DE CONTRASEÑA (FORMULARIO)                          */}
          {/* ========================================================================= */}
          {step === 'forgot' && (
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <MicroLabel>Seguridad y acceso</MicroLabel>
                <Text style={[t.sectionTitle, { color: c.text, textAlign: 'center', marginTop: 4 }]}>
                  ¿OLVIDASTE TU CONTRASEÑA?
                </Text>
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', lineHeight: 19, marginTop: 4 }]}>
                  Ingresa tu correo y te enviaremos un código de 6 dígitos para elegir una contraseña nueva.
                </Text>
              </View>

              {errorMessage ? (
                <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                  <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <MicroLabel>Correo registrado</MicroLabel>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: focusedField === 'forgot_email' ? c.gold : c.border,
                      backgroundColor: c.cardBgAlt,
                    },
                  ]}
                >
                  <Icon name="mail" size={17} color={focusedField === 'forgot_email' ? c.goldInk : c.tabInactive} />
                  <TextInput
                    value={email}
                    accessibilityLabel="Correo electrónico"
                    onChangeText={setEmail}
                    placeholder="tucorreo@ejemplo.com"
                    placeholderTextColor={c.tabInactive}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={() => void handleForgotPasswordSubmit()}
                    onFocus={evento => enfocarCampo('forgot_email', evento)}
                    onBlur={desenfocarCampo}
                    style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    autoFocus
                  />
                </View>
              </View>

              {/* Botón Enviar Enlace */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar el código de recuperación"
                onPress={handleForgotPasswordSubmit}
                disabled={loading}
                style={[styles.submitBtn, { shadowColor: c.gold }]}
              >
                <LinearGradient
                  colors={c.goldGrad}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.gradientBtn}
                >
                  {loading ? (
                    <ActivityIndicator color={c.onGold} size="small" />
                  ) : (
                    <Text style={[t.cardTitle, { color: c.onGold, letterSpacing: 0.1, fontFamily: 'Jost_500Medium', fontSize: 15 }]}>
                      ENVIARME UN CÓDIGO
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Botón de Retorno al Login */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver a iniciar sesión"
                onPress={handleReturnToLogin}
                style={[styles.returnLoginBtn, { borderColor: c.border }]}
              >
                <Icon name="arrowLeft" size={14} color={c.textSoft} />
                <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1.5 }]}>
                  VOLVER AL INICIO DE SESIÓN
                </Text>
              </Pressable>
            </View>
          )}

          {/* ========================================================================= */}
          {/* VISTA 4: RECUPERACIÓN — CÓDIGO DE 6 DÍGITOS (D-102)                        */}
          {/* ========================================================================= */}
          {step === 'forgot_otp' && (
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <MicroLabel>Recuperación de contraseña</MicroLabel>
                <Text style={[t.sectionTitle, { color: c.text, textAlign: 'center', marginTop: 4 }]}>
                  INGRESA TU CÓDIGO
                </Text>
                {/* "Si tiene cuenta": el backend no dice si el correo existe, y la pantalla tampoco. */}
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', lineHeight: 18, marginTop: 4 }]}>
                  Si el correo tiene cuenta, te enviamos un código de 6 dígitos a:
                </Text>
                <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>{email}</Text>
              </View>

              {errorMessage ? (
                <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                  <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={[styles.alertBox, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
                  <Text style={[t.small, { color: c.goldInk, textAlign: 'center' }]}>{successMessage}</Text>
                </View>
              ) : null}

              <CodigoOtpInput
                codigo={otpCode}
                onChange={codigo => {
                  setOtpCode(codigo);
                  if (codigo.length === LARGO_CODIGO) {
                    setErrorMessage(null);
                  }
                }}
                inputRef={otpInputRef}
                segundosParaReenviar={resendTimer}
                puedeReenviar={canResend}
                onReenviar={handleResendForgotOtp}
                deshabilitado={loading}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Verificar el código de recuperación"
                onPress={handleVerifyForgotOtp}
                disabled={loading || otpCode.length !== LARGO_CODIGO}
                style={[
                  styles.submitBtn,
                  { shadowColor: c.gold, opacity: otpCode.length === LARGO_CODIGO ? 1 : 0.65 }
                ]}
              >
                <LinearGradient
                  colors={c.goldGrad}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.gradientBtn}
                >
                  {loading ? (
                    <ActivityIndicator color={c.onGold} size="small" />
                  ) : (
                    <Text style={[t.cardTitle, { color: c.onGold, letterSpacing: 0.1, fontFamily: 'Jost_500Medium', fontSize: 15 }]}>
                      VERIFICAR CÓDIGO
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Un paso atrás: cambiar el correo (mismo destino que el gesto lateral) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver al paso anterior"
                onPress={handleBack}
                style={[styles.returnLoginBtn, { borderColor: c.border }]}
              >
                <Icon name="arrowLeft" size={14} color={c.textSoft} />
                <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1.5 }]}>
                  CAMBIAR DE CORREO
                </Text>
              </Pressable>
            </View>
          )}

          {/* ========================================================================= */}
          {/* VISTA 4b: RECUPERACIÓN — CONTRASEÑA NUEVA (D-102)                          */}
          {/* ========================================================================= */}
          {step === 'forgot_new_password' && (
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <MicroLabel>Código verificado</MicroLabel>
                <Text style={[t.sectionTitle, { color: c.text, textAlign: 'center', marginTop: 4 }]}>
                  ELIGE TU NUEVA CONTRASEÑA
                </Text>
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', lineHeight: 19, marginTop: 4 }]}>
                  Mínimo {MIN_CONTRASENA} caracteres. Al guardarla se cierran todas tus sesiones abiertas.
                </Text>
              </View>

              {errorMessage ? (
                <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                  <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <MicroLabel>Nueva contraseña</MicroLabel>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: focusedField === 'forgot_password' ? c.gold : c.border,
                      backgroundColor: c.cardBgAlt,
                    },
                  ]}
                >
                  <Icon name="lock" size={17} color={focusedField === 'forgot_password' ? c.goldInk : c.tabInactive} />
                  <TextInput
                    value={password}
                    accessibilityLabel="Contraseña"
                    onChangeText={setPassword}
                    placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`}
                    placeholderTextColor={c.tabInactive}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    onFocus={evento => enfocarCampo('forgot_password', evento)}
                    onBlur={desenfocarCampo}
                    style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    autoFocus
                  />
                  <Pressable
                      hitSlop={14}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                    <Icon
                      name={showPassword ? 'eyeOff' : 'eye'}
                      size={17}
                      color={c.tabInactive}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <MicroLabel>Confirmar contraseña</MicroLabel>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: focusedField === 'forgot_confirm' ? c.gold : c.border,
                      backgroundColor: c.cardBgAlt,
                    },
                  ]}
                >
                  <Icon name="lock" size={17} color={focusedField === 'forgot_confirm' ? c.goldInk : c.tabInactive} />
                  <TextInput
                    value={confirmPassword}
                    accessibilityLabel="Confirmar contraseña"
                    onChangeText={setConfirmPassword}
                    placeholder="Repite tu contraseña nueva"
                    placeholderTextColor={c.tabInactive}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onFocus={evento => enfocarCampo('forgot_confirm', evento)}
                    onBlur={desenfocarCampo}
                    onSubmitEditing={handleChangePassword}
                    style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                  />
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cambiar la contraseña"
                onPress={handleChangePassword}
                disabled={loading}
                style={[styles.submitBtn, { shadowColor: c.gold }]}
              >
                <LinearGradient
                  colors={c.goldGrad}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.gradientBtn}
                >
                  {loading ? (
                    <ActivityIndicator color={c.onGold} size="small" />
                  ) : (
                    <Text style={[t.cardTitle, { color: c.onGold, letterSpacing: 0.1, fontFamily: 'Jost_500Medium', fontSize: 15 }]}>
                      GUARDAR Y VOLVER AL LOGIN
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* El código ya se consumió: "atrás" es pedir otro, no volver a las casillas */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver al paso anterior"
                onPress={handleBack}
                style={[styles.returnLoginBtn, { borderColor: c.border }]}
              >
                <Icon name="arrowLeft" size={14} color={c.textSoft} />
                <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1.5 }]}>
                  PEDIR OTRO CÓDIGO
                </Text>
              </Pressable>
            </View>
          )}

          {/* ========================================================================= */}
          {/* VISTA 5: CONFIRMAR DATOS DEL ALTA SOCIAL (SEGUNDO PASO, D-65)              */}
          {/* ========================================================================= */}
          {step === 'social_confirmar' && (
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <MicroLabel>Verificado por Google</MicroLabel>
                <Text style={[t.sectionTitle, { color: c.text, textAlign: 'center', marginTop: 4 }]}>
                  CONFIRMA TUS DATOS
                </Text>
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', lineHeight: 18, marginTop: 4 }]}>
                  Revisa que tu nombre esté bien y envía tu solicitud de cuenta.
                </Text>
              </View>

              {errorMessage ? (
                <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                  <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <MicroLabel>Nombres</MicroLabel>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: focusedField === 'social_nombres' ? c.gold : c.border,
                      backgroundColor: c.cardBgAlt,
                    },
                  ]}
                >
                  <Icon name="user" size={17} color={focusedField === 'social_nombres' ? c.goldInk : c.tabInactive} />
                  <TextInput
                    value={nombres}
                    accessibilityLabel="Nombres"
                    onChangeText={setNombres}
                    placeholder="Ej. Sebastián"
                    placeholderTextColor={c.tabInactive}
                    onFocus={evento => enfocarCampo('social_nombres', evento)}
                    onBlur={desenfocarCampo}
                    style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    autoCapitalize="words"
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <MicroLabel>Apellidos</MicroLabel>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: focusedField === 'social_apellidos' ? c.gold : c.border,
                      backgroundColor: c.cardBgAlt,
                    },
                  ]}
                >
                  <Icon name="user" size={17} color={focusedField === 'social_apellidos' ? c.goldInk : c.tabInactive} />
                  <TextInput
                    value={apellidos}
                    accessibilityLabel="Apellidos"
                    onChangeText={setApellidos}
                    placeholder="Ej. Arango"
                    placeholderTextColor={c.tabInactive}
                    onFocus={evento => enfocarCampo('social_apellidos', evento)}
                    onBlur={desenfocarCampo}
                    style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <MicroLabel>Correo electrónico</MicroLabel>
                {/* No editable: lo verificó Google y el backend lo toma de su propio registro
                    pendiente, nunca del cuerpo del request — dejarlo "editable" haría creer que
                    cambiarlo tiene efecto, y no lo tiene. La opacidad reducida ya se usa en este
                    mismo archivo (ver el botón CONFIRMAR de la vista OTP) para marcar algo
                    inactivo sin agregar un estilo nuevo. */}
                <View
                  style={[
                    styles.inputWrap,
                    { borderColor: c.border, backgroundColor: c.cardBgAlt, opacity: 0.65 },
                  ]}
                >
                  <Icon name="mail" size={17} color={c.tabInactive} />
                  <TextInput
                    value={email}
                    accessibilityLabel="Correo electrónico"
                    editable={false}
                    style={[styles.input, { color: c.textSoft, fontFamily: 'Jost_400Regular' }]}
                  />
                </View>
              </View>

              {/* Botón Confirmar y Enviar Solicitud */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirmar el registro con Google"
                onPress={handleConfirmarRegistroSocial}
                disabled={loading}
                style={[styles.submitBtn, { shadowColor: c.gold }]}
              >
                <LinearGradient
                  colors={c.goldGrad}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.gradientBtn}
                >
                  {loading ? (
                    <ActivityIndicator color={c.onGold} size="small" />
                  ) : (
                    <Text style={[t.cardTitle, { color: c.onGold, letterSpacing: 0.1, fontFamily: 'Jost_500Medium', fontSize: 15 }]}>
                      ENVIAR SOLICITUD
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Botón de Retorno al Login */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver a iniciar sesión"
                onPress={handleReturnToLogin}
                style={[styles.returnLoginBtn, { borderColor: c.border }]}
              >
                <Icon name="arrowLeft" size={14} color={c.textSoft} />
                <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1.5 }]}>
                  VOLVER AL INICIO DE SESIÓN
                </Text>
              </Pressable>
            </View>
          )}

          {/* ========================================================================= */}
          {/* VISTA 6: SOLICITUD DE ALTA ENVIADA (PENDIENTE DE APROBACIÓN)              */}
          {/* ========================================================================= */}
          {step === 'solicitud_enviada' && (
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                <View style={[styles.successIconWrap, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                  <Icon name="check" size={26} color={c.goldInk} strokeWidth={2} />
                </View>

                <MicroLabel>Solicitud recibida</MicroLabel>
                <Text style={[t.sectionTitle, { color: c.text, textAlign: 'center' }]}>
                  TU CUENTA ESTÁ EN REVISIÓN
                </Text>
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', lineHeight: 20 }]}>
                  Confirmamos tu correo y registramos tu solicitud. Un administrador tiene que
                  aprobarla antes de que puedas ingresar; te avisaremos a:
                </Text>
                <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium', textAlign: 'center' }]}>
                  {email}
                </Text>
              </View>

              {errorMessage ? (
                <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                  <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={[styles.alertBox, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
                  <Text style={[t.small, { color: c.goldInk, textAlign: 'center' }]}>{successMessage}</Text>
                </View>
              ) : null}

              {/* Botón Volver al Login */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver a iniciar sesión"
                onPress={handleReturnToLogin}
                style={[styles.submitBtn, { shadowColor: c.gold, marginTop: 10 }]}
              >
                <LinearGradient
                  colors={c.goldGrad}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.gradientBtn}
                >
                  <Text style={[t.cardTitle, { color: c.onGold, letterSpacing: 0.1, fontFamily: 'Jost_500Medium', fontSize: 15 }]}>
                    VOLVER AL INICIO DE SESIÓN
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Consulta del estado con el id de la solicitud, la única credencial que hay */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Consultar el estado de tu solicitud"
                onPress={handleConsultarEstado}
                disabled={loading || !accountRequestId}
                style={[styles.returnLoginBtn, { borderColor: c.border }]}
              >
                {loading ? (
                  <ActivityIndicator color={c.goldInk} size="small" />
                ) : (
                  <>
                    <Icon name="clock" size={14} color={c.textSoft} />
                    <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1.5 }]}>
                      {estadoSolicitud?.status === 'APPROVED'
                        ? 'Solicitud aprobada'
                        : 'Consultar estado de mi solicitud'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          </View>
        </ScrollView>

        {/*
          El pie: el botón principal y el cambio de vista, FUERA del scroll. Así queda siempre a la
          vista, abajo, donde llega el pulgar, y sube con el teclado (el `KeyboardAvoidingView`
          achica el scroll, no el pie). Los otros pasos (código, recuperación, acuse) siguen con
          sus botones dentro de su tarjeta, como antes.
        */}
        {step === 'form' && (
          <View
            style={[
              styles.pie,
              anchoDelContenido,
              // Con el teclado arriba el borde seguro de abajo queda detrás del teclado: basta un aire corto.
              { paddingBottom: tecladoAbierto ? 12 : Math.max(insets.bottom, 12) },
            ]}
          >
            {/* Fundido sobre el borde de abajo del scroll, justo encima del pie: avisa que hay más
                campos debajo (en «Solicitar acceso» el último queda bajo el pliegue) sin una raya
                dura. El mismo recurso que `MarcoDePaso` en el onboarding. */}
            <LinearGradient pointerEvents="none" colors={[`${c.bg}00`, c.bg]} style={styles.fundidoInferior} />
            <EntradaEscalonada key={`pie-${activeTab}`} indice={2} style={styles.pieAdentro}>
              <BotonDelIngreso
                etiqueta={activeTab === 'login' ? 'Ingresar' : 'Continuar y recibir código'}
                cargando={loading}
                onPress={() => void handleFormSubmit()}
              />
              {tecladoAbierto ? null : (
                <Presionable
                  accessibilityRole="button"
                  accessibilityLabel={
                    activeTab === 'login' ? '¿No tienes cuenta? Solicitar acceso' : '¿Ya tienes cuenta? Iniciar sesión'
                  }
                  onPress={() => irA(activeTab === 'login' ? 'register' : 'login')}
                  style={styles.cambioDeVista}
                >
                  <Text style={[t.body, styles.textoCambio, { color: c.textSoft }]}>
                    {activeTab === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                    <Text style={[styles.textoCambioFuerte, { color: c.goldInk }]}>
                      {activeTab === 'login' ? 'Solicitar acceso' : 'Iniciar sesión'}
                    </Text>
                  </Text>
                </Presionable>
              )}
              {/* D-245: la Política de Privacidad a mano antes de entrar o pedir acceso (Google
                  Play). Una línea chica en tipo oración y en el gris del texto secundario, debajo
                  del cambio de vista, para no competir con él ni con «Ingresar»; se esconde con el
                  teclado igual que la línea de arriba. Abre la página estática `public/privacidad/`. */}
              {tecladoAbierto ? null : (
                <Presionable
                  accessibilityRole="link"
                  accessibilityLabel="Política de privacidad"
                  onPress={() => void abrirPoliticaDePrivacidad()}
                  hitSlop={6}
                  style={styles.enlacePrivacidad}
                >
                  <Text style={[t.small, styles.textoPrivacidad, { color: c.textSoft }]}>Política de privacidad</Text>
                </Presionable>
              )}
            </EntradaEscalonada>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  scrollContent: {
    /* `flexGrow: 1` lo pide AGENTS.md 2 para un contenedor de scroll fluido. El `paddingBottom`
       (en la vista, según haya pie o no) es el aire que permite que el último campo llegue a
       acomodarse sobre el teclado sin chocar contra el final del contenido. */
    flexGrow: 1,
  },
  /* Antes `topBar`, `backBtn`, `themeBtn`, `heroSection`, `selectorModo`, `passwordHeader`,
     `socialSection`, `dividerRow`, `divLine`, `bigSocialBtn`, `demoSection`, `demoBtn` y
     `footerText`: todo lo de la cabecera vieja, el control segmentado, Google y el pie de marca,
     que se fueron con el rediseño del 2026-10-05. */
  /* Sin aire arriba: el título se mete en el final del degradado de la cabecera
     (`solapeDelTitulo`), donde el fondo ya tapa la imagen. */
  cuerpo: {
    paddingTop: 0,
  },
  /* La serif del tema en grande, con el tracking cerrado de los títulos de display
     (`apple-design` §15: el texto grande pide tracking negativo). */
  titulo: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  subrayadoDelTitulo: {
    width: 36,
    height: 2,
    borderRadius: 1,
    marginTop: 10,
    marginBottom: 26,
  },
  campos: {
    gap: 18,
  },
  ojo: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Pegado a la contraseña (el `gap` de 18 menos 10) y a la derecha, con 44 de alto táctil. */
  olvido: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: -10,
  },
  textoOlvido: {
    fontFamily: 'Jost_500Medium',
  },
  fundidoInferior: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -16,
    height: 16,
  },
  pie: {
    paddingTop: 10,
  },
  pieAdentro: {
    gap: 2,
  },
  cambioDeVista: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCambio: {
    textAlign: 'center',
    fontSize: 15,
  },
  textoCambioFuerte: {
    fontFamily: 'Jost_500Medium',
  },
  /* 32 de alto más el `hitSlop` de 6 arriba y abajo: 44 táctiles sin agrandar el pie. */
  enlacePrivacidad: {
    alignSelf: 'center',
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textoPrivacidad: {
    fontSize: 13,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  card: {
    /* Sin `borderWidth` a proposito (2026-09-14): el fondo y los campos ya dan toda la estructura
       que hace falta. Desde el 2026-10-05 la usan solo los pasos que siguen al formulario (código,
       recuperación, confirmación social y acuse). */
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 18,
  },
  alertBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  inputGroup: {
    gap: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    height: '100%',
    paddingVertical: 0,
  },
  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
    /* Era 0.35 de opacidad con radio 10 y 6 px de desplazamiento: un halo dorado bajo el boton,
       el gesto de "premium" que traen todas las plantillas. Queda una sombra que solo insinua
       que el boton esta por encima del fondo. */
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  gradientBtn: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 4,
  },
  successIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
});
