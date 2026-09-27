import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { Ocurrencia } from '../types/eventos.types';
import { fechaYHora } from '../utils/textosDeFecha';
import { linkParaUnirme, nombreDelLink } from '../utils/linkDelEvento';

/**
 * Piezas chicas de la sección Eventos, pensadas para quien tiene de 30 a 60 años (spec §0.4): letra
 * de 16 px o más, filas de 64 px, palabras simples. Los botones son los de `components/Legible.tsx`.
 */

export const LETRA = { cuerpo: 16, titulo: 18, grande: 22 } as const;

/** Un texto de cuerpo, a 16 px. */
export function Parrafo({ children, tono = 'suave' }: { children: React.ReactNode; tono?: 'suave' | 'fuerte' | 'peligro' | 'bien' }) {
  const { c } = useTheme();
  const color = { suave: c.textSoft, fuerte: c.textStrong, peligro: c.danger, bien: c.success }[tono];
  return <Text style={[estilos.parrafo, { color }]}>{children}</Text>;
}

/** «← Volver a Eventos», con 48 px de alto para el pulgar. */
export function BotonVolver({ etiqueta, onPress }: { etiqueta: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={8}
      style={({ pressed }) => [estilos.volver, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Icon name="arrowLeft" size={18} color={c.goldInk} />
      <Text style={[estilos.volverTexto, { color: c.goldInk }]}>{etiqueta}</Text>
    </Pressable>
  );
}

/** Un campo de texto con su rótulo a 16 px (el `FormField` de la app usa rótulos de 10,5 px). */
export function CampoDeTexto({
  rotulo,
  ayuda,
  ...props
}: TextInputProps & { rotulo: string; ayuda?: string | null }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[estilos.rotulo, { color: c.textStrong }]}>{rotulo}</Text>
      {ayuda ? <Text style={[estilos.parrafo, { color: c.textSoft }]}>{ayuda}</Text> : null}
      <TextInput
        placeholderTextColor={c.tabInactive}
        accessibilityLabel={rotulo}
        {...props}
        style={[
          estilos.entrada,
          { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt, color: c.textStrong },
          props.multiline ? { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 } : null,
        ]}
      />
    </View>
  );
}

/** «Vas» / «No vas», en palabras y con color. Sin respuesta no dice nada. */
export function EtiquetaAsistencia({ oc }: { oc: Ocurrencia }) {
  const { c } = useTheme();
  if (oc.asistencia !== 'GOING' && oc.asistencia !== 'NOT_GOING') return null;
  const vas = oc.asistencia === 'GOING';
  return (
    <View style={[estilos.etiqueta, { backgroundColor: vas ? c.successWash : c.dangerWash }]}>
      <Text style={[estilos.etiquetaTexto, { color: vas ? c.success : c.danger }]}>{vas ? 'Vas' : 'No vas'}</Text>
    </View>
  );
}

/** Una fila de la lista: fecha y hora, nombre, dónde, y si vas. Toda la fila abre el detalle. */
export function TarjetaEvento({ oc, onPress }: { oc: Ocurrencia; onPress: () => void }) {
  const { c } = useTheme();
  const link = linkParaUnirme(oc.evento);
  const donde = link ? nombreDelLink(link) : oc.evento.tipoUbicacion === 'ADDRESS' ? oc.evento.valorUbicacion : null;
  const cuando = fechaYHora(oc.iniciaEn, oc.evento.zona);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${oc.titulo}. ${cuando}.${donde ? ` ${donde}.` : ''} Ver el detalle.`}
      style={({ pressed }) => [
        estilos.tarjeta,
        { borderColor: c.border, backgroundColor: pressed ? c.goldWash : c.cardBg },
      ]}
    >
      <View style={[estilos.icono, { backgroundColor: c.goldWash }]}>
        <Icon name="calendar" size={20} color={c.goldInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={[estilos.cuando, { color: c.goldInk }]}>{cuando}</Text>
        <Text style={[estilos.tituloTarjeta, { color: c.textStrong }]} numberOfLines={2}>
          {oc.titulo}
        </Text>
        {donde ? (
          <Text style={[estilos.parrafo, { color: c.textSoft }]} numberOfLines={1}>
            {donde}
          </Text>
        ) : null}
        <EtiquetaAsistencia oc={oc} />
      </View>
      <Icon name="chevron" size={16} color={c.chevron} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  parrafo: { fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo, lineHeight: 23 },
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, alignSelf: 'flex-start' },
  volverTexto: { fontFamily: 'Jost_500Medium', fontSize: LETRA.cuerpo },
  entrada: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: 'Jost_400Regular',
    fontSize: 17,
  },
  etiqueta: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 2 },
  etiquetaTexto: { fontFamily: 'Jost_700Bold', fontSize: 16 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cuando: { fontFamily: 'Jost_500Medium', fontSize: LETRA.cuerpo, lineHeight: 21 },
  tituloTarjeta: { fontFamily: 'Jost_500Medium', fontSize: LETRA.titulo, lineHeight: 24 },
});
