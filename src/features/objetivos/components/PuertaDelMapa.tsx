import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import type { PuertaDeObjetivos } from '../utils/puertaDeObjetivos';

/** Botones en tipo oración y a tamaño de lectura, como el resto de Plan (`GoldButton` va en versales por defecto). */
const TEXTO_DE_BOTON = { fontSize: 15, letterSpacing: 0 } as const;

export const TITULO_PRIMERO_EL_MAPA = 'Primero tu Mapa de Renacimiento';
export const TEXTO_PRIMERO_EL_MAPA =
  'Tu objetivo de 90 días nace de tu Mapa, así que primero lo armas allí. Toma de 15 a 20 minutos.';
export const BOTON_HACER_MI_MAPA = 'Hacer mi Mapa';
export const TEXTO_COMPROBANDO_EL_MAPA = 'Comprobando tu Mapa…';
export const TEXTO_SIN_COMPROBAR_EL_MAPA =
  'No pudimos comprobar tu Mapa de Renacimiento. Revisa tu conexión e inténtalo de nuevo.';
export const BOTON_REINTENTAR = 'Reintentar';

/**
 * Lo que ocupa el lugar de los objetivos de Plan mientras el Mapa de Renacimiento no está activo (issue #37,
 * 2026-10-27, decisión del dueño: «Bloqueemos objetivos diciendo desde el inicio que debe hacer el Mapa»).
 *
 * El objetivo de 90 días nace del Mapa y queda fijo; escribirlo en Plan sin Mapa lo dejaba chocando con el Mapa al
 * activarlo. Por eso no se ofrece ni «Editar» ni nada que cuelgue de él (mes, semana, acciones): en su lugar, esto.
 *
 * - `espera-al-mapa`: la tarjeta «Primero tu Mapa de Renacimiento» con «Hacer mi Mapa», que abre el MISMO flujo que la
 *   tarjeta del Mapa en Hoy (`abrirMapa` del contexto: el Mapa reemplaza a las pestañas).
 * - `comprobando`: una línea, sin botones ni formularios; no se promete ni se niega nada hasta saberlo.
 * - `sin-comprobar`: «No pudimos comprobar tu Mapa…» y «Reintentar» (relee el estado del Mapa).
 * - `abierta`: no dibuja nada (quien lo monta ya muestra los objetivos).
 *
 * Sin animación a propósito: se ve de vez en cuando, y el contenido que reemplaza no salta ni se desvanece.
 */
export function PuertaDelMapa({
  puerta,
  onHacerMapa,
  onReintentar,
}: {
  puerta: PuertaDeObjetivos;
  onHacerMapa: () => void;
  onReintentar: () => void;
}) {
  const { c, t } = useTheme();

  if (puerta === 'abierta') return null;

  if (puerta === 'comprobando') {
    return (
      <Text
        accessibilityLiveRegion="polite"
        style={[t.body, estilos.lectura, { color: c.textSoft }]}
      >
        {TEXTO_COMPROBANDO_EL_MAPA}
      </Text>
    );
  }

  if (puerta === 'sin-comprobar') {
    return (
      <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
        <Text accessibilityLiveRegion="polite" style={[t.body, estilos.cuerpo, { color: c.textSoft }]}>
          {TEXTO_SIN_COMPROBAR_EL_MAPA}
        </Text>
        <GoldButton label={BOTON_REINTENTAR} onPress={onReintentar} variant="outline" textStyle={TEXTO_DE_BOTON} />
      </View>
    );
  }

  return (
    <View style={[estilos.caja, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
      <View style={estilos.encabezado}>
        <Icon name="map" size={TAMANO_ICONO.normal} color={c.goldInk} />
        <Text
          accessibilityRole="header"
          style={[t.cardTitle, estilos.titulo, { color: c.textStrong }]}
        >
          {TITULO_PRIMERO_EL_MAPA}
        </Text>
      </View>
      <Text style={[t.body, estilos.cuerpo, { color: c.textSoft }]}>{TEXTO_PRIMERO_EL_MAPA}</Text>
      <GoldButton label={BOTON_HACER_MI_MAPA} onPress={onHacerMapa} textStyle={TEXTO_DE_BOTON} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, gap: 14 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { flex: 1, flexShrink: 1, fontSize: 18, lineHeight: 25 },
  cuerpo: { fontSize: 16, lineHeight: 23 },
  lectura: { fontSize: 16, lineHeight: 23, paddingTop: 8 },
});
