import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AvatarPersona } from '../../../components/ui';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { RotuloDeFormacion } from '../../formaciones/components/RotuloDeFormacion';
import type { Testimonio } from '../api/testimoniosApi';

/**
 * Un testimonio de la Comunidad (spec 024): la persona (foto o iniciales, nombre y rol), lo que dijo y, si Administración lo
 * calificó, sus estrellas. Solo lectura. Cuando quien mira ve todas las formaciones y lee «Todas», lleva el rótulo de su formación
 * (`RotuloDeFormacion`); para las demás cuentas no dibuja nada de eso.
 *
 * Las estrellas llevan su cifra en palabras para el lector de pantalla y en la vista no dependen solo del color (están llenas o
 * vacías de línea).
 */
export function TarjetaDeTestimonio({ testimonio }: { testimonio: Testimonio }) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <RotuloDeFormacion formation={testimonio.formacion} />
      <View style={estilos.encabezado}>
        <AvatarPersona nombre={testimonio.nombre} avatarUrl={testimonio.avatarUrl} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>
            {testimonio.nombre}
          </Text>
          {testimonio.rol ? (
            <Text numberOfLines={1} style={[t.small, { color: c.textSoft }]}>
              {testimonio.rol}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 24 }]}>{testimonio.texto}</Text>
      {testimonio.estrellas ? (
        <View
          accessible
          accessibilityLabel={`${testimonio.estrellas} de 5 estrellas`}
          style={estilos.estrellas}
        >
          {[1, 2, 3, 4, 5].map(n => (
            <Icon
              key={n}
              name="star"
              size={TAMANO_ICONO.chico}
              color={n <= (testimonio.estrellas ?? 0) ? c.goldInk : c.textSoft}
            />
          ))}
          <Text style={[t.small, { color: c.textSoft, fontFamily: fuentes.media, marginLeft: 6 }]}>{testimonio.estrellas}/5</Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  estrellas: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
