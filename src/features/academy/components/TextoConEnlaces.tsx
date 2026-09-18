import React from 'react';
import { Linking, Text, type TextStyle, type StyleProp } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { useTheme } from '../../../theme/ThemeContext';
import { partirEnEnlaces } from '../utils/enlacesEnTexto';

/**
 * Un párrafo en el que los enlaces se pueden tocar.
 *
 * **Por qué existe.** El cuerpo de una lección se pintaba con un `<Text>` a secas, así que un
 * `https://forms.gle/…` se veía pero no se podía abrir: había que seleccionarlo a mano dentro del
 * párrafo y copiarlo, que en un teléfono es casi imposible. Reportado por el dueño el 2026-09-18
 * sobre una lección que pide llenar un formulario de Google.
 *
 * **Se mantiene como UN solo `<Text>`.** Los enlaces son `<Text>` anidados, no componentes aparte:
 * así el párrafo sigue fluyendo y cortando líneas como antes. Envolver cada enlace en un `Pressable`
 * lo sacaría del flujo del texto y lo dejaría en su propio renglón.
 *
 * Qué se considera enlace —y qué no— lo decide `partirEnEnlaces`, que solo reconoce `http` y
 * `https` a propósito: `Linking.openURL` abre lo que le den, y el texto viene del servidor.
 */
export function TextoConEnlaces({
  texto,
  style,
}: {
  texto: string;
  style?: StyleProp<TextStyle>;
}) {
  const { c } = useTheme();
  const segmentos = partirEnEnlaces(texto);

  const abrir = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // No se ofrece "copiar" como alternativa: si el sistema no pudo abrirlo, lo más probable es
      // que no haya navegador o que el enlace esté roto, y ninguna de las dos se arregla copiando.
      Alert.alert('No se pudo abrir el enlace', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  return (
    <Text style={style}>
      {segmentos.map((segmento, indice) =>
        segmento.tipo === 'enlace' ? (
          <Text
            key={`${indice}-${segmento.url}`}
            onPress={() => void abrir(segmento.url)}
            accessibilityRole="link"
            accessibilityLabel={`Abrir ${segmento.url}`}
            style={{ color: c.goldInk, textDecorationLine: 'underline' }}
          >
            {segmento.valor}
          </Text>
        ) : (
          // La clave es el índice a propósito: los segmentos de un texto no se reordenan ni se
          // insertan en el medio, así que la posición ES su identidad estable.
          <Text key={indice}>{segmento.valor}</Text>
        )
      )}
    </Text>
  );
}
