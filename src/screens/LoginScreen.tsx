import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TargetedEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { useAuth } from '../context/AuthContext';
import { mensajeDeError } from '../services/http/apiClient';
import { Icon } from '../components/Icon';
import { FondoAnillos } from '../components/FondoAnillos';
import { MicroLabel } from '../components/ui';
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
type Tab = 'login' | 'register';

/**
 * El nodo nativo que viaja en el `onFocus` de un `TextInput`. Se saca del tipo del evento en vez
 * de importarlo de las entrañas de React Native para no atarse a una ruta interna: es el mismo
 * objeto, y lo único que se le pide es `measureInWindow`.
 */
type CampoMedible = Exclude<NativeSyntheticEvent<TargetedEvent>['target'], number | undefined>;

export default function LoginScreen() {
  const { c, t, mode, toggle } = useTheme();
  /* `rs` salio del desestructurado el 2026-09-14: sus tres usos estaban en el circulo del paso
     que se quito, y dejarlo era una variable sin leer. Vuelve si hace falta escalar algo. */
  const { isTablet, isShort, isSmall, horizontalPadding } = useResponsive();
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

  // UI state
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Interceptar gestos táctiles de retroceso en cualquier subpantalla (OTP, recuperación, etc.)
  useSystemBackHandler(() => {
    if (step !== 'form') {
      handleBack();
      return true;
    }
    return false;
  }, step !== 'form');

  const handleFormSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

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
      // Iniciar sesión
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Por favor ingresa tu correo electrónico');
        return;
      }
      if (!password) {
        setErrorMessage('Por favor ingresa tu contraseña');
        return;
      }

      try {
        setLoading(true);
        await login(email, password);
      } catch (error) {
        setErrorMessage(mensajeDeError(error, 'No pudimos iniciar tu sesión.'));
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      {/*
        Los anillos van de FONDO, no de cabecera (2026-09-05, pedido del dueno del proyecto).
        Antes vivian dentro del ScrollView y ocupaban ~180 px de alto, asi que para llenar el
        correo y la contrasena habia que arrastrar con el dedo. Al pasarlos al fondo se recupera
        ese alto y la marca queda mas presente.

        `icono={null}` sigue en null, pero por otra razon que antes (2026-09-14). Aca decia:
        "porque la cabecera ya dibuja el suyo, que ademas cambia segun el paso (correo / llave /
        usuario) — dos iconos encimados se verian como un error". Esa razon dejo de existir: la
        cabecera ya no dibuja ningun icono (ver el comentario del encabezado, mas abajo). El null
        se mantiene porque el pedido del dueno del producto fue SACAR el adorno, no mudarlo al
        fondo — devolverle un icono a los anillos seria reponer lo mismo un poco mas abajo.
      */}
      <FondoAnillos icono={null} />

      {/* Barra Superior con botón Volver y Toggle de Modo */}
      <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
        {step !== 'form' ? (
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Volver a iniciar sesión"
            onPress={handleReturnToLogin}
            style={[styles.backBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
          >
            <Icon name="arrowLeft" size={16} color={c.goldInk} />
            <Text style={[t.micro, { color: c.text, letterSpacing: 1.2 }]}>VOLVER AL LOGIN</Text>
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}

        <Pressable
          hitSlop={10}
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={mode === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name={mode === 'light' ? 'moon' : 'sun'} size={15} color={c.goldInk} />
        </Pressable>
      </View>

      {/*
        `behavior` va en las DOS plataformas. Decía `Platform.OS === 'ios' ? 'padding' : undefined`
        y en Android `undefined` es no hacer nada: este componente devuelve un `View` pelado. Ver
        el bloque largo de arriba ("QUE EL TECLADO NO TAPE EL CAMPO..."). El cálculo de `padding`
        se corrige solo —da 0 en un dispositivo donde la ventana SÍ se encoja—, así que ponerlo en
        las dos plataformas no levanta el formulario de más en ninguna.

        `insets.top` en Android compensa que el alto se mide contra el SafeAreaView mientras que el
        teclado se reporta en coordenadas de pantalla; en iOS queda en 0 porque ahí esa diferencia
        no existe y sumarla abriría un hueco del alto del notch. Mismo criterio que el chat de
        Comunidad y RENASIA. Si quedara corto o largo por unos píxeles, el reacomodo al campo
        enfocado lo absorbe: mide el área visible real, no la calcula desde este número.
      */}
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={listaRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 460 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onLayout={alAcomodarLaLista}
          onScroll={(evento: NativeSyntheticEvent<NativeScrollEvent>) => {
            desplazamientoDeLaLista.current = evento.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {/* Encabezado: el logotipo y su bajada. Nada arriba del logotipo — el porque, unas
              lineas mas abajo. */}
          <View
            style={[
              styles.heroSection,
              {
                /* Este padding es AHORA el unico aire entre la barra superior y el logotipo, y por
                   eso subio de 2/10 a 16/28. Antes valia 2/10 porque encima del logotipo habia un
                   circulo de ~52 px que hacia de separador; sin el, 2 px dejaban la marca pegada
                   al borde. Aun asi el encabezado queda ~40 px mas bajo que antes, que es
                   exactamente el alto que este bloque venia peleando para que el formulario no
                   pida scroll en pantalla corta (isShort). */
                paddingTop: isShort ? 16 : 28,
                paddingBottom: isShort ? 12 : 20,
              },
            ]}
          >
            {/* Aca iba un circulo con borde dorado y un icono adentro que cambiaba segun el paso:
                'mail' en la verificacion por codigo, 'key' en recuperacion de contrasena, 'user'
                en la confirmacion del login social y 'diamond' en el login normal. Se quito
                COMPLETO el 2026-09-14, por pedido del dueno del producto: "parece IA".

                Se quito en los CUATRO pasos, no solo el 'diamond' decorativo, por tres razones:

                1. Era redundante. El bajo-logotipo que esta tres lineas mas abajo ya dice el paso
                   con palabras: "Confirmacion de correo", "Recuperacion de cuenta", "Confirma tus
                   datos". Para un publico de 40-60 anos esa palabra comunica muchisimo mas que un
                   glifo de contorno de 20 px; el icono no agregaba informacion, la repetia.
                2. El logotipo saltaba. Con el circulo presente en tres pasos y ausente en uno, la
                   marca cambiaba de altura al pasar del login a la verificacion por codigo. Un
                   logotipo que se mueve dentro del mismo flujo se lee como una falla, no como un
                   paso nuevo.
                3. Lo que "parece IA" es el envase, no el glifo: un circulo con borde dorado
                   encima de un logotipo es el adorno generico, con una llave adentro igual que
                   con un diamante. Dejarlo en tres de cuatro pasos no atendia el pedido, solo lo
                   escondia.

                Si algun dia hace falta reforzar la senal del paso, el lugar es el bajo-logotipo
                (texto, que es lo que este publico lee), no un icono nuevo. */}

            {/* El logotipo.
                Antes iba en Jost con `letterSpacing: 8` — las letras tan separadas que la palabra
                dejaba de leerse como una marca y pasaba a leerse como una plantilla: es el gesto
                que usa cualquier landing de "lujo" genérica. Ahora va en la serif editorial con el
                tracking casi cerrado, que es lo que hace que una cabecera pese.
                Sigue en mayúsculas —eso es la marca, no una decisión de esta pantalla— y por eso
                el tracking no es el negativo del token: las versales siempre piden un poco de aire,
                pero 2, no 8. */}
            <Text
              accessibilityRole="header"
              style={[
                t.hero,
                {
                  color: c.textStrong,
                  /* Sin `marginTop` (antes 10/18): el logotipo es el primer hijo del encabezado,
                     asi que el aire de arriba lo da el `paddingTop` de `heroSection` y no hay dos
                     valores que sumar a mano para saber cuanto separa la marca de la barra. */
                  letterSpacing: isSmall ? 1.2 : 2,
                  fontSize: isShort ? 32 : 40,
                  lineHeight: isShort ? 36 : 45,
                },
              ]}
            >
              RENASER
            </Text>
            <Text
              style={[
                t.micro,
                {
                  color: c.textSoft,
                  marginTop: 4,
                  /* Iba con tracking 3.2: el subtitulo competia con el logotipo en vez de
                     acompanarlo. Debajo de una serif grande, el bajo-logotipo se lee mejor junto
                     y un punto mas grande que antes. */
                  letterSpacing: isSmall ? 0.2 : 0.4,
                  fontSize: isSmall ? 11 : 12,
                },
              ]}
            >
              {step === 'otp'
                ? 'Confirmación de correo'
                : step === 'solicitud_enviada'
                ? 'Solicitud en revisión'
                : enRecuperacion
                ? 'Recuperación de cuenta'
                : step === 'social_confirmar'
                ? 'Confirma tus datos'
                : '90 días para redefinir tu vida'}
            </Text>
          </View>

          {/* ========================================================================= */}
          {/* VISTA 1: FORMULARIO PRINCIPAL (LOGIN / REGISTRO) + REDES SOCIALES GRANDES */}
          {/* ========================================================================= */}
          {step === 'form' && (
            <>
              {/* Selector de Pestañas: Iniciar Sesión / Registro */}
              <View style={[styles.tabSelector, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === 'login' }}
                  accessibilityLabel="Iniciar sesión"
                  onPress={() => {
                    setActiveTab('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  style={[
                    styles.tabBtn,
                    activeTab === 'login' && [styles.tabBtnActive, { backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }],
                  ]}
                >
                  <Text
                    style={[
                      t.micro,
                      {
                        color: activeTab === 'login' ? c.goldInk : c.textSoft,
                        letterSpacing: 1.8,
                        fontFamily: activeTab === 'login' ? 'Jost_500Medium' : 'Jost_400Regular',
                      },
                    ]}
                  >
                    Iniciar sesión
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === 'register' }}
                  accessibilityLabel="Crear cuenta"
                  onPress={() => {
                    setActiveTab('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  style={[
                    styles.tabBtn,
                    activeTab === 'register' && [styles.tabBtnActive, { backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }],
                  ]}
                >
                  <Text
                    style={[
                      t.micro,
                      {
                        color: activeTab === 'register' ? c.goldInk : c.textSoft,
                        letterSpacing: 1.8,
                        fontFamily: activeTab === 'register' ? 'Jost_500Medium' : 'Jost_400Regular',
                      },
                    ]}
                  >
                    Crear cuenta
                  </Text>
                </Pressable>
              </View>

              {/* Tarjeta de Formulario */}
              <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                {errorMessage ? (
                  <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                    <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Avisos que llegan al login desde otro paso: "contraseña actualizada" (D-102) o
                    "ya tenías una solicitud en revisión" (login social). Antes no se mostraban. */}
                {successMessage ? (
                  <View style={[styles.alertBox, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
                    <Text style={[t.small, { color: c.goldInk, textAlign: 'center' }]}>{successMessage}</Text>
                  </View>
                ) : null}

                {activeTab === 'register' && (
                  <View style={styles.inputGroup}>
                    <MicroLabel>Nombres</MicroLabel>
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          borderColor: focusedField === 'nombres' ? c.gold : c.border,
                          backgroundColor: c.cardBgAlt,
                        },
                      ]}
                    >
                      <Icon name="user" size={17} color={focusedField === 'nombres' ? c.goldInk : c.tabInactive} />
                      <TextInput
                        value={nombres}
                        accessibilityLabel="Nombres"
                        onChangeText={setNombres}
                        placeholder="Ej. Sebastián"
                        placeholderTextColor={c.tabInactive}
                        onFocus={evento => enfocarCampo('nombres', evento)}
                        onBlur={desenfocarCampo}
                        style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                {activeTab === 'register' && (
                  <View style={styles.inputGroup}>
                    <MicroLabel>Apellidos</MicroLabel>
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          borderColor: focusedField === 'apellidos' ? c.gold : c.border,
                          backgroundColor: c.cardBgAlt,
                        },
                      ]}
                    >
                      <Icon name="user" size={17} color={focusedField === 'apellidos' ? c.goldInk : c.tabInactive} />
                      <TextInput
                        value={apellidos}
                        accessibilityLabel="Apellidos"
                        onChangeText={setApellidos}
                        placeholder="Ej. Arango"
                        placeholderTextColor={c.tabInactive}
                        onFocus={evento => enfocarCampo('apellidos', evento)}
                        onBlur={desenfocarCampo}
                        style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <MicroLabel>Correo electrónico</MicroLabel>
                  <View
                    style={[
                      styles.inputWrap,
                      {
                        borderColor: focusedField === 'email' ? c.gold : c.border,
                        backgroundColor: c.cardBgAlt,
                      },
                    ]}
                  >
                    <Icon name="mail" size={17} color={focusedField === 'email' ? c.goldInk : c.tabInactive} />
                    <TextInput
                      value={email}
                      accessibilityLabel="Correo electrónico"
                      onChangeText={setEmail}
                      placeholder="tucorreo@ejemplo.com"
                      placeholderTextColor={c.tabInactive}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={evento => enfocarCampo('email', evento)}
                      onBlur={desenfocarCampo}
                      style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    />
                  </View>
                  {/* Aviso en vivo de disponibilidad: solo en registro, y solo cuando hay un
                      veredicto real. "Verificando" y "idle" no muestran nada para no agregar
                      ruido visual mientras la persona todavía está escribiendo. */}
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
                </View>

                {/* El teléfono se pide en la Ficha Inicial del onboarding, no acá: el alta tiene
                    que ser lo más liviana posible para que nadie la abandone a mitad de camino. */}

                <View style={styles.inputGroup}>
                  <View style={styles.passwordHeader}>
                    <MicroLabel>Contraseña</MicroLabel>
                    {activeTab === 'login' && (
                      <Pressable
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Recuperar la contraseña"
                        onPress={() => {
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setStep('forgot');
                        }}
                      >
                        <Text style={[t.micro, { color: c.goldInk, letterSpacing: 0.8, fontFamily: 'Jost_500Medium' }]}>
                          ¿Olvidaste tu contraseña?
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <View
                    style={[
                      styles.inputWrap,
                      {
                        borderColor: focusedField === 'password' ? c.gold : c.border,
                        backgroundColor: c.cardBgAlt,
                      },
                    ]}
                  >
                    <Icon name="lock" size={17} color={focusedField === 'password' ? c.goldInk : c.tabInactive} />
                    <TextInput
                      value={password}
                      accessibilityLabel="Contraseña"
                      onChangeText={setPassword}
                      placeholder={activeTab === 'register' ? `Mínimo ${MIN_CONTRASENA} caracteres` : 'Tu contraseña'}
                      placeholderTextColor={c.tabInactive}
                      secureTextEntry={!showPassword}
                      onFocus={evento => enfocarCampo('password', evento)}
                      onBlur={desenfocarCampo}
                      style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    />
                    <Pressable
                      hitSlop={8}
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

                {activeTab === 'register' && (
                  <View style={styles.inputGroup}>
                    <MicroLabel>Confirmar contraseña</MicroLabel>
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          borderColor: focusedField === 'confirmPassword' ? c.gold : c.border,
                          backgroundColor: c.cardBgAlt,
                        },
                      ]}
                    >
                      <Icon name="lock" size={17} color={focusedField === 'confirmPassword' ? c.goldInk : c.tabInactive} />
                      <TextInput
                        value={confirmPassword}
                        accessibilityLabel="Confirmar contraseña"
                        onChangeText={setConfirmPassword}
                        placeholder="Repite tu contraseña"
                        placeholderTextColor={c.tabInactive}
                        secureTextEntry={!showPassword}
                        onFocus={evento => enfocarCampo('confirmPassword', evento)}
                        onBlur={desenfocarCampo}
                        style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                      />
                    </View>
                  </View>
                )}

                {/* Botón Principal */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continuar"
                  onPress={handleFormSubmit}
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
                        {activeTab === 'login' ? 'Acceder al programa' : 'Continuar y recibir código'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              {/* ===================================================================== */}
              {/* SECCIÓN DE REDES SOCIALES GRANDES                                     */}
              {/* ===================================================================== */}
              <View style={styles.socialSection}>
                <View style={styles.dividerRow}>
                  <View style={[styles.divLine, { backgroundColor: c.divider }]} />
                  <Text style={[t.small, { color: c.tabInactive, paddingHorizontal: 12, letterSpacing: 0.2, fontSize: 12.5 }]}>
                    o accede con
                  </Text>
                  <View style={[styles.divLine, { backgroundColor: c.divider }]} />
                </View>

                {/*
                  Ingreso con Apple retirado (2026-09-05, pedido del dueno del proyecto): todavia
                  no hay cuenta de Apple Developer, asi que el boton llevaba a un flujo que no
                  puede completarse.

                  OJO PARA CUANDO VUELVA: en iOS, si la app ofrece cualquier otro login social
                  (aca hay Google), las reglas de la App Store EXIGEN ofrecer tambien "Sign in with
                  Apple". Mientras Apple no este, publicar en iOS con el boton de Google visible es
                  motivo de rechazo. En Android y en web no aplica.

                  El backend ya tiene su lado resuelto (`renaser.auth.apple.*` en application.yaml)
                  y `loginWithApple` sigue en AuthContext: volver a prenderlo es restaurar este
                  bloque, no rehacer nada.
                */}

                {/* Botón de Google en Android, iOS y Web */}
                {(Platform.OS === 'android' || Platform.OS === 'ios' || Platform.OS === 'web') && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continuar con Google"
                    onPress={() => handleSocialLogin('google')}
                    disabled={socialLoading !== null}
                    style={[
                      styles.bigSocialBtn,
                      { borderColor: c.border, backgroundColor: c.cardBgAlt }
                    ]}
                  >
                    {socialLoading === 'google' ? (
                      <ActivityIndicator color={c.goldInk} size="small" />
                    ) : (
                      <>
                        <Icon name="google" size={20} color={c.goldInk} />
                        <Text style={[t.cardTitle, { color: c.textStrong, letterSpacing: 0.1, fontFamily: 'Jost_500Medium', fontSize: 15 }]}>
                          {activeTab === 'login' ? 'Continuar con Google' : 'Registrarme con Google'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>

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
                    onFocus={evento => enfocarCampo('forgot_password', evento)}
                    onBlur={desenfocarCampo}
                    style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    autoFocus
                  />
                  <Pressable
                      hitSlop={8}
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

          {/* Footer Note */}
          <Text style={[t.micro, styles.footerText, { color: c.micro, letterSpacing: 0.8 }]}>
            Renaser · 90 Días para redefinir tu vida, energía y propósito.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    /* `flexGrow: 1` y `paddingBottom: 36` son los que pide AGENTS.md 2 para un contenedor de
       scroll fluido, y eran lo que le faltaba a esta pantalla. El `paddingBottom` importa ahora
       más que antes: con el teclado arriba, es el aire que permite que el último campo llegue a
       acomodarse sin chocar contra el final del contenido. */
    flexGrow: 1,
    paddingBottom: 36,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  /* `ringContainer` e `iconDiamond` se eliminaron el 2026-09-14 junto con el circulo del paso:
     sin ese bloque de JSX nadie los referenciaba. `ring` (position absolute + borderWidth) ya
     estaba sin uso desde antes de este cambio — se deja para no ampliar el alcance. */
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  tabSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    borderWidth: 1,
  },
  card: {
    /* Sin `borderWidth` a proposito (2026-09-14): el borde de esta tarjeta, mas el de la fila de
       pestanas, mas el del boton de Google, apilaban tres cajas con borde en una sola pantalla.
       El fondo y los campos ya dan toda la estructura que hace falta. */
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
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  socialSection: {
    marginTop: 20,
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  divLine: {
    flex: 1,
    height: 1,
  },
  bigSocialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  demoSection: {
    marginTop: 14,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
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
  footerText: {
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
  },
});
