import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { irAPestana } from '../../../navigation/navegacionRef';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { PactoScreen } from '../../onboarding/screens/PactoScreen';
import {
  ANTESALA_PACTO,
  ESPERANDO_PRIMER_POST,
  GUIA_PRIMER_POST,
  NOMBRE_ASISTENTE,
  saludoDeBienvenida,
} from '../data/asistente';
import { useArranqueGuiado } from '../hooks/useArranqueGuiado';

/**
 * El acompañamiento del arranque, sobrepuesto a la app.
 *
 * Pedido del dueño (2026-09-04): "El agente de IA debe saludar al inicio, luego de escoger el
 * inicio del programa. La IA, que se llamará Sparkie, debe sobreponerse y guiar al usuario para que
 * publique en el muro un mensaje o un post. Luego de que publica su primer post debe salir lo
 * siguiente: el pacto de sangre, para que lo firme y proceda a disfrutar de la app."
 *
 * <p><b>Por qué vive acá arriba y no dentro de una pantalla.</b> Exactamente el mismo motivo que
 * `RenasiaLauncher`: `AGENTS.md` §1 prohíbe alterar las cinco pantallas principales, y el
 * acompañamiento tiene que poder aparecer sobre cualquiera de ellas. Montado una vez por encima
 * del navegador, ninguna pantalla existente cambia — salvo el punto de entrada al composer del
 * Muro en `ComunidadScreen`, que sigue el patrón de parámetros de ruta que esa pantalla YA usaba
 * para la Clase Diaria.
 *
 * <p><b>Qué NO hace.</b> No le pregunta nada al modelo. El saludo y la guía son texto de la app
 * (ver `data/asistente.ts`): hoy `renaser.ia.proveedor` está en `noop` y el modelo devuelve una
 * línea fija de "faltan credenciales", así que un arranque que dependiera de él nacería roto.
 *
 * <p><b>Nunca atrapa a nadie.</b> `AGENTS.md` §6 exige que el gesto lateral del sistema cierre el
 * overlay y jamás la app; y no se inventó ninguna regla de "no podés usar la app hasta publicar"
 * — nadie la dictó. Se puede minimizar y seguir; el acompañamiento vuelve como una burbuja
 * discreta, y reaparece en el próximo arranque mientras el Pacto siga sin firmar.
 */
export function SparkieOverlay() {
  const { c, t } = useTheme();
  const { isSmall, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isOnboardingCompleted } = useAuth();

  // Solo con sesión y con el onboarding cerrado: durante Ficha/Términos/Elegir Día 1 el aprendiz
  // ya está siendo guiado por esas pantallas, y superponerle un segundo guía sería ruido.
  const habilitado = isAuthenticated && isOnboardingCompleted;
  const { estado, marcarPactoFirmado } = useArranqueGuiado(habilitado);

  /** Minimizado: la tarjeta se guarda y queda la burbuja. Se reabre tocándola. */
  const [minimizado, setMinimizado] = useState(false);
  /** El Pacto se muestra a pantalla completa, encima de todo. */
  const [pactoAbierto, setPactoAbierto] = useState(false);

  // Cambiar de paso siempre vuelve a llamar la atención: minimizar "publicá tu primer post" no
  // puede dejar escondido el Pacto, que es el paso que de verdad hay que cerrar.
  useEffect(() => {
    setMinimizado(false);
  }, [estado.paso]);

  const tarjetaVisible = habilitado && !pactoAbierto && !minimizado
    && (estado.paso === 'PUBLICAR_PRIMER_POST' || estado.paso === 'FIRMAR_PACTO');

  // Gesto lateral / botón atrás con la tarjeta abierta: la guarda, nunca cierra la app.
  useSystemBackHandler(() => {
    setMinimizado(true);
    return true;
  }, tarjetaVisible);

  const irAlMuro = useCallback(() => {
    // `abrirComposerMuro` lo consume `ComunidadScreen` una sola vez, igual que `abrirCursoId`.
    const navego = irAPestana('Comunidad', { abrirComposerMuro: true });
    // Si el navegador todavía no estaba listo, se deja la tarjeta abierta: mejor que minimizarse
    // habiendo llevado a la persona a ningún lado.
    if (navego) setMinimizado(true);
  }, []);

  const alFirmarPacto = useCallback(() => {
    setPactoAbierto(false);
    marcarPactoFirmado();
  }, [marcarPactoFirmado]);

  if (!habilitado || estado.paso === 'CARGANDO' || estado.paso === 'NINGUNO') {
    return null;
  }

  const saludo = saludoDeBienvenida(user?.name);
  const anchoTarjeta = isTablet ? 560 : undefined;
  const padding = isSmall ? 16 : isTablet ? 32 : 20;

  return (
    <>
      {/* ---------------------------------------------------------------------------------- */}
      {/* BURBUJA MINIMIZADA — se ubica por encima de la TabBar, a la IZQUIERDA, para no        */}
      {/* pisar el botón flotante del asistente conversacional, que vive a la derecha.         */}
      {/* ---------------------------------------------------------------------------------- */}
      {minimizado && !pactoAbierto && (
        <Pressable
          onPress={() => setMinimizado(false)}
          accessibilityRole="button"
          accessibilityLabel={`Volver a la guía de ${NOMBRE_ASISTENTE}`}
          style={[
            styles.burbuja,
            {
              bottom: insets.bottom + ALTO_TAB_BAR + SEPARACION,
              backgroundColor: c.cardBgAlt,
              borderColor: c.gold,
            },
          ]}
        >
          <Icon name="spark" size={18} color={c.gold} />
          <Text style={[t.micro, { color: c.textStrong, fontSize: 11.5, fontWeight: '700' }]}>
            {NOMBRE_ASISTENTE.toUpperCase()}
          </Text>
        </Pressable>
      )}

      {/* ---------------------------------------------------------------------------------- */}
      {/* TARJETA SOBREPUESTA                                                                  */}
      {/* ---------------------------------------------------------------------------------- */}
      <Modal visible={tarjetaVisible} transparent animationType="fade" onRequestClose={() => setMinimizado(true)}>
        {/* Tocar el velo minimiza: una capa que no se puede sacar de encima es una trampa. */}
        <Pressable style={styles.velo} onPress={() => setMinimizado(true)}>
          {/* El `Pressable` interno frena el toque para que tocar la tarjeta no la cierre. */}
          <Pressable
            onPress={() => {}}
            style={[
              styles.tarjeta,
              {
                backgroundColor: c.cardBgAlt,
                borderColor: c.borderStrong,
                paddingHorizontal: padding,
                maxWidth: anchoTarjeta,
              },
            ]}
          >
            {/* UN SOLO contenedor de scroll (AGENTS.md §2): el contenido puede no entrar en
                pantallas cortas y no hay ningún otro scroll anidado acá dentro. */}
            <ScrollView
              contentContainerStyle={styles.contenido}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.encabezado}>
                <View style={[styles.medalla, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
                  <Icon name="spark" size={22} color={c.gold} />
                </View>
                <Text style={[t.micro, { color: c.micro, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' }]}>
                  {NOMBRE_ASISTENTE.toUpperCase()}
                </Text>
              </View>

              {estado.paso === 'PUBLICAR_PRIMER_POST' && (
                <>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 20, textAlign: 'center' }]}>
                    {saludo.titulo}
                  </Text>
                  {saludo.parrafos.map(parrafo => (
                    <Text key={parrafo} style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 23, textAlign: 'center' }]}>
                      {parrafo}
                    </Text>
                  ))}

                  <View style={[styles.separador, { backgroundColor: c.gold }]} />

                  <Text style={[t.sectionTitle, { color: c.gold, fontSize: 12.5, textAlign: 'center', fontWeight: '700' }]}>
                    {GUIA_PRIMER_POST.titulo.toUpperCase()}
                  </Text>
                  {GUIA_PRIMER_POST.parrafos.map(parrafo => (
                    <Text key={parrafo} style={[t.body, { color: c.textSoft, fontSize: 14.5, lineHeight: 22, textAlign: 'center' }]}>
                      {parrafo}
                    </Text>
                  ))}

                  <GoldButton
                    label={GUIA_PRIMER_POST.botonPrincipal}
                    onPress={irAlMuro}
                    icon="send"
                    style={{ marginTop: 6, width: '100%' }}
                  />
                  <Pressable onPress={() => setMinimizado(true)} style={styles.botonSecundario} hitSlop={8}>
                    <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>
                      {GUIA_PRIMER_POST.botonSecundario}
                    </Text>
                  </Pressable>
                  <Text style={[t.micro, { color: c.tabInactive, fontSize: 11, textAlign: 'center' }]}>
                    {ESPERANDO_PRIMER_POST.parrafo}
                  </Text>
                </>
              )}

              {estado.paso === 'FIRMAR_PACTO' && (
                <>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 20, textAlign: 'center' }]}>
                    {ANTESALA_PACTO.titulo}
                  </Text>
                  {ANTESALA_PACTO.parrafos.map(parrafo => (
                    <Text key={parrafo} style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 23, textAlign: 'center' }]}>
                      {parrafo}
                    </Text>
                  ))}

                  <GoldButton
                    label={ANTESALA_PACTO.boton}
                    onPress={() => setPactoAbierto(true)}
                    icon="doc"
                    style={{ marginTop: 6, width: '100%' }}
                  />
                  <Pressable onPress={() => setMinimizado(true)} style={styles.botonSecundario} hitSlop={8}>
                    <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>Más tarde</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---------------------------------------------------------------------------------- */}
      {/* EL PACTO — la pantalla que YA existía (`PactoScreen`), sin duplicar ni una línea.     */}
      {/* Trae su propio `useSystemBackHandler`, su `SignatureCanvas` y el guardado completo   */}
      {/* (respuesta + hito PACTO + firma PNG a S3 + hito PACTO_FIRMADO).                      */}
      {/* ---------------------------------------------------------------------------------- */}
      <Modal visible={pactoAbierto} animationType="slide" onRequestClose={() => setPactoAbierto(false)}>
        <PactoScreen
          initialName={user?.name || ''}
          etiquetaVolver="MÁS TARDE"
          onAccept={alFirmarPacto}
          onBack={() => setPactoAbierto(false)}
        />
      </Modal>
    </>
  );
}

/** Mismos números que `RenasiaLauncher`: la burbuja no puede montarse sobre la TabBar. */
const ALTO_TAB_BAR = 62;
const SEPARACION = 16;

const styles = StyleSheet.create({
  velo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tarjeta: {
    width: '100%',
    maxHeight: '82%',
    borderWidth: 1.5,
    borderRadius: 22,
    paddingVertical: 22,
  },
  contenido: {
    flexGrow: 1,
    gap: 12,
    alignItems: 'center',
    paddingBottom: 4,
  },
  encabezado: {
    alignItems: 'center',
    gap: 8,
  },
  medalla: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separador: {
    width: 44,
    height: 1.5,
    borderRadius: 1,
    marginVertical: 2,
  },
  /** 48px de alto: touch target cómodo con una sola mano (AGENTS.md §4). */
  botonSecundario: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  burbuja: {
    position: 'absolute',
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 24,
  },
});
