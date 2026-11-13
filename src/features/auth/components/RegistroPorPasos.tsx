import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Icon } from '../../../components/Icon';
import { Checkbox } from '../../../components/Checkbox';
import { Presionable } from '../../../components/Presionable';
import { PhoneCountryInput } from '../../../components/PhoneCountryInput';
import { tacto } from '../../../utils/tacto';
import { abrirPoliticaDePrivacidad } from '../../legal/enlacesLegales';
import { CampoDelIngreso, MensajeBajoElCampo } from './CampoDelIngreso';
import { BotonDelIngreso } from './BotonDelIngreso';
import { EncabezadoDePaso } from './EncabezadoDePaso';
import { EntradaEscalonada } from './EntradaEscalonada';
import { useSacudida } from '../hooks/useSacudida';
import { useTecladoAbierto } from '../hooks/useTecladoAbierto';
import type { EstadoDisponibilidadCorreo } from '../hooks/useDisponibilidadCorreo';
import {
  AYUDA_DE_LA_CONTRASENA,
  TEXTO_DE_FUERZA,
  TITULO_DEL_PASO,
  fuerzaDeLaContrasena,
  type DatosDelRegistro,
  type ErrorDePaso,
  type PasoDelRegistro,
} from '../utils/registroPorPasos';

/**
 * «Solicitar acceso» por pasos (spec 051, pedido del dueño del 12/11): un grupo de campos por pantalla, fondo liso (sin
 * el fénix), solo el título grande, y el botón fijo abajo, SOBRE el teclado.
 *
 * El teclado nunca tapa el campo ni el botón: el `KeyboardAvoidingView` achica la zona (el campo va arriba, dentro del
 * scroll) y el botón vive fuera del scroll, así que sube con el teclado. Si un paso no cabe en lo que queda (la
 * contraseña, con su medidor y los términos, en un teléfono chico), solo ese contenido se desplaza.
 *
 * Esta pieza no guarda nada importante: los datos y el paso viven en `LoginScreen` (la raíz del flujo), así ir y volver, o
 * abrir el teclado, no pierde lo escrito. Lo único local es si la contraseña se ve.
 */
export function RegistroPorPasos({
  paso,
  indice,
  total,
  datos,
  alCambiar,
  error,
  cargando,
  disponibilidadCorreo,
  alContinuar,
  alVolver,
}: {
  paso: PasoDelRegistro;
  /** Desde 0. */
  indice: number;
  total: number;
  datos: DatosDelRegistro;
  alCambiar: (parcial: Partial<DatosDelRegistro>) => void;
  /** Lo que falta en este paso; un objeto nuevo en cada intento fallido (así vuelve a sacudir). */
  error: ErrorDePaso | null;
  cargando: boolean;
  disponibilidadCorreo: EstadoDisponibilidadCorreo;
  alContinuar: () => void;
  alVolver: () => void;
}) {
  const { c, t } = useTheme();
  const { isTablet, isShort, horizontalPadding } = useResponsive();
  const insets = useSafeAreaInsets();
  const tecladoAbierto = useTecladoAbierto();
  const sacudida = useSacudida();
  const [verContrasena, setVerContrasena] = useState(false);
  const [enfocado, setEnfocado] = useState<string | null>(null);

  const listaRef = useRef<ScrollView>(null);
  const apellidosRef = useRef<TextInput>(null);
  const primerCampoRef = useRef<TextInput>(null);

  // Un intento fallido: el mismo gesto de error del login (vibración y sacudida del grupo de campos).
  useEffect(() => {
    if (!error) return;
    tacto.error();
    sacudida.sacudir();
    // `sacudida` cambia en cada render; lo que dispara esto es el objeto de error nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // El teclado sube solo al llegar a un paso con texto (no en el del WhatsApp, que lo maneja `PhoneCountryInput`).
  useEffect(() => {
    if (paso === 'whatsapp') return;
    const temporizador = setTimeout(() => primerCampoRef.current?.focus(), 300);
    return () => clearTimeout(temporizador);
  }, [paso]);

  /* En un teléfono chico, con el teclado arriba, el último campo del paso puede quedar bajo el botón: al enfocarlo se lleva la lista hasta
     el final (el botón vive fuera del scroll, así que el campo termina justo encima de él). Se espera a que el teclado termine de subir. */
  const verElUltimoCampo = () => {
    setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const errorEn = (campo: string) => (error?.campo === campo ? error.mensaje : null);
  const ultimo = indice === total - 1;
  const fuerza = fuerzaDeLaContrasena(datos.contrasena);
  const colorDeFuerza = fuerza === 1 ? c.danger : fuerza === 2 ? c.goldInk : c.success;

  return (
    <View style={[styles.raiz, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={styles.raiz}>
        <EncabezadoDePaso
          actual={indice + 1}
          total={total}
          alVolver={alVolver}
          horizontalPadding={horizontalPadding}
        />

        <ScrollView
          ref={listaRef}
          style={styles.raiz}
          contentContainerStyle={[
            styles.contenido,
            { paddingHorizontal: horizontalPadding },
            isTablet && styles.contenidoTablet,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <EntradaEscalonada key={`paso-${paso}`} indice={0}>
            <Text
              accessibilityRole="header"
              style={[
                styles.titulo,
                { color: c.textStrong, fontSize: isShort ? 28 : 32, lineHeight: isShort ? 34 : 38 },
                tecladoAbierto && isShort && styles.tituloCompacto,
              ]}
            >
              {TITULO_DEL_PASO[paso]}
            </Text>

            <Animated.View style={[styles.campos, sacudida.estilo]}>
              {paso === 'nombre' ? (
                <>
                  <CampoDelIngreso
                    ref={primerCampoRef}
                    testID="campo-nombres"
                    etiqueta="Nombres"
                    icono="user"
                    enfocado={enfocado === 'nombres'}
                    conError={errorEn('nombres') !== null}
                    value={datos.nombres}
                    onChangeText={nombres => alCambiar({ nombres })}
                    placeholder="Ej. Sebastián"
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="given-name"
                    textContentType="givenName"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => apellidosRef.current?.focus()}
                    onFocus={() => setEnfocado('nombres')}
                    onBlur={() => setEnfocado(null)}
                    debajo={errorEn('nombres') ? <MensajeBajoElCampo texto={errorEn('nombres')!} /> : null}
                  />
                  <CampoDelIngreso
                    ref={apellidosRef}
                    testID="campo-apellidos"
                    etiqueta="Apellidos"
                    icono="user"
                    enfocado={enfocado === 'apellidos'}
                    conError={errorEn('apellidos') !== null}
                    value={datos.apellidos}
                    onChangeText={apellidos => alCambiar({ apellidos })}
                    placeholder="Ej. Arango"
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="family-name"
                    textContentType="familyName"
                    returnKeyType="next"
                    onSubmitEditing={alContinuar}
                    onFocus={() => {
                      setEnfocado('apellidos');
                      verElUltimoCampo();
                    }}
                    onBlur={() => setEnfocado(null)}
                    debajo={errorEn('apellidos') ? <MensajeBajoElCampo texto={errorEn('apellidos')!} /> : null}
                  />
                </>
              ) : null}

              {paso === 'correo' ? (
                <CampoDelIngreso
                  ref={primerCampoRef}
                  testID="campo-correo-registro"
                  etiqueta="Correo electrónico"
                  icono="mail"
                  enfocado={enfocado === 'email'}
                  conError={errorEn('email') !== null}
                  value={datos.email}
                  onChangeText={email => alCambiar({ email })}
                  placeholder="tucorreo@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={alContinuar}
                  onFocus={() => setEnfocado('email')}
                  onBlur={() => setEnfocado(null)}
                  debajo={
                    <>
                      {errorEn('email') ? <MensajeBajoElCampo texto={errorEn('email')!} /> : null}
                      {/* Solo cuando hay un veredicto real: «verificando» y «idle» no dicen nada. */}
                      {!errorEn('email') && disponibilidadCorreo === 'disponible' ? (
                        <Text style={[t.small, { color: c.goldInk }]}>Este correo está disponible.</Text>
                      ) : null}
                      {!errorEn('email') && disponibilidadCorreo === 'tomado' ? (
                        <Text style={[t.small, { color: c.danger }]}>
                          Ese correo ya tiene una cuenta. Puedes iniciar sesión.
                        </Text>
                      ) : null}
                    </>
                  }
                />
              ) : null}

              {paso === 'whatsapp' ? (
                <View>
                  <PhoneCountryInput
                    label=""
                    value={datos.whatsapp}
                    onChange={whatsapp => alCambiar({ whatsapp })}
                    error={errorEn('whatsapp') ?? undefined}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={alContinuar}
                  />
                </View>
              ) : null}

              {paso === 'contrasena' ? (
                <>
                  <CampoDelIngreso
                    ref={primerCampoRef}
                    testID="campo-contrasena-registro"
                    etiqueta="Contraseña"
                    icono="lock"
                    enfocado={enfocado === 'contrasena'}
                    conError={errorEn('contrasena') !== null}
                    value={datos.contrasena}
                    onChangeText={contrasena => alCambiar({ contrasena })}
                    placeholder="Tu contraseña"
                    secureTextEntry={!verContrasena}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={alContinuar}
                    onFocus={() => setEnfocado('contrasena')}
                    onBlur={() => setEnfocado(null)}
                    accesorio={
                      <Presionable
                        accessibilityRole="button"
                        accessibilityLabel={verContrasena ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                        onPress={() => setVerContrasena(v => !v)}
                        style={styles.ojo}
                      >
                        <Icon name={verContrasena ? 'eyeOff' : 'eye'} size={20} color={c.tabInactive} />
                      </Presionable>
                    }
                    debajo={errorEn('contrasena') ? <MensajeBajoElCampo texto={errorEn('contrasena')!} /> : null}
                  />

                  <View style={styles.medidor} accessible accessibilityLabel={`Fuerza de la contraseña: ${TEXTO_DE_FUERZA[fuerza] || 'vacía'}`}>
                    <View style={styles.segmentosDeFuerza}>
                      {[1, 2, 3].map(n => (
                        <View
                          key={n}
                          testID={n <= fuerza ? 'fuerza-llena' : 'fuerza-vacia'}
                          style={[styles.segmentoDeFuerza, { backgroundColor: n <= fuerza ? colorDeFuerza : c.divider }]}
                        />
                      ))}
                    </View>
                    <Text style={[t.small, styles.textoDeFuerza, { color: fuerza ? colorDeFuerza : c.textSoft }]}>
                      {TEXTO_DE_FUERZA[fuerza]}
                    </Text>
                  </View>
                  <Text style={[t.small, { color: c.textSoft }]}>{AYUDA_DE_LA_CONTRASENA}</Text>

                  <Checkbox
                    checked={datos.aceptaTerminos}
                    onToggle={aceptaTerminos => alCambiar({ aceptaTerminos })}
                    title="Acepto los términos"
                    style={errorEn('terminos') ? { borderColor: c.danger } : undefined}
                  />
                  {errorEn('terminos') ? <MensajeBajoElCampo texto={errorEn('terminos')!} /> : null}
                  <Presionable
                    accessibilityRole="link"
                    accessibilityLabel="Leer la política de privacidad"
                    onPress={() => void abrirPoliticaDePrivacidad()}
                    hitSlop={6}
                    style={styles.enlace}
                  >
                    <Text style={[t.small, styles.textoDelEnlace, { color: c.goldInk }]}>Leer la política de privacidad</Text>
                  </Presionable>
                </>
              ) : null}

              {errorEn('general') ? <MensajeBajoElCampo texto={errorEn('general')!} /> : null}
            </Animated.View>
          </EntradaEscalonada>
        </ScrollView>

        {/* Fuera del scroll: sube con el teclado y nunca queda tapado. */}
        <View
          style={[
            styles.pie,
            { paddingHorizontal: horizontalPadding, paddingBottom: tecladoAbierto ? 12 : Math.max(insets.bottom, 12) },
            isTablet && styles.contenidoTablet,
          ]}
        >
          <BotonDelIngreso etiqueta={ultimo ? 'Crear mi cuenta' : 'Continuar'} cargando={cargando} onPress={alContinuar} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { flexGrow: 1, paddingTop: 24, paddingBottom: 16 },
  contenidoTablet: { maxWidth: 560, width: '100%', alignSelf: 'center' },
  titulo: { fontFamily: fuentes.display, letterSpacing: -0.8, marginBottom: 24 },
  tituloCompacto: { fontSize: 26, lineHeight: 31, marginBottom: 14 },
  campos: { gap: 18 },
  ojo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  medidor: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -6 },
  segmentosDeFuerza: { flex: 1, flexDirection: 'row', gap: 6 },
  segmentoDeFuerza: { flex: 1, height: 4, borderRadius: 2 },
  textoDeFuerza: { fontFamily: fuentes.media, minWidth: 72, textAlign: 'right' },
  enlace: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  textoDelEnlace: { fontFamily: fuentes.media, textDecorationLine: 'underline' },
  pie: { paddingTop: 10 },
});
