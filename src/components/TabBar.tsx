import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Icon, IconName } from './Icon';
import { pestanasOcultas } from '../navigation/pestanasOcultas';
import { useBarraInferior } from '../navigation/barraAlDesplazar/BarraInferior';

/**
 * El ícono de cada pestaña, **todos en este mapa** —también el del botón dorado de TRAINING—: cambiar
 * uno, o volver atrás, es cambiar una línea.
 *
 * > **Cambiado el 2026-10-05**, pedido del dueño: «la parte de abajo, íconos que le correspondan».
 * > Eran `sun` (Hoy), `doc` (Plan), `diamond` (Training, fijo en el botón central y fuera de este
 * > mapa), `users` (Comunidad) y `user` (Yo): no decían qué hay en cada pestaña, y los cinco ya
 * > significaban otra cosa dentro de la app (el sol es el modo claro de Ajustes y el ritual del
 * > mediodía; la hoja, un recurso de lección o una evidencia de texto; el diamante, la fase 2 del
 * > programa; `users`, la Tribu; `user`, «Editar perfil»). Ahora: la casa de «inicio» para el tablero
 * > del día, la planilla para el plan, el brazo de 💪 para el entrenamiento diario, un grupo de tres
 * > (la Tribu es de dos) para la comunidad y la persona en un círculo de «mi cuenta» para Yo.
 * > El dueño eligió este juego (el 2) entre las opciones del mosaico `barra-iconos-opciones.png`;
 * > `barraDePestanasIconos.test.ts` frena que se repita un dibujo que ya significa otra cosa.
 */
const ICONS: Record<string, IconName> = { Hoy: 'house', Plan: 'clipboardList', Training: 'bicepsFlexed', Comunidad: 'usersThree', Yo: 'circleUser' };
const LABELS: Record<string, string> = { Hoy: 'HOY', Plan: 'PLAN', Training: 'TRAINING', Comunidad: 'COMUNIDAD', Yo: 'YO' };

/**
 * **Los cinco nombres se ven siempre**, y la pestaña activa se distingue por el color dorado
 * (el resto queda en `tabInactive`).
 *
 * > **Corregido el 2026-09-15.** Del 2026-09-14 al 2026-09-15 el nombre se vio SOLO en la pestaña
 * > activa, para descargar la franja. El dueño lo revirtió al verlo funcionando: con cuatro íconos
 * > sin rótulo no se sabe dónde está uno ni adónde lleva cada uno. Es el mismo criterio que ya
 * > estaba escrito tres párrafos más abajo y que en su momento evitó quitar los nombres del todo —
 * > un diamante para "Training" o una hoja para "Plan" no son evidentes para un público de 40 a 60
 * > años.
 *
 * El lector de pantalla no lee este texto sino el `accessibilityLabel` del `Pressable`, que se
 * mantiene en las cinco y es de donde las pruebas E2E toman la pestaña
 * (`getByRole('tab', { name: /^hoy$/i })`): mostrar u ocultar el rótulo visible no toca ninguna
 * de las dos cosas.
 *
 * Se descartó quitar los nombres del todo, como pide la referencia del dueño (Facebook): esos
 * íconos se aprendieron hace quince años, y acá un diamante para "Training" o una hoja para "Plan"
 * no son evidentes para un público de 40 a 60 años — el mismo criterio por el que `AGENTS.md` §4
 * fija tamaños mínimos de lectura.
 */
export function TabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { rs, isTablet } = useResponsive();
  const ocultaPorLaPantalla = pestanasOcultas(descriptors[state.routes[state.index].key]?.options);
  const barra = useBarraInferior();
  const inset = insets.bottom;

  /* «Ocultar la barra al desplazar» (2026-10-02, ver `navigation/barraAlDesplazar`). Al cambiar
     de pestaña, y al abrir o cerrar una conversación a pantalla completa, la barra vuelve a la
     vista: nadie llega a una pestaña sin la navegación. */
  const mostrar = barra?.mostrar;
  useEffect(() => {
    mostrar?.();
  }, [state.index, ocultaPorLaPantalla, mostrar]);

  /* La barra NO se desmonta. Dos piezas:
     - La CAJA de afuera está en el flujo y es la que reserva lugar: con la barra a la vista mide lo
       que la barra; escondida, solo el borde seguro de abajo (pintado de `c.bg`, para que nada
       quede bajo la barra de gestos), y la pantalla crece en lo mismo. Ese alto cambia UNA vez por
       vez que la barra se va o vuelve, en JS: ninguna pantalla necesita un relleno distinto para
       cada estado y el contenido nunca queda tapado.
     - La BARRA va pegada al fondo de la caja y se desliza con `transform` en el hilo de UI
       (Reanimated): baja su alto entero más lo que asoma el botón de TRAINING (`SOBRESALE`).
     > **Corregido el 2026-10-02**, el mismo día: la primera versión animaba el ALTO de la caja con
     > Reanimated cuadro a cuadro. En el emulador la barra quedaba a medio salir (a ~2/3 del camino,
     > con el botón de TRAINING asomando abajo) y Yoga además aplastaba la barra de adentro, que se
     > medía cada vez más baja (100 → 37 dp). Animar un alto es una propiedad de layout; un
     > `transform` no lo es y no tiene esos problemas. */
  const altoQueGana = barra?.altoQueGana;
  const [altoBarra, setAltoBarra] = useState<number | null>(null);
  const escondidaEnJs = useSyncExternalStore(barra?.suscribir ?? sinSuscripcion, () => barra?.estaEscondida() ?? false);
  const medir = (e: LayoutChangeEvent) => {
    const alto = e.nativeEvent.layout.height;
    if (altoQueGana) altoQueGana.value = Math.max(0, alto - inset);
    if (alto !== altoBarra) setAltoBarra(alto);
  };
  const escondida = barra?.escondida;
  const estiloDeLaBarra = useAnimatedStyle(() => {
    if (!escondida || !altoQueGana) return {};
    return { transform: [{ translateY: escondida.value * (altoQueGana.value + inset + SOBRESALE) }] };
  });
  /* Hasta medirla, la barra va en el flujo como siempre (y de ahí sale su alto). */
  const caja = altoBarra === null ? null : { height: escondidaEnJs ? inset : altoBarra };
  const pegadaAlFondo = altoBarra === null ? null : styles.pegadaAlFondo;

  /* 2026-09-26: una pestaña puede pedir la pantalla entera (una conversación de Comunidad, como en
     WhatsApp) con `tabBarStyle: { display: 'none' }`. Una barra propia no lee esa opción sola, así
     que se mira acá; ver `navigation/pestanasOcultas.ts`. Va después de los hooks a propósito. */
  if (ocultaPorLaPantalla) {
    return null;
  }

  const centerSize = rs(46);
  const iconSize = rs(20);
  const maxBarWidth = isTablet ? 480 : undefined;

  return (
    /* BUG (2026-09-04): en modo oscuro esta barra se veía BLANCA. `c.cardBg` es translúcido en la
       paleta oscura (`rgba(255,255,255,0.04)`): está pensado para apoyarse sobre `c.bg` y dar una
       tarjeta apenas más clara. Pero la TabBar la dibuja el navegador FUERA del `SafeAreaView` de
       la pantalla, así que detrás no había fondo del tema sino la vista raíz de React Native, que
       es BLANCA por defecto — y 4% de blanco sobre blanco da blanco puro. Por eso también el aro
       del botón central salía blanco.
       Arreglo: se pinta `c.bg` opaco de base y `c.cardBg` como capa encima, reproduciendo
       exactamente la composición "tarjeta sobre página" que el token asume. En modo claro no
       cambia nada visible (`bg` #FCFBF9 y `cardBg` #FDFCFA son opacos y casi idénticos). */
    <View testID="caja-de-la-barra" style={[{ backgroundColor: c.bg }, caja]}>
      <Animated.View
        onLayout={medir}
        pointerEvents={escondidaEnJs ? 'none' : 'auto'}
        importantForAccessibility={escondidaEnJs ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={escondidaEnJs}
        style={[styles.barOuter, pegadaAlFondo, { backgroundColor: c.bg, borderTopColor: c.divider, paddingBottom: Math.max(insets.bottom, 14) }, estiloDeLaBarra]}
      >
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.cardBg }]} />
        <View style={[styles.bar, { maxWidth: maxBarWidth, alignSelf: 'center', width: '100%' }]}>
          {state.routes.map((route, i) => {
            const focused = state.index === i;
            const isCenter = route.name === 'Training';
            const onPress = () => navigation.navigate(route.name);

            if (isCenter) {
              return (
                <Pressable key={route.key} onPress={onPress} style={styles.item} hitSlop={8}
                accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={LABELS[route.name]}>
                  {/* `c.bg` y no `c.cardBg`: el aro es opaco a propósito (mismo bug de arriba) y
                      además separa el círculo tanto de la barra como del contenido de la pantalla,
                      contra el que también se recorta por el `marginTop` negativo. */}
                  <View style={[styles.centerWrap, { shadowColor: c.gold, borderColor: c.bg }]}>
                    <LinearGradient
                      colors={c.goldGrad}
                      start={{ x: 0.2, y: 0 }}
                      end={{ x: 0.8, y: 1 }}
                      style={[styles.center, { width: centerSize, height: centerSize, borderRadius: centerSize / 2 }]}
                    >
                      <Icon name={ICONS[route.name]} size={rs(18)} color={c.onGold} />
                    </LinearGradient>
                  </View>
                  <Text style={[t.tab, { color: focused ? c.goldInk : c.tabInactive }]} numberOfLines={1} adjustsFontSizeToFit>
                    {LABELS[route.name]}
                  </Text>
                </Pressable>
              );
            }

            return (
              <Pressable key={route.key} onPress={onPress} style={styles.item} hitSlop={8}
                accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={LABELS[route.name]}>
                <Icon name={ICONS[route.name]} size={iconSize} color={focused ? c.goldInk : c.tabInactive} />
                <Text style={[t.tab, { color: focused ? c.goldInk : c.tabInactive }]} numberOfLines={1} adjustsFontSizeToFit>
                  {LABELS[route.name]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const sinSuscripcion = () => () => undefined;

/** Cuánto asoma el botón de TRAINING por encima de la barra (`marginTop` −22 más el aro de 6). */
const SOBRESALE = 30;

const styles = StyleSheet.create({
  /* 10 y no 14: con cinco pestanas, cada 4px de padding le quita ~0.8px de ancho util a
     cada etiqueta, y "COMUNIDAD" es la que va justa. */
  barOuter: { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 10 },
  /* Al fondo de la caja: cuando la caja se achica, la barra no se corre, solo la tapa el
     deslizamiento (`transform`). */
  pegadaAlFondo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: { flexDirection: 'row', alignItems: 'flex-end' },
  /* 48px minimos de zona pulsable por pestana (AGENTS.md 4); antes el alto lo definia el
     contenido (icono 20 + gap + etiqueta) y se quedaba en ~38. */
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, gap: 7 },
  centerWrap: { marginTop: -22, borderRadius: 29, borderWidth: 6, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  center: { alignItems: 'center', justifyContent: 'center' },
});