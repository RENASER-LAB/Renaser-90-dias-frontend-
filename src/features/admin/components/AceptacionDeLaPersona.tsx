import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TituloDeSeccion } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { AceptacionDeSolicitudApi } from '../api/adminSchemas';
import { textoDeLaAceptada } from '../utils/aceptarSolicitud';

/**
 * Cómo entró la persona (spec 025, US4): lo que se decidió al aceptar su solicitud —formación, duración, rol, con o sin diagnóstico—, quién la aceptó y
 * cuándo. Dice EXACTAMENTE lo mismo que la lista de «Aceptadas» (`textoDeLaAceptada`). Es la foto de ese día: lo que la persona es hoy (su formación, su
 * duración) se ve en las secciones de arriba y puede haber cambiado desde entonces. Solo lectura; sin `aceptacion` (no entró por una solicitud, o un
 * backend anterior) no se dibuja.
 */
export function AceptacionDeLaPersona({
  aceptacion,
  aceptadaPor,
  aceptadaEn,
}: {
  aceptacion: AceptacionDeSolicitudApi | null | undefined;
  aceptadaPor: string | null | undefined;
  aceptadaEn: string | null | undefined;
}) {
  const { c, t } = useTheme();
  if (!aceptacion) return null;
  const { titulo, detalle } = textoDeLaAceptada(aceptadaPor, aceptadaEn, aceptacion);
  return (
    <View
      accessible
      accessibilityLabel={`Cómo entró. ${titulo}. ${detalle ?? ''}`}
      style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}
    >
      <TituloDeSeccion>Cómo entró</TituloDeSeccion>
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23, fontFamily: fuentes.media }]}>{titulo}</Text>
      {detalle ? <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>{detalle}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, width: '100%', gap: 6 },
});
