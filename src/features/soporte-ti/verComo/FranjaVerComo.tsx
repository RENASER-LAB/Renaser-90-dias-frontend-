import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { irAPestana, pestanaDisponible } from '../../../navigation/navegacionRef';
import { suscribirModoSoloLectura } from '../../../services/http/apiClient';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';

/** Lo que dice la franja cuando el servidor rechazó una escritura (403 `MODO_SOLO_LECTURA`), en vez de un diálogo. */
export const TEXTO_SOLO_LECTURA = 'Solo lectura: eso no se guardó.';
/** Cuánto queda a la vista ese texto. */
export const SOLO_LECTURA_VISIBLE_MS = 4000;
const FUNDIDO_MS = 180;

/**
 * La franja fija de arriba mientras Soporte TI ve la app como otro rol (spec 002, fase 2, §5): «Viendo como Mentor ·
 * Salir». Va por encima de todo (en `App.tsx`), en el flujo: la app queda debajo y su borde seguro de arriba lo pone la
 * franja (ver {@link SinBordeDeArriba}).
 *
 * - **Salir** siempre funciona, aun sin red: restaura la sesión de Soporte TI guardada y vuelve a Yo con la consola.
 * - Una escritura rechazada (403 `MODO_SOLO_LECTURA`) se dice acá, en línea, sin diálogo: «Solo lectura: eso no se
 *   guardó.» unos segundos, con un fundido corto (con «reducir movimiento», al instante). Se anuncia al lector.
 * - La franja en sí no se anima: aparece con la app ya armada como el otro rol, que es el cambio que importa.
 */
export function FranjaVerComo() {
  const { verComo, salirDeVerComo } = useAuth();
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [saliendo, setSaliendo] = useState(false);
  const [rechazo, setRechazo] = useState(0);
  const opacidad = useSharedValue(0);
  const activa = Boolean(verComo);

  useEffect(() => {
    if (!activa) return;
    return suscribirModoSoloLectura(() => setRechazo(Date.now()));
  }, [activa]);

  useEffect(() => {
    if (!rechazo) return;
    const fundido = { duration: FUNDIDO_MS, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.System };
    opacidad.set(withTiming(1, fundido));
    AccessibilityInfo.announceForAccessibility?.(TEXTO_SOLO_LECTURA);
    const reloj = setTimeout(() => opacidad.set(withTiming(0, fundido)), SOLO_LECTURA_VISIBLE_MS);
    return () => clearTimeout(reloj);
  }, [rechazo, opacidad]);

  const estiloDelRechazo = useAnimatedStyle(() => ({ opacity: opacidad.get() }));
  const estiloDeSoloLectura = useAnimatedStyle(() => ({ opacity: 1 - opacidad.get() }));

  /* El vencimiento de la sesión de prueba (30 min): se vuelve solo, sin esperar a que un pedido dé 401. */
  const salirRef = useRef(salirDeVerComo);
  salirRef.current = salirDeVerComo;
  useEffect(() => {
    const vence = verComo?.venceEn ? Date.parse(verComo.venceEn) : NaN;
    if (!Number.isFinite(vence)) return;
    const reloj = setTimeout(() => void salirRef.current(), Math.max(0, vence - Date.now()));
    return () => clearTimeout(reloj);
  }, [verComo?.venceEn]);

  if (!verComo) return null;

  const salir = async () => {
    if (saliendo) return;
    setSaliendo(true);
    try {
      await salirDeVerComo();
      volverALaConsola();
    } finally {
      setSaliendo(false);
    }
  };

  return (
    <View
      testID="franja-ver-como"
      style={[estilos.franja, { paddingTop: insets.top + 6, backgroundColor: c.cardBg, borderBottomColor: c.gold }]}
    >
      <View style={estilos.fila}>
        <Icon name="eye" size={TAMANO_ICONO.normal} color={c.goldInk} />
        <View style={{ flex: 1, flexShrink: 1 }} accessible accessibilityRole="header" accessibilityLabel={`Viendo como ${verComo.etiqueta}. Solo lectura`}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]} numberOfLines={1}>
            Viendo como {verComo.etiqueta}
          </Text>
          <View>
            <Animated.View style={estiloDeSoloLectura}>
              <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]} numberOfLines={1}>
                Solo lectura
              </Text>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, estiloDelRechazo]} accessibilityLiveRegion="polite" pointerEvents="none">
              <Text style={[t.small, { color: c.danger, fontSize: 13 }]} numberOfLines={1}>
                {rechazo ? TEXTO_SOLO_LECTURA : ''}
              </Text>
            </Animated.View>
          </View>
        </View>
        <Presionable
          onPress={() => void salir()}
          disabled={saliendo}
          accessibilityRole="button"
          accessibilityLabel={`Salir de ver como ${verComo.etiqueta}`}
          style={[estilos.salir, { borderColor: c.gold, opacity: saliendo ? 0.6 : 1 }]}
        >
          <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: 'Jost_700Bold' }]}>{saliendo ? 'Saliendo…' : 'Salir'}</Text>
        </Presionable>
      </View>
    </View>
  );
}

/**
 * Lo que va debajo de la franja: sin borde seguro de arriba (ya lo pone ella). Los `SafeAreaView` nativos lo calculan
 * solos por su posición; esto corrige a quienes leen el borde con `useSafeAreaInsets` (Comunidad, las hojas).
 */
export function SinBordeDeArriba({ children }: { children: React.ReactNode }) {
  const { verComo } = useAuth();
  const insets = useSafeAreaInsets();
  const valor = verComo ? { ...insets, top: 0 } : insets;
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaInsetsContext.Provider value={valor}>{children}</SafeAreaInsetsContext.Provider>
    </View>
  );
}

/**
 * Después de salir, las pestañas se vuelven a armar (otra cuenta): se espera a que Yo exista y se abre la consola,
 * que es de donde se vino. Si en 3 s no está (la app quedó en otra pantalla), no se insiste.
 */
function volverALaConsola(): void {
  const hasta = Date.now() + 3000;
  const intentar = () => {
    if (pestanaDisponible('Yo')) {
      irAPestana('Yo', { abrirSoporteTi: true });
      return;
    }
    if (Date.now() < hasta) setTimeout(intentar, 100);
  };
  setTimeout(intentar, 0);
}

const estilos = StyleSheet.create({
  franja: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  salir: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
});
