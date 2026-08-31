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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { MicroLabel } from '../components/ui';

type AuthStep = 'form' | 'otp' | 'forgot' | 'forgot_sent';
type Tab = 'login' | 'register';

export default function LoginScreen() {
  const { c, t, mode, toggle } = useTheme();
  const { rs, isTablet, isShort, isSmall, horizontalPadding } = useResponsive();
  const {
    login,
    register,
    loginWithGoogle,
    loginWithApple,
    sendOtp,
    verifyOtp,
    resetPassword,
    demoLogin,
  } = useAuth();

  // Navigation / Step state
  const [step, setStep] = useState<AuthStep>('form');
  const [activeTab, setActiveTab] = useState<Tab>('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  // Timer for OTP resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 'otp' && resendTimer > 0) {
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
  };

  const handleFormSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (activeTab === 'register') {
      if (!name.trim()) {
        setErrorMessage('Por favor ingresa tu nombre completo');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Por favor ingresa un correo electrónico válido');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Las contraseñas no coinciden');
        return;
      }

      // Enviar código OTP y pasar a pantalla de verificación
      try {
        setLoading(true);
        await sendOtp(email);
        setStep('otp');
        setResendTimer(45);
        setCanResend(false);
        setOtpCode('');
        setSuccessMessage(`Código enviado a ${email.trim()}`);
        setTimeout(() => otpInputRef.current?.focus(), 300);
      } catch {
        setErrorMessage('Error al enviar el código de confirmación');
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
      } catch {
        setErrorMessage('Credenciales incorrectas o error de conexión');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    if (otpCode.length !== 6) {
      setErrorMessage('Por favor ingresa los 6 dígitos del código');
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(name, email, otpCode);
    } catch {
      setErrorMessage('Código inválido o expirado. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      await sendOtp(email);
      setResendTimer(45);
      setCanResend(false);
      setSuccessMessage('Nuevo código enviado a tu correo.');
    } catch {
      setErrorMessage('No se pudo reenviar el código. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor ingresa un correo electrónico válido');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setStep('forgot_sent');
    } catch {
      setErrorMessage('Ocurrió un error al enviar las instrucciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setErrorMessage(null);
    try {
      setSocialLoading(provider);
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithApple();
      }
    } catch {
      setErrorMessage(`Error al conectar con ${provider === 'google' ? 'Google' : 'Apple'}`);
    } finally {
      setSocialLoading(null);
    }
  };

  const ringSizes = isShort
    ? [rs(140), rs(115), rs(90), rs(65)]
    : [rs(190), rs(155), rs(120), rs(85)];
  const ringColors = [c.ring1, c.ring2, c.ring3, c.ring2];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      {/* Barra Superior con botón Volver y Toggle de Modo */}
      <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
        {step !== 'form' ? (
          <Pressable
            hitSlop={12}
            onPress={handleReturnToLogin}
            style={[styles.backBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
          >
            <Icon name="arrowLeft" size={16} color={c.gold} />
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
          <Icon name={mode === 'light' ? 'moon' : 'sun'} size={15} color={c.gold} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
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
        >
          {/* Encabezado y Branding de Anillos Renaser */}
          <View
            style={[
              styles.heroSection,
              {
                paddingTop: isShort ? 2 : 10,
                paddingBottom: isShort ? 12 : 20,
              },
            ]}
          >
            <View
              style={[
                styles.ringContainer,
                {
                  width: isShort ? rs(100) : rs(130),
                  height: isShort ? rs(100) : rs(130),
                },
              ]}
            >
              {ringSizes.map((size, index) => (
                <View
                  key={size}
                  style={[
                    styles.ring,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      borderColor: ringColors[index],
                    },
                  ]}
                />
              ))}
              <View
                style={[
                  styles.iconDiamond,
                  {
                    borderColor: c.gold,
                    backgroundColor: c.cardBg,
                    width: isShort ? 36 : 44,
                    height: isShort ? 36 : 44,
                    borderRadius: isShort ? 18 : 22,
                  },
                ]}
              >
                <Icon
                  name={step === 'otp' ? 'mail' : step === 'forgot' || step === 'forgot_sent' ? 'key' : 'diamond'}
                  size={isShort ? rs(16) : rs(20)}
                  color={c.gold}
                  strokeWidth={1.2}
                />
              </View>
            </View>

            <Text
              style={[
                t.hero,
                {
                  color: c.textStrong,
                  marginTop: isShort ? 8 : 16,
                  letterSpacing: isSmall ? 5 : 8,
                  fontSize: isShort ? 28 : 34,
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
                  letterSpacing: isSmall ? 2 : 3.2,
                  fontSize: isSmall ? 9 : 10,
                },
              ]}
            >
              {step === 'otp'
                ? 'CONFIRMACIÓN DE CORREO'
                : step === 'forgot' || step === 'forgot_sent'
                ? 'RECUPERACIÓN DE CUENTA'
                : '90 DÍAS · SISTEMA INTEGRAL'}
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
                        color: activeTab === 'login' ? c.gold : c.textSoft,
                        letterSpacing: 1.8,
                        fontWeight: activeTab === 'login' ? '600' : '400',
                      },
                    ]}
                  >
                    INICIAR SESIÓN
                  </Text>
                </Pressable>

                <Pressable
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
                        color: activeTab === 'register' ? c.gold : c.textSoft,
                        letterSpacing: 1.8,
                        fontWeight: activeTab === 'register' ? '600' : '400',
                      },
                    ]}
                  >
                    CREAR CUENTA
                  </Text>
                </Pressable>
              </View>

              {/* Tarjeta de Formulario */}
              <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                {errorMessage ? (
                  <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                    <Text style={[t.small, { color: '#E06A66', textAlign: 'center' }]}>{errorMessage}</Text>
                  </View>
                ) : null}

                {activeTab === 'register' && (
                  <View style={styles.inputGroup}>
                    <MicroLabel>NOMBRE COMPLETO</MicroLabel>
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          borderColor: focusedField === 'name' ? c.gold : c.border,
                          backgroundColor: c.cardBgAlt,
                        },
                      ]}
                    >
                      <Icon name="user" size={17} color={focusedField === 'name' ? c.gold : c.tabInactive} />
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Ej. Sebastián Arango"
                        placeholderTextColor={c.tabInactive}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <MicroLabel>CORREO ELECTRÓNICO</MicroLabel>
                  <View
                    style={[
                      styles.inputWrap,
                      {
                        borderColor: focusedField === 'email' ? c.gold : c.border,
                        backgroundColor: c.cardBgAlt,
                      },
                    ]}
                  >
                    <Icon name="mail" size={17} color={focusedField === 'email' ? c.gold : c.tabInactive} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="tucorreo@ejemplo.com"
                      placeholderTextColor={c.tabInactive}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.passwordHeader}>
                    <MicroLabel>CONTRASEÑA</MicroLabel>
                    {activeTab === 'login' && (
                      <Pressable
                        hitSlop={8}
                        onPress={() => {
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setStep('forgot');
                        }}
                      >
                        <Text style={[t.micro, { color: c.gold, letterSpacing: 0.8, fontWeight: '600' }]}>
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
                    <Icon name="lock" size={17} color={focusedField === 'password' ? c.gold : c.tabInactive} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor={c.tabInactive}
                      secureTextEntry={!showPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    />
                    <Pressable hitSlop={8} onPress={() => setShowPassword(!showPassword)}>
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
                    <MicroLabel>CONFIRMAR CONTRASEÑA</MicroLabel>
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          borderColor: focusedField === 'confirmPassword' ? c.gold : c.border,
                          backgroundColor: c.cardBgAlt,
                        },
                      ]}
                    >
                      <Icon name="lock" size={17} color={focusedField === 'confirmPassword' ? c.gold : c.tabInactive} />
                      <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Repite tu contraseña"
                        placeholderTextColor={c.tabInactive}
                        secureTextEntry={!showPassword}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                      />
                    </View>
                  </View>
                )}

                {/* Botón Principal */}
                <Pressable
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
                      <Text style={[t.micro, { color: c.onGold, letterSpacing: 2.5, fontWeight: '700', fontSize: 11 }]}>
                        {activeTab === 'login' ? 'ACCEDER AL PROGRAMA' : 'CONTINUAR Y RECIBIR CÓDIGO'}
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
                  <Text style={[t.micro, { color: c.tabInactive, paddingHorizontal: 12, letterSpacing: 1.5 }]}>
                    O ACCEDE CON TU CUENTA
                  </Text>
                  <View style={[styles.divLine, { backgroundColor: c.divider }]} />
                </View>

                {/* Botón de Apple en iOS y Web (Obligatorio por Apple HIG en iOS) */}
                {(Platform.OS === 'ios' || Platform.OS === 'web') && (
                  <Pressable
                    onPress={() => handleSocialLogin('apple')}
                    disabled={socialLoading !== null}
                    style={[
                      styles.bigSocialBtn,
                      { borderColor: c.border, backgroundColor: c.cardBgAlt }
                    ]}
                  >
                    {socialLoading === 'apple' ? (
                      <ActivityIndicator color={c.gold} size="small" />
                    ) : (
                      <>
                        <Icon name="apple" size={20} color={c.gold} />
                        <Text style={[t.micro, { color: c.textStrong, letterSpacing: 1.6, fontWeight: '700', fontSize: 11 }]}>
                          {activeTab === 'login' ? 'CONTINUAR CON APPLE' : 'REGISTRARME CON APPLE'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}

                {/* Botón de Google en Android, iOS y Web */}
                {(Platform.OS === 'android' || Platform.OS === 'ios' || Platform.OS === 'web') && (
                  <Pressable
                    onPress={() => handleSocialLogin('google')}
                    disabled={socialLoading !== null}
                    style={[
                      styles.bigSocialBtn,
                      { borderColor: c.border, backgroundColor: c.cardBgAlt }
                    ]}
                  >
                    {socialLoading === 'google' ? (
                      <ActivityIndicator color={c.gold} size="small" />
                    ) : (
                      <>
                        <Icon name="google" size={20} color={c.gold} />
                        <Text style={[t.micro, { color: c.textStrong, letterSpacing: 1.6, fontWeight: '700', fontSize: 11 }]}>
                          {activeTab === 'login' ? 'CONTINUAR CON GOOGLE' : 'REGISTRARME CON GOOGLE'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>

              {/* Modo Demo / Acceso Rápido */}
              <View style={styles.demoSection}>
                <Pressable
                  onPress={demoLogin}
                  style={[
                    styles.demoBtn,
                    {
                      borderColor: c.borderStrong,
                      backgroundColor: c.cardBg,
                    },
                  ]}
                >
                  <Icon name="spark" size={16} color={c.gold} />
                  <Text style={[t.micro, { color: c.text, letterSpacing: 1.6, fontWeight: '600' }]}>
                    ACCESO DIRECTO (MODO DEMO)
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ========================================================================= */}
          {/* VISTA 2: VERIFICACIÓN DE CÓDIGO OTP DE 6 DÍGITOS                          */}
          {/* ========================================================================= */}
          {step === 'otp' && (
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <MicroLabel>VERIFICACIÓN DE SEGURIDAD</MicroLabel>
                <Text style={[t.sectionTitle, { color: c.text, textAlign: 'center', marginTop: 4 }]}>
                  INGRESA TU CÓDIGO
                </Text>
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', lineHeight: 18, marginTop: 4 }]}>
                  Hemos enviado un código de 6 dígitos a:
                </Text>
                <Text style={[t.small, { color: c.gold, fontWeight: '600' }]}>{email}</Text>
              </View>

              {errorMessage ? (
                <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                  <Text style={[t.small, { color: '#E06A66', textAlign: 'center' }]}>{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={[styles.alertBox, { backgroundColor: 'rgba(178, 146, 79, 0.12)', borderColor: c.borderStrong }]}>
                  <Text style={[t.small, { color: c.gold, textAlign: 'center' }]}>{successMessage}</Text>
                </View>
              ) : null}

              {/* Casillas Interactivas OTP */}
              <Pressable
                onPress={() => otpInputRef.current?.focus()}
                style={styles.otpBoxesContainer}
              >
                {[0, 1, 2, 3, 4, 5].map(index => {
                  const digit = otpCode[index] || '';
                  const isCurrent = otpCode.length === index;
                  const isFilled = digit.length > 0;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        {
                          borderColor: isCurrent ? c.gold : isFilled ? c.borderStrong : c.border,
                          backgroundColor: c.cardBgAlt,
                          transform: [{ scale: isCurrent ? 1.05 : 1 }],
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 22,
                          fontFamily: 'Jost_500Medium',
                          color: isFilled ? c.textStrong : c.tabInactive,
                        }}
                      >
                        {digit}
                      </Text>
                    </View>
                  );
                })}
              </Pressable>

              <TextInput
                ref={otpInputRef}
                value={otpCode}
                onChangeText={text => {
                  const cleanText = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtpCode(cleanText);
                  if (cleanText.length === 6) {
                    setErrorMessage(null);
                  }
                }}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.hiddenInput}
                autoFocus
              />

              {/* Reenviar código */}
              <View style={styles.resendContainer}>
                {canResend ? (
                  <Pressable onPress={handleResendOtp} disabled={loading} hitSlop={10}>
                    <Text style={[t.micro, { color: c.gold, letterSpacing: 1.2, fontWeight: '600' }]}>
                      ¿NO RECIBISTE EL CÓDIGO? REENVIAR
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={[t.micro, { color: c.tabInactive, letterSpacing: 1.1 }]}>
                    Reenviar nuevo código en {resendTimer}s
                  </Text>
                )}
              </View>

              {/* Botón Confirmar Código OTP */}
              <Pressable
                onPress={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
                style={[
                  styles.submitBtn,
                  { shadowColor: c.gold, opacity: otpCode.length === 6 ? 1 : 0.65 }
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
                    <Text style={[t.micro, { color: c.onGold, letterSpacing: 2.5, fontWeight: '700', fontSize: 11 }]}>
                      CONFIRMAR Y ACTIVAR CUENTA
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Botón de Retorno al Login */}
              <Pressable
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
                <MicroLabel>SEGURIDAD & ACCESO</MicroLabel>
                <Text style={[t.sectionTitle, { color: c.text, textAlign: 'center', marginTop: 4 }]}>
                  ¿OLVIDASTE TU CONTRASEÑA?
                </Text>
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', lineHeight: 19, marginTop: 4 }]}>
                  Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contraseña.
                </Text>
              </View>

              {errorMessage ? (
                <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
                  <Text style={[t.small, { color: '#E06A66', textAlign: 'center' }]}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <MicroLabel>CORREO REGISTRADO</MicroLabel>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: focusedField === 'forgot_email' ? c.gold : c.border,
                      backgroundColor: c.cardBgAlt,
                    },
                  ]}
                >
                  <Icon name="mail" size={17} color={focusedField === 'forgot_email' ? c.gold : c.tabInactive} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tucorreo@ejemplo.com"
                    placeholderTextColor={c.tabInactive}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('forgot_email')}
                    onBlur={() => setFocusedField(null)}
                    style={[styles.input, { color: c.text, fontFamily: 'Jost_400Regular' }]}
                    autoFocus
                  />
                </View>
              </View>

              {/* Botón Enviar Enlace */}
              <Pressable
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
                    <Text style={[t.micro, { color: c.onGold, letterSpacing: 2.5, fontWeight: '700', fontSize: 11 }]}>
                      ENVIAR ENLACE DE RECUPERACIÓN
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Botón de Retorno al Login */}
              <Pressable
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
          {/* VISTA 4: RECUPERACIÓN ENVIADA CON ÉXITO                                   */}
          {/* ========================================================================= */}
          {step === 'forgot_sent' && (
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                <View style={[styles.successIconWrap, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                  <Icon name="check" size={26} color={c.gold} strokeWidth={2} />
                </View>

                <MicroLabel>INSTRUCCIONES ENVIADAS</MicroLabel>
                <Text style={[t.sectionTitle, { color: c.text, textAlign: 'center' }]}>
                  REVISA TU BANDEJA DE ENTRADA
                </Text>
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center', lineHeight: 20 }]}>
                  Hemos enviado las instrucciones para restablecer tu contraseña a:
                </Text>
                <Text style={[t.small, { color: c.gold, fontWeight: '600', textAlign: 'center' }]}>
                  {email}
                </Text>
              </View>

              {/* Botón Volver al Login */}
              <Pressable
                onPress={handleReturnToLogin}
                style={[styles.submitBtn, { shadowColor: c.gold, marginTop: 10 }]}
              >
                <LinearGradient
                  colors={c.goldGrad}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.gradientBtn}
                >
                  <Text style={[t.micro, { color: c.onGold, letterSpacing: 2.5, fontWeight: '700', fontSize: 11 }]}>
                    VOLVER AL INICIO DE SESIÓN
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Opción de reenvío */}
              <Pressable
                onPress={handleForgotPasswordSubmit}
                hitSlop={10}
                style={{ alignItems: 'center', paddingVertical: 8 }}
              >
                <Text style={[t.micro, { color: c.micro, letterSpacing: 1.1 }]}>
                  ¿No recibiste el correo? <Text style={{ color: c.gold }}>Enviar de nuevo</Text>
                </Text>
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
    paddingBottom: 30,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  ringContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  iconDiamond: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 16,
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
    marginTop: 6,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  gradientBtn: {
    paddingVertical: 15,
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
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    gap: 6,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
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
