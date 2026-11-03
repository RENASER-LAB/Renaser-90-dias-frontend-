import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import {
  kmConUnidad,
  TEXTOS_DE_PASOS,
  textoDeLaMeta,
  textoDeLaMetaLista,
} from '../utils/textosDePasos';
import { porcentajeDeLaBarra, type VistaDeKilometros } from '../utils/vistaDeKilometros';

/**
 * Lo que va bajo el nombre de «Kilómetros diarios» en la lista de Training (spec 037, D-310). Una línea quieta, sin
 * animación: la barra cambia pocas veces al día y lo que cambia tiene que leerse en el acto.
 *
 * - sin conectar: el enlace «Cuenta tus pasos solo ›» (48 de alto);
 * - con los pasos: la barra y «3,2 de 5 km» con la fuente; con la meta alcanzada, «5,4 km · ¡Meta lista!»;
 * - sin pasos hoy o sin permiso: lo que pasa y, si cabe, «Actualizar»;
 * - ya cumplido: «5,4 km».
 *
 * La fila de siempre (la captura) no lleva nada de esto: `modo: 'captura'` no dibuja nada.
 */
export function LineaDeKilometros({
  vista,
  onConectar,
  onActualizar,
}: {
  vista: VistaDeKilometros;
  onConectar: () => void;
  onActualizar: () => void;
}) {
  const { c, t } = useTheme();

  if (vista.modo === 'captura') return null;

  if (vista.modo === 'ofrecer') {
    return (
      <View style={estilos.contenedor}>
        <Presionable
          onPress={onConectar}
          accessibilityRole="button"
          accessibilityLabel={TEXTOS_DE_PASOS.enlaceParaConectar}
          style={estilos.enlace}
        >
          <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.seminegrita, fontSize: 14 }]}>
            {TEXTOS_DE_PASOS.enlaceParaConectar}
          </Text>
          <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.goldInk} />
        </Presionable>
      </View>
    );
  }

  if (vista.modo === 'cumplido') {
    return (
      <View style={estilos.contenedor}>
        <Text style={[t.small, { color: c.textSoft, fontVariant: ['tabular-nums'] }]}>{kmConUnidad(vista.km)}</Text>
      </View>
    );
  }

  if (vista.modo === 'sin-permiso') {
    return (
      <View style={estilos.contenedor}>
        <Text style={[t.small, { color: c.textSoft }]}>{TEXTOS_DE_PASOS.perdimosTusPasos}</Text>
      </View>
    );
  }

  if (vista.modo === 'sin-datos') {
    return (
      <View style={[estilos.contenedor, estilos.fila]}>
        <Text style={[t.small, { color: c.textSoft, flexShrink: 1 }]}>{TEXTOS_DE_PASOS.sinPasosHoy}</Text>
        <Presionable
          onPress={onActualizar}
          accessibilityRole="button"
          accessibilityLabel={TEXTOS_DE_PASOS.actualizar}
          style={estilos.actualizar}
        >
          <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.seminegrita }]}>{TEXTOS_DE_PASOS.actualizar}</Text>
        </Presionable>
      </View>
    );
  }

  const porcentaje = porcentajeDeLaBarra(vista);
  const texto = vista.metaLista ? textoDeLaMetaLista(vista.km) : textoDeLaMeta(vista.km, vista.meta);
  return (
    <View style={estilos.contenedor}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Km de hoy"
        accessibilityValue={{ min: 0, max: Math.round(vista.meta * 100), now: Math.round(Math.min(vista.km, vista.meta) * 100), text: texto }}
        style={[estilos.pista, { backgroundColor: c.border }]}
      >
        <View style={[estilos.relleno, { width: `${porcentaje}%`, backgroundColor: c.goldInk }]} />
      </View>
      <View style={estilos.fila}>
        <Text
          style={[t.small, { color: c.textStrong, fontFamily: fuentes.negrita, fontSize: 15, fontVariant: ['tabular-nums'], flexShrink: 1 }]}
        >
          {texto}
        </Text>
        <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]} numberOfLines={1}>
          {vista.fuente.etiqueta}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6, paddingBottom: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  // 48 de alto táctil sin agrandar el texto: el enlace se toca con una mano.
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 48, alignSelf: 'flex-start' },
  actualizar: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  pista: { height: 8, borderRadius: 4, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4 },
});
