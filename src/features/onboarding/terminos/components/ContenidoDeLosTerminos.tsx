import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../../components/Icon';
import { fuentes } from '../../../../theme/fuentes';
import { useTheme } from '../../../../theme/ThemeContext';

/**
 * Las cláusulas de unos términos tal como las ve la persona (spec 027): la introducción en su recuadro dorado y cada cláusula numerada «01, 02…» por su
 * posición. Es lo MISMO que dibujaba la pantalla de Términos del onboarding (cero cambios visibles, SC-006), ahora para cualquier texto: el onboarding, la
 * aceptación de una versión nueva, la vista previa de Administración, el historial y «releer lo que acepté».
 */
export function ContenidoDeLosTerminos({ introduccion, clausulas }: { introduccion: string; clausulas: readonly string[] }) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      {introduccion.trim() !== '' ? (
        <View style={[estilos.preambulo, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
          <Icon name="diamond" size={16} color={c.goldInk} />
          <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.media, flex: 1, fontSize: 14, lineHeight: 21 }]}>{introduccion}</Text>
        </View>
      ) : null}
      <View style={estilos.lista}>
        {clausulas.map((texto, i) => (
          <View key={`${i}-${texto.slice(0, 12)}`} style={estilos.fila}>
            <View style={[estilos.numero, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontSize: 10, fontFamily: fuentes.negrita }]}>{i + 1 < 10 ? `0${i + 1}` : i + 1}</Text>
            </View>
            <Text style={[t.body, estilos.texto, { color: c.text, fontSize: 14, lineHeight: 22 }]}>{texto}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  preambulo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  lista: { gap: 14 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  numero: { width: 26, height: 22, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  texto: { flex: 1 },
});
