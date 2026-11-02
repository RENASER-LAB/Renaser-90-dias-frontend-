import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { dichoDeLaMedicion, medicionDeLaFichaDe, textosDeLaMedicion, type MedicionDeLaFicha } from '../utils/medicionDeLaFicha';

/**
 * Los km de un día en las fichas del acompañamiento (spec 037, D-310; maqueta 4.1): «5,9 km · Medido por el reloj», los pasos y la
 * distancia, la fuente con la hora de la lectura, y «Por revisar» si el servidor dejó dudosa la lectura. Solo lectura y de 16 px.
 * Lo comparten la ficha del mentor, la del líder y la de Administración.
 */
export function LineaDeLaMedicion({ medicion }: { medicion: MedicionDeLaFicha }) {
  const { c, t } = useTheme();
  const textos = textosDeLaMedicion(medicion);
  return (
    <View accessible accessibilityLabel={dichoDeLaMedicion(medicion)} style={estilos.contenedor}>
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media, fontVariant: ['tabular-nums'] }]}>
        {textos.principal}
      </Text>
      {textos.detalle ? <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{textos.detalle}</Text> : null}
      {textos.fuente ? <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{textos.fuente}</Text> : null}
      {textos.porRevisar ? (
        <View style={[estilos.etiqueta, { borderColor: c.danger, backgroundColor: c.dangerWash }]}>
          <Icon name="info" size={TAMANO_ICONO.chico} color={c.danger} />
          <Text style={[t.small, { color: c.danger, fontFamily: fuentes.negrita }]}>Por revisar</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Lo mismo desde lo que llegó del servidor sin normalizar (la ficha del mentor): un valor roto no dibuja nada. */
export function LineaDeLaMedicionCruda({ crudo }: { crudo: unknown }) {
  const medicion = medicionDeLaFichaDe(crudo);
  return medicion ? <LineaDeLaMedicion medicion={medicion} /> : null;
}

const estilos = StyleSheet.create({
  contenedor: { gap: 2 },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
});
