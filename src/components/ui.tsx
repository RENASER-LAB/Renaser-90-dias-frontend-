import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Icon, IconName, TAMANO_ICONO } from './Icon';
import { inicialesDe } from '../utils/iniciales';

/**
 * Avatar de una persona: su foto si la tiene, o sus iniciales sobre un círculo si no.
 *
 * Reemplaza al `Placeholder` gris en las listas de gente (tribu, mentor). Antes, aunque los
 * integrantes fueran reales, se veían como círculos vacíos y parecía que no había datos.
 */
export function AvatarPersona({
  nombre,
  avatarUrl,
  size,
  style,
}: {
  nombre?: string | null;
  avatarUrl?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const dim = { width: size, height: size, borderRadius: size / 2 } as const;
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[dim, style] as StyleProp<ImageStyle>} />;
  }
  return (
    <View
      style={[
        dim,
        { backgroundColor: c.cardBgAlt, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
      accessibilityLabel={nombre ?? undefined}
    >
      <Text style={{ fontFamily: 'Jost_700Bold', color: c.goldInk, fontSize: Math.max(11, Math.round(size * 0.38)) }}>
        {inicialesDe(nombre)}
      </Text>
    </View>
  );
}

/**
 * El rótulo de sección de toda la app («Hábitos de hoy», «Fase actual», «Directos», el rótulo de un
 * campo…): 13 px, `Jost_700Bold`, sin espaciar, como «Coherencia» y «Racha» de Hoy.
 *
 * > **Corregido 2026-10-05 (decisión del dueño).** Era `t.micro`: 10,5 px, `Jost_500Medium` y
 * > `letterSpacing: 1.1`. El espaciado estaba pensado para versalitas, pero desde el rediseño los
 * > rótulos van en tipo oración, y en minúsculas ese aire se lee «H á b i t o s». La jerarquía la
 * > marcan el peso y el color, no las letras separadas (AGENTS.md §4). El token `t.micro` no cambió:
 * > lo siguen usando a mano otras etiquetas que todavía van en versales.
 */
const ESTILO_DEL_ROTULO = { fontFamily: 'Jost_700Bold', letterSpacing: 0 } as const;

export function MicroLabel({ children }: { children: React.ReactNode }) {
  const { c, t } = useTheme();
  return <Text style={[t.small, ESTILO_DEL_ROTULO, { color: c.micro }]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <View style={[{ borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.cardBg, padding: 17 }, style]}>
      {children}
    </View>
  );
}

/**
 * Cabecera de pantalla: el título grande ("HOY", "PLAN", "YO"…) más el interruptor de tema y el
 * icono de la derecha.
 *
 * > **Corregido 2026-09-14.** El margen lateral estaba clavado en `paddingHorizontal: 30` dentro
 * > de `styles.header`, mientras que el `ScrollView` de cada una de las cinco pantallas que usan
 * > esta cabecera aplica el margen responsive de `useResponsive()` (14 / 18 / 20 / 32 según el
 * > ancho, AGENTS.md §2). En un teléfono estándar de 360–440 px el contenido va a 18 y el título
 * > iba a 30: el dueño del producto lo vio en el emulador como "HOY" metido 12 px más adentro que
 * > "EL CICLO ALQUÍMICO" y "DÍA 12 DE 90". Ningún ancho daba 30, así que el título nunca estuvo
 * > alineado con lo de abajo en ninguna pantalla ni en ningún dispositivo.
 * >
 * > Ahora el margen sale de la misma fuente que el del contenido, así que se mueven juntos y no
 * > hay dos criterios que mantener sincronizados a mano.
 */
/**
 * La cabecera de cada pantalla.
 *
 * **Sin el botón de luna/sol (2026-09-18, decisión del dueño).** Estaba acá, así que aparecía en
 * TODAS las pantallas: un interruptor de apariencia compitiendo por la vista con el título y con la
 * acción propia de cada pantalla. Desde que el modo oscuro es una fila de preferencias en **Yo**
 * —donde uno va a cambiar ajustes— tenerlo además en cada cabecera era ofrecer lo mismo dos veces,
 * y en el lugar donde menos se busca.
 *
 * No se perdió nada: `useTheme().toggle` sigue existiendo y lo usa la fila de Yo. Lo que se quitó es
 * este atajo, no la función.
 */
/*
 * **El botón de la derecha solo se dibuja si hace algo (28/09, pedido del dueño: «quitarlos si no hacen
 * nada»).** Hasta ese día la ⓘ de Comunidad, el «⋯» de Plan y de Training y la campana de Hoy se
 * dibujaban sin `onPressRight`: parecían botones y no hacían nada (E-404 y E-409 de la bitácora del
 * backend). Ahora hacen falta el ícono y la acción; sin acción no hay botón. La altura de la cabecera no
 * cambia (`minHeight` igual al botón), así que el contenido de abajo no se mueve.
 *
 * > **Corregido 2026-09-28.** La ⓘ de Comunidad volvió, ahora con acción: abre la info de tu grupo, y
 * > sin grupo no se dibuja (`features/community/utils/infoDesdeLaCabecera.ts`). Los otros tres siguen
 * > quitados.
 */
export function ScreenHeader({
  title,
  right,
  onPressRight,
  etiquetaRight,
}: {
  title: string;
  right?: IconName;
  onPressRight?: () => void;
  /** El nombre del botón para el lector de pantalla (un ícono solo no dice qué hace). */
  etiquetaRight?: string;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding } = useResponsive();
  return (
    <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
      <Text style={[t.screenTitle, { color: c.text, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
      {right && onPressRight ? (
        <View style={styles.headerActions}>
          <Pressable
            hitSlop={12}
            onPress={onPressRight}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={etiquetaRight}
          >
            {/* Los íconos de cabecera van a 24 (2026-10-05, tamaños de uso 16/20/24); los tres
                puntos de Yo se quedan como estaban. */}
            <Icon name={right} size={right === 'dots' ? 19 : TAMANO_ICONO.grande} color={right === 'dots' ? c.textSoft : c.goldInk} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function GoldCircle({ size = 52, icon = "chevron" as IconName, onPress }: { size?: number; icon?: IconName; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ borderRadius: size / 2, overflow: "hidden", width: size, height: size }}>
      <LinearGradient colors={c.goldGrad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={size * 0.3} color={c.onGold} />
      </LinearGradient>
    </Pressable>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.divider }} />;
}

export function Placeholder({ style, label }: { style?: ViewStyle; label?: string }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.placeholderA, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }, style]}>
      {/* Era 6px: ilegible. 10px es el minimo de micro-etiqueta (AGENTS.md 4); el ajuste
          automatico solo entra si la caja del placeholder es realmente diminuta. */}
      {label ? (
        <Text
          style={{ fontFamily: 'Jost_500Medium', fontSize: 10, letterSpacing: 1.2, color: c.micro }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function ListRow({ index, label, onPress }: { index?: string; label: string; onPress?: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.divider }]}>
      {index ? <Text style={[t.small, { color: c.goldInk, width: 22 }]}>{index}</Text> : null}
      <Text style={[t.body, { color: c.text, flex: 1 }]}>{label}</Text>
      <Icon name="chevron" size={12} color={c.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* Sin `paddingHorizontal`: lo pone `ScreenHeader` con el valor responsive (ver el comentario
     "Corregido 2026-09-14" ahí arriba). Si se vuelve a escribir acá un número fijo, el título se
     desalinea otra vez del contenido de la pantalla. */
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 8, minHeight: 46 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /* Caja de 44 × 44, el mínimo de un área táctil (2026-10-05, pedido del dueño: el engranaje de Yo y el
     botón de Comunidad). Era de 38, y en la web no hay `hitSlop`: el área tocable era la caja.
     El ícono sigue de 24 y en el mismo lugar: los márgenes de −3 hacen que la caja ocupe en la fila lo
     mismo que la de 38, así que la cabecera mide igual (46) con o sin botón y no se mueve nada de abajo. */
  headerBtn: { width: 44, height: 44, margin: -3, alignItems: 'center', justifyContent: 'center' },
  themeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
});
/**
 * Primitivas de LAYOUT (auditoría de estilos 2026-09-06).
 *
 * Salieron de contar: `flexDirection: 'row', alignItems: 'center', gap: N` escrito a mano 16
 * veces y `flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'` otras
 * 12, repartidos por las pantallas. No es que `StyleSheet` esté mal —es lo idiomático en React
 * Native— sino que la MISMA idea se reescribía en cada archivo y ninguna copia sabía de las
 * otras. Con una primitiva, cambiar el criterio (un `gap` por defecto, una alineación) es un
 * solo lugar.
 *
 * Por qué NO Tailwind/NativeWind: habría sido migrar 24.000 líneas de TSX en 51 archivos con
 * estilos, sin suite de pruebas visuales, en un producto que ya está en manos de usuarios. El
 * problema real no era la herramienta, era la duplicación; esto la ataca sin reescribir nada.
 *
 * `style` se aplica DESPUÉS de los defaults, así que cualquier propiedad extra (`flex: 1`,
 * `marginTop`) se pasa ahí y gana. `gap` en `undefined` es inofensivo: RN lo ignora.
 */
type AlineacionFila = 'center' | 'flex-start' | 'flex-end' | 'baseline' | 'stretch';

export function Row({
  children,
  gap,
  align = 'center',
  style,
}: {
  children?: React.ReactNode;
  gap?: number;
  align?: AlineacionFila;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap }, style]}>{children}</View>;
}

export function RowBetween({
  children,
  align = 'center',
  style,
}: {
  children?: React.ReactNode;
  align?: AlineacionFila;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: align }, style]}>
      {children}
    </View>
  );
}
