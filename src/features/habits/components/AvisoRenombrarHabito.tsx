import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aparicion } from '../../../components/Aparicion';
import { Icon } from '../../../components/Icon';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * El aviso que ofrece cambiarle el nombre a una bebida. Discreto, y **fuera de la conversación**.
 *
 * ## Por qué no es un mensaje del chat
 *
 * Porque no hay que conversarlo: es una decisión de dos botones, y meterla en el hilo del
 * acompañante la convierte en algo que hay que leer, contestar y después buscar de nuevo. Acá se
 * lee de un vistazo y se resuelve con un toque.
 *
 * ## Por qué NO es un `Modal`
 *
 * Un modal —aunque sea transparente— se come todos los toques de la pantalla de abajo. Esto es
 * una sola vista absoluta del tamaño de la tarjeta, la misma técnica que documenta
 * `RenasiaLauncher`: lo que queda fuera del recuadro sigue siendo de la pantalla. Se puede seguir
 * usando la app con el aviso puesto, que es exactamente lo pedido.
 *
 * ## Dónde se ubica, y por qué ahí
 *
 * Abajo, **por encima de las tres cosas que ya viven ahí**: la barra de pestañas, el botón
 * flotante del acompañante (derecha) y la burbuja del arranque guiado (izquierda). Arriba no, por
 * una razón concreta: casi todas las pantallas tienen un `ScreenHeader` con un botón a la derecha,
 * y un aviso pegado al borde superior lo taparía.
 *
 * ## Translúcido sin inventar un color
 *
 * La paleta no tiene una superficie semitransparente que funcione en los dos temas. En vez de
 * agregar un color nuevo, el fondo es `c.cardBg` **en una capa aparte con opacidad**: el texto
 * queda a opacidad plena y legible, y el fondo deja entrever lo que hay debajo. Cero valores de
 * color propios — todo sale de `theme/tokens.ts`.
 *
 * ## Las tres salidas cuentan igual
 *
 * Aceptar, "ahora no" y la ✕ llaman a lo mismo del lado de "ya respondió". Cerrar sin hacer nada
 * ES una respuesta: la persona vio el ofrecimiento y siguió de largo, y volver a preguntarle
 * mañana sería no haber escuchado.
 */

interface AvisoRenombrarHabitoProps {
  /** El nombre del hábito tal como lo trae el catálogo. Se muestra como rótulo, no dentro de la frase. */
  tituloHabito: string;
  onAceptar: () => void;
  onAhoraNo: () => void;
  /** La ✕. Cuenta como "ahora no", pero se separa para que el llamador pueda distinguirlos. */
  onCerrar: () => void;
}

export function AvisoRenombrarHabito({
  tituloHabito,
  onAceptar,
  onAhoraNo,
  onCerrar,
}: AvisoRenombrarHabitoProps) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useResponsive();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.posicion,
        {
          left: horizontalPadding,
          right: horizontalPadding,
          bottom: insets.bottom + ALTO_TAB_BAR + SEPARACION + ALTO_FLOTANTES + SEPARACION,
        },
      ]}
    >
      <Aparicion desplazamiento={12}>
        <View
          accessibilityLabel={`Puedes cambiarle el nombre a ${tituloHabito}`}
          style={[styles.tarjeta, { borderColor: c.borderStrong }]}
        >
          {/* Capa de fondo, aparte del contenido: la opacidad vive acá para que el texto de
              arriba no se atenúe con ella. */}
          <View style={[StyleSheet.absoluteFill, styles.fondo, { backgroundColor: c.cardBg }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.goldWash }]} />

          <View style={styles.fila}>
            <View style={styles.texto}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]} numberOfLines={1}>
                {tituloHabito}
              </Text>
              <Text style={[t.small, { color: c.text, marginTop: 3 }]}>
                Si no te cae bien, puedes ponerle el nombre que sí vayas a hacer.
              </Text>
            </View>
            <Pressable
              onPress={onCerrar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar el aviso"
              hitSlop={12}
              style={styles.cerrar}
            >
              <Icon name="close" size={13} color={c.textSoft} />
            </Pressable>
          </View>

          {/* `flexWrap` porque en un teléfono de 360 px las dos acciones pueden no entrar en una
              línea junto al texto (AGENTS.md §2, cero desbordamientos). */}
          <View style={styles.acciones}>
            <Pressable
              onPress={onAceptar}
              accessibilityRole="button"
              accessibilityLabel={`Cambiarle el nombre a ${tituloHabito}`}
              style={[styles.accion, { backgroundColor: c.gold }]}
            >
              <Text style={[t.micro, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>
                CAMBIARLE EL NOMBRE
              </Text>
            </Pressable>
            <Pressable
              onPress={onAhoraNo}
              accessibilityRole="button"
              accessibilityLabel="Dejarlo como está"
              style={[styles.accion, { borderColor: c.border, borderWidth: 1 }]}
            >
              <Text style={[t.micro, { color: c.textSoft, fontFamily: 'Jost_500Medium' }]}>
                ASÍ ESTÁ BIEN
              </Text>
            </Pressable>
          </View>
        </View>
      </Aparicion>
    </View>
  );
}

/** Mismos números que `RenasiaLauncher` y `SparkieOverlay`: el aviso no puede montarse sobre ellos. */
const ALTO_TAB_BAR = 62;
const SEPARACION = 16;
/** Alto del botón flotante del acompañante y de la burbuja del arranque, que comparten esa franja. */
const ALTO_FLOTANTES = 52;

const styles = StyleSheet.create({
  posicion: { position: 'absolute' },
  tarjeta: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  /** La translucidez: el fondo al 92 %, el contenido al 100 %. */
  fondo: { opacity: 0.92 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  texto: { flex: 1, flexShrink: 1 },
  cerrar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  /** 44 px: pulsación cómoda sin que el aviso se vuelva una tarjeta grande (AGENTS.md §4). */
  accion: {
    minHeight: 44,
    flexGrow: 1,
    flexShrink: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
