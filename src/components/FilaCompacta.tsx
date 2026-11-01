import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fuentes } from '../theme/fuentes';
import { useTheme } from '../theme/ThemeContext';
import { Icon, TAMANO_ICONO, type IconName } from './Icon';
import { Presionable } from './Presionable';

/**
 * La fila compacta de Hoy y de Plan (2026-10-31, pedido del dueño: «no tan grande»): del alto que tenía el bloque Coherencia / Racha
 * (72 de mínimo), toda tocable, con el título en negrita, una línea corta debajo, el chevron a la derecha y SIN botón dorado.
 *
 * Es la forma de dos cosas que Hoy decía con una tarjeta grande: la acción o el objetivo que toca (`TarjetaAccionDeHoy`) y la entrada
 * al programa propio (`FilaDelProgramaPropio`). Un solo componente, para que las dos sean la misma fila.
 *
 * - **Sin `onPress` no es un botón**: es una línea informativa («Tu programa empieza el lunes 3 de noviembre»), sin chevron y sin la
 *   escala de `Presionable`, porque no lleva a nada.
 * - **`accionDerecha`** (opcional, p. ej. la ✕ de «Ahora no») va fuera de la fila tocable, pegada al borde derecho, para que sus toques no
 *   se mezclen con los de la fila. Debe medir 48 como mínimo; la fila deja libre ese lugar.
 *
 * **Movimiento:** ninguno propio; `Presionable` hunde la fila al apoyar el dedo, como en el resto de la app.
 */
export function FilaCompacta({
  icono,
  titulo,
  linea,
  onPress,
  accessibilityLabel,
  accionDerecha,
}: {
  icono: IconName;
  titulo: string;
  /** Una línea corta debajo del título, en dorado y negrita. Sin ella la fila es solo el título. */
  linea?: string | null;
  onPress?: () => void;
  accessibilityLabel: string;
  accionDerecha?: React.ReactNode;
}) {
  const { c, t } = useTheme();
  const caja = [
    estilos.tarjeta,
    estilos.compacta,
    { borderColor: c.border, backgroundColor: c.cardBg },
    accionDerecha ? estilos.conAccionDerecha : null,
  ];
  const contenido = (
    <>
      <Icon name={icono} size={TAMANO_ICONO.normal} color={c.goldInk} />
      <View style={estilos.textos}>
        <Text style={[t.cardTitle, estilos.titulo, { color: c.textStrong }]} numberOfLines={2}>
          {titulo}
        </Text>
        {linea ? (
          <Text style={[t.small, estilos.linea, { color: c.goldInk, fontFamily: fuentes.negrita }]} numberOfLines={1}>
            {linea}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.textSoft} /> : null}
    </>
  );
  const fila = onPress ? (
    <Presionable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={caja}>
      {contenido}
    </Presionable>
  ) : (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel} style={caja}>
      {contenido}
    </View>
  );
  if (!accionDerecha) return fila;
  return (
    <View>
      {fila}
      <View style={estilos.accionDerecha}>{accionDerecha}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17 },
  compacta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, minHeight: 72 },
  /** Deja libre el lugar de la acción de la derecha (48 de área + 4 de borde): el chevron termina antes. */
  conAccionDerecha: { paddingRight: 56 },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: 16, lineHeight: 22, fontFamily: fuentes.negrita },
  linea: { fontSize: 14, lineHeight: 20 },
  accionDerecha: { position: 'absolute', top: 0, bottom: 0, right: 4, justifyContent: 'center' },
});
