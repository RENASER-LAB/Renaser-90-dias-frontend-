import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { BotonSecundario } from '../../../components/Legible';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { useTheme } from '../../../theme/ThemeContext';
import { useReleerFuncionalidades, useReleyendoFuncionalidades } from '../estado/FuncionalidadesProvider';

/** Lo que se lee cuando Soporte TI apagó algo sin escribir un aviso (contrato de la spec 002, §2). */
export const AVISO_GENERICO = 'Esta función está en mantenimiento. Vuelve a intentarlo en un rato.';

/** El texto que se muestra: el aviso escrito o, si está vacío, el genérico. */
export function textoDelAviso(aviso: string | null | undefined): string {
  return aviso?.trim() || AVISO_GENERICO;
}

/**
 * El aviso que ocupa el lugar de una funcionalidad apagada por Soporte TI (spec 002, FR-013): la funcionalidad no
 * desaparece, en su lugar se lee por qué no está y se puede volver a probar.
 *
 * - Ícono `wrench` (Lucide, caja de 24), el aviso en texto de 16 y «Reintentar», que vuelve a leer el estado de los
 *   interruptores y, además, hace lo que pase quien lo usa en `alReintentar` (p. ej. volver a pedir sus datos).
 *   Mientras lee, el botón muestra que está revisando.
 * - **Lector de pantalla**: se anuncia al aparecer y cada vez que cambia el texto.
 * - **Movimiento** (`emil-design-eng`, `animate-expo`): aparece de vez en cuando, no decenas de veces al día, y
 *   reemplaza contenido: entra con un fundido y 6 px de subida en `DURACION_MS.paso` con ease-out, para que el cambio
 *   no sea un salto. Con «reducir movimiento», solo el fundido.
 */
export function AvisoDeMantenimiento({ aviso, alReintentar }: { aviso?: string | null; alReintentar?: () => void }) {
  const { c, t } = useTheme();
  const releer = useReleerFuncionalidades();
  const releyendo = useReleyendoFuncionalidades();
  const reducido = useReducedMotion();
  const texto = textoDelAviso(aviso);
  const opacidad = useSharedValue(0);
  const subida = useSharedValue(reducido ? 0 : 6);

  useEffect(() => {
    const entrada = { duration: DURACION_MS.paso, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.System };
    opacidad.set(withTiming(1, entrada));
    subida.set(withTiming(0, entrada));
  }, [opacidad, subida]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.(texto);
  }, [texto]);

  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.get(), transform: [{ translateY: subida.get() }] }));

  return (
    <Animated.View testID="aviso-de-mantenimiento" style={[estilos.caja, { backgroundColor: c.cardBg, borderColor: c.border }, estilo]}>
      <View style={estilos.fila} accessible accessibilityLiveRegion="polite" accessibilityLabel={`En mantenimiento. ${texto}`}>
        <View style={[estilos.baldosa, { backgroundColor: c.goldWash }]}>
          <Icon name="wrench" size={TAMANO_ICONO.grande} color={c.goldInk} />
        </View>
        <Text style={[t.body, estilos.texto, { color: c.textStrong }]}>{texto}</Text>
      </View>
      <BotonSecundario
        etiqueta="Reintentar"
        accessibilityLabel="Reintentar: ver si ya volvió"
        cargando={releyendo}
        onPress={() => {
          void releer();
          alReintentar?.();
        }}
      />
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  caja: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  baldosa: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, flexShrink: 1, fontSize: 16, lineHeight: 23, fontFamily: 'Jost_400Regular', paddingTop: 8 },
});
