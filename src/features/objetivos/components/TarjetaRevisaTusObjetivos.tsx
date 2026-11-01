import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * «Revisa tus objetivos de 90 días» (spec 026): va arriba de Plan mientras haya objetivos que nacieron del diagnóstico y la
 * persona todavía no confirmó. «Revisar y confirmar» abre la hoja con los objetivos (`HojaConfirmarObjetivos`); al confirmarlos
 * la tarjeta desaparece.
 *
 * Un solo esqueleto con las tarjetas de Plan (fondo y borde del tema, ícono de 16, texto de 16, botón de 52 a todo el ancho).
 * Sin animación propia: se ve de vez en cuando y no reemplaza nada que se esté usando.
 */
export function TarjetaRevisaTusObjetivos({ cantidad, alRevisar }: { cantidad: number; alRevisar: () => void }) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.tarjeta, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
      <View style={estilos.fila}>
        <Icon name="flag" size={TAMANO_ICONO.chico} color={c.goldInk} />
        <Text style={[t.small, estilos.rotulo, { color: c.goldInk }]}>
          {cantidad === 1 ? '1 objetivo por confirmar' : `${cantidad} objetivos por confirmar`}
        </Text>
      </View>
      <Text style={[t.cardTitle, estilos.titulo, { color: c.textStrong }]}>Revisa tus objetivos de 90 días</Text>
      <Text style={[t.body, estilos.linea, { color: c.textSoft }]}>
        Salieron de tu diagnóstico. Léelos, cámbialos si quieres y confírmalos: después quedan fijos.
      </Text>
      <GoldButton label="Revisar y confirmar" onPress={alRevisar} icon="chevron" style={estilos.boton} textStyle={estilos.textoDelBoton} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rotulo: { fontFamily: fuentes.negrita, fontSize: 14, letterSpacing: 0, flexShrink: 1 },
  titulo: { fontSize: 18, lineHeight: 25, fontFamily: fuentes.negrita, marginTop: 10 },
  linea: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  boton: { marginTop: 16, alignSelf: 'stretch' },
  /** El botón de siempre trae versalitas espaciadas de 11 px: acá es una frase en tipo oración de 16. */
  textoDelBoton: { fontSize: 16, letterSpacing: 0 },
});
