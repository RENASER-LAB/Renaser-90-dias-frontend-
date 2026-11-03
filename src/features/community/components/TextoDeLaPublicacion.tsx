import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type NativeSyntheticEvent, type TextLayoutEventData } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import {
  LINEAS_QUE_SE_VEN,
  claveDeLaMedida,
  hayMasQueVer,
  seMideElTexto,
  type MedidaDelTexto,
} from '../utils/medidaDelTextoDelMuro';

/**
 * El texto de una publicación del Muro: tres líneas y, si hay más, «Ver más...» (E2E del 03/11, issue #115).
 *
 * «Ver más...» salía solo si el texto pasaba de 120 caracteres. Con letra grande, 102 caracteres ocupan cuatro líneas y se cortaban en tres sin
 * ninguna salida. Ahora lo decide lo que de verdad se dibuja: un `Text` invisible, del mismo ancho y con la misma letra, SIN tope de líneas, dice
 * cuántas líneas ocupa el texto entero (`onTextLayout`); si pasan de tres, hay «Ver más...». El visible lleva su `numberOfLines={3}` aparte (en Android
 * un `Text` con tope solo cuenta las líneas que muestra, y por eso no sirve para medir).
 *
 * Sin parpadeo: mientras no se midió, se parte de la regla de antes (más de 120 caracteres) para que el botón no aparezca de golpe en los textos
 * largos; el medidor se mide UNA vez por texto, ancho y tamaño de letra, y después se desmonta.
 */
export function TextoDeLaPublicacion({
  texto,
  expandida,
  onAlternar,
}: {
  texto: string;
  expandida: boolean;
  onAlternar: () => void;
}) {
  const { c, t } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const clave = claveDeLaMedida(texto, width, fontScale);
  const [medida, setMedida] = useState<MedidaDelTexto | null>(null);
  const hayMas = hayMasQueVer(texto, medida, clave);

  return (
    <View style={estilos.contenedor}>
      <Text numberOfLines={expandida ? undefined : LINEAS_QUE_SE_VEN} style={[t.body, { color: c.text }]}>
        {texto}
      </Text>
      {seMideElTexto(texto, medida, clave) ? (
        // Invisible y fuera del flujo: no ocupa lugar, no recibe toques ni lo lee el lector de pantalla.
        <Text
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[t.body, estilos.medidor]}
          onTextLayout={(e: NativeSyntheticEvent<TextLayoutEventData>) => setMedida({ clave, lineas: e.nativeEvent.lines.length })}
        >
          {texto}
        </Text>
      ) : null}
      {hayMas ? (
        <Pressable onPress={onAlternar} style={estilos.verMas}>
          <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.negrita }]}>{expandida ? 'Ver menos' : 'Ver más...'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginTop: 8 },
  medidor: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  verMas: { minHeight: 48, justifyContent: 'center' },
});
