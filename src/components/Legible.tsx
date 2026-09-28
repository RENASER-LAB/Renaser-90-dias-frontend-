import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import { Icon, type IconName } from './Icon';

/**
 * Piezas de lectura cómoda para las vistas de mentoría y administración (retroalimentación del
 * 26/09, A-1: quienes las usan tienen de 30 a 60 años).
 *
 * - Letra de 16 px o más en todo lo que se lee; nada en versalitas de 10 px.
 * - Botones de 52 px de alto: se tocan con el pulgar sin apuntar.
 * - Una acción principal RELLENA por pantalla; lo destructivo es un botón con borde rojo, nunca un
 *   texto rojo suelto, y siempre pasa por una confirmación (eso lo hace quien lo usa).
 *
 * No reemplazan a `MicroLabel` ni a `GoldButton` en el resto de la app: los cinco tabs principales
 * no se tocan (AGENTS.md §1).
 */

/** Título de una sección, en palabras normales (no en mayúsculas espaciadas). */
export function TituloDeSeccion({ children, detalle }: { children: React.ReactNode; detalle?: string | null }) {
  const { c } = useTheme();
  return (
    <>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
        {children}
      </Text>
      {detalle ? <Text style={[estilos.detalle, { color: c.textSoft }]}>{detalle}</Text> : null}
    </>
  );
}

/**
 * Una sección que arranca plegada: el título es un botón de 56 px y al tocarlo se abre. Para lo que
 * es detalle y no decisión (26/09, S-2: la semana de lunes a domingo de un aprendiz, debajo de su
 * semáforo).
 */
export function SeccionPlegable({
  titulo,
  detalle,
  abiertaAlEmpezar = false,
  children,
}: {
  titulo: string;
  /** Una línea bajo el título, visible también plegada. */
  detalle?: string | null;
  abiertaAlEmpezar?: boolean;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  const [abierta, setAbierta] = useState(abiertaAlEmpezar);
  return (
    <View style={[estilos.plegable, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Pressable
        onPress={() => setAbierta(a => !a)}
        accessibilityRole="button"
        accessibilityLabel={titulo}
        accessibilityState={{ expanded: abierta }}
        accessibilityHint={abierta ? 'Toca para plegar' : 'Toca para ver el detalle'}
        style={({ pressed }) => [estilos.cabeceraPlegable, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[estilos.titulo, { color: c.textStrong }]}>{titulo}</Text>
          {detalle ? <Text style={[estilos.detalle, { color: c.textSoft }]}>{detalle}</Text> : null}
        </View>
        <View style={{ transform: [{ rotate: abierta ? '270deg' : '90deg' }] }}>
          <Icon name="chevron" size={18} color={c.chevron} />
        </View>
      </Pressable>
      {abierta ? <View style={estilos.cuerpoPlegable}>{children}</View> : null}
    </View>
  );
}

interface PropsBoton {
  etiqueta: string;
  onPress: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
  icono?: IconName;
  /** Lo que oye el lector de pantalla, si tiene que decir más que la etiqueta. */
  accessibilityLabel?: string;
  testID?: string;
  estilo?: ViewStyle;
}

/** La acción principal de la pantalla: rellena, dorada, 52 px. */
export function BotonPrincipal(props: PropsBoton) {
  const { c } = useTheme();
  return <BotonBase {...props} fondo={c.gold} borde={c.gold} tinta={c.onGold} />;
}

/** Una acción secundaria: con borde, sin relleno. */
export function BotonSecundario(props: PropsBoton) {
  const { c } = useTheme();
  return <BotonBase {...props} fondo={c.cardBg} borde={c.borderStrong} tinta={c.textStrong} />;
}

/** Una acción que quita o borra algo. Siempre detrás de una confirmación. */
export function BotonPeligro(props: PropsBoton) {
  const { c } = useTheme();
  return <BotonBase {...props} fondo={c.cardBg} borde={c.danger} tinta={c.danger} />;
}

function BotonBase({
  etiqueta,
  onPress,
  cargando = false,
  deshabilitado = false,
  icono,
  accessibilityLabel,
  testID,
  estilo,
  fondo,
  borde,
  tinta,
}: PropsBoton & { fondo: string; borde: string; tinta: string }) {
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? etiqueta}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: fondo, borderColor: borde, opacity: inactivo ? 0.6 : pressed ? 0.85 : 1 },
        estilo,
      ]}
    >
      {cargando ? <ActivityIndicator color={tinta} size="small" /> : null}
      {!cargando && icono ? <Icon name={icono} size={18} color={tinta} /> : null}
      <Text style={[estilos.etiqueta, { color: tinta }]}>{etiqueta}</Text>
    </Pressable>
  );
}

/**
 * Un padding horizontal mínimo, pero distinto de cero, en todo texto de estas piezas (E-419).
 *
 * En Android con Fabric (RN 0.86), los `TextView` se reciclan (`enableViewRecyclingForText`) y
 * `ReactTextView.recycleView()` no le borra el padding. Al insertar un `Text` nuevo,
 * `FabricMountingManager.cpp` solo manda su padding si es distinto de cero
 * (`contentInsets != EdgeInsets::ZERO`). Entonces un texto SIN padding que recibe la vista de uno CON
 * padding (una pastilla, un chip) se queda con ese padding viejo: la caja mide lo justo para la
 * etiqueta, el área útil es más angosta, el texto se parte en dos renglones y el segundo queda
 * recortado. Pasaba con «Ya la recibí» → «Ya la» cuando la pantalla ya abierta pasaba a «En camino»
 * al volver de otra pestaña (las vistas de la otra pestaña quedan en el pozo de reciclado).
 *
 * Con 1 px de padding horizontal el padding siempre viaja al montar y pisa el que haya quedado. El
 * texto mide 2 px más: no se nota.
 */
const PADDING_QUE_PISA_EL_RECICLADO = { paddingHorizontal: 1 } as const;

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24, ...PADDING_QUE_PISA_EL_RECICLADO },
  detalle: { fontFamily: 'Jost_400Regular', fontSize: 16, lineHeight: 23, marginTop: 2, ...PADDING_QUE_PISA_EL_RECICLADO },
  boton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  plegable: { borderWidth: 1, borderRadius: 16 },
  cabeceraPlegable: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  cuerpoPlegable: { paddingHorizontal: 16, paddingBottom: 16 },
  etiqueta: {
    fontFamily: 'Jost_500Medium',
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'center',
    flexShrink: 1,
    ...PADDING_QUE_PISA_EL_RECICLADO,
  },
});
