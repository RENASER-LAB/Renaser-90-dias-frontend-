import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import type { CitaDelMensaje, ClaseDeCita } from '../types/chat.types';
import { colorDeRemitente } from '../utils/formatoChat';
import type { ColoresDelChat } from './coloresDelChat';

/**
 * La cita de una respuesta (D-251 del backend, 2026-10-05), con la gramática de WhatsApp: una franja
 * de color a la izquierda, el nombre de quien escribió el citado («Tú» en dorado si fue uno mismo) y
 * una línea con lo que decía —o el ícono y el rótulo del adjunto—, con la miniatura de la foto o del
 * sticker a la derecha. Dos lugares, la misma pieza:
 *
 * - **{@link CitaEnLaBurbuja}**: arriba de la burbuja que responde. Tocarla lleva al mensaje citado
 *   si está cargado; si el citado ya no está, dice «Mensaje eliminado» sin autor y no se toca.
 * - **{@link BarraDeCita}**: «Respondiendo a…» encima del campo, con la ✕ para no responder.
 */

const ICONO_POR_CLASE: Record<ClaseDeCita, IconName | null> = {
  texto: null,
  foto: 'image',
  sticker: 'smile',
  audio: 'mic',
  video: 'play',
};

const TAM_MINIATURA = 40;

type CitaVisible = Extract<CitaDelMensaje, { estado: 'visible' }>;

function ContenidoDeCita({
  cita,
  colores,
  fondo,
  lineasDelResumen,
}: {
  cita: CitaDelMensaje;
  colores: ColoresDelChat;
  fondo: string;
  lineasDelResumen: number;
}) {
  const { mode } = useTheme();
  if (cita.estado === 'eliminada') {
    return (
      <View style={[styles.cita, { backgroundColor: fondo }]}>
        <View style={[styles.franja, { backgroundColor: colores.hora }]} />
        <Text style={[styles.eliminada, { color: colores.hora }]}>Mensaje eliminado</Text>
      </View>
    );
  }
  const colorDelAutor = cita.esMia ? colores.autorPropio : colorDeRemitente(cita.autor, mode === 'dark');
  const icono = ICONO_POR_CLASE[cita.clase];
  return (
    <View style={[styles.cita, { backgroundColor: fondo }]}>
      <View style={[styles.franja, { backgroundColor: colorDelAutor }]} />
      <View style={styles.textos}>
        <Text numberOfLines={1} style={[styles.autor, { color: colorDelAutor }]}>
          {cita.autor}
        </Text>
        <View style={styles.lineaDelResumen}>
          {icono ? <Icon name={icono} size={15} color={colores.hora} /> : null}
          <Text numberOfLines={lineasDelResumen} style={[styles.resumen, { color: colores.hora }]}>
            {cita.resumen}
          </Text>
        </View>
      </View>
      {cita.miniatura ? (
        <Image
          source={{ uri: cita.miniatura }}
          style={[styles.miniatura, cita.clase === 'sticker' && styles.miniaturaSticker]}
          contentFit={cita.clase === 'sticker' ? 'contain' : 'cover'}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : null}
    </View>
  );
}

/** Lo que el lector de pantalla dice de una cita. */
export function etiquetaDeCita(cita: CitaDelMensaje): string {
  return cita.estado === 'eliminada' ? 'Responde a un mensaje eliminado' : `Responde a ${cita.autor}: ${cita.resumen}`;
}

export function CitaEnLaBurbuja({
  cita,
  propia,
  colores,
  onTocar,
  onMantener,
}: {
  cita: CitaDelMensaje;
  /** La burbuja es de quien mira: el panel va sobre el dorado suave. */
  propia: boolean;
  colores: ColoresDelChat;
  /** Lleva al mensaje citado. Sin esto (o con el citado eliminado) la cita no se toca. */
  onTocar?: (id: string) => void;
  /** Mantener presionada la cita abre el menú de la burbuja, como el resto de la burbuja. */
  onMantener?: () => void;
}) {
  const fondo = propia ? colores.citaPropia : colores.citaAjena;
  const contenido = <ContenidoDeCita cita={cita} colores={colores} fondo={fondo} lineasDelResumen={2} />;
  if (cita.estado === 'eliminada' || !onTocar) {
    return (
      <View accessible accessibilityLabel={etiquetaDeCita(cita)} style={styles.enLaBurbuja}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => onTocar(cita.id)}
      onLongPress={onMantener}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={etiquetaDeCita(cita)}
      accessibilityHint="Lleva al mensaje citado"
      style={({ pressed }) => [styles.enLaBurbuja, { opacity: pressed ? 0.7 : 1 }]}
    >
      {contenido}
    </Pressable>
  );
}

/**
 * «Respondiendo a…» encima del campo de escribir. Entra con un fundido y 8 px hacia arriba en
 * 180 ms (ease-out fuerte, en el hilo de la interfaz); se va al instante al enviar o con la ✕, para
 * no hacer esperar. Con «reducir movimiento», solo el fundido. Va con un valor compartido propio y
 * no con `entering` de Reanimated (ver la nota de `MarcoDePaso` sobre los modales invisibles).
 */
export function BarraDeCita({
  cita,
  colores,
  onCerrar,
}: {
  cita: CitaVisible;
  colores: ColoresDelChat;
  onCerrar: () => void;
}) {
  const { c } = useTheme();
  const reducido = useReducedMotion();
  const avance = useSharedValue(0);
  useEffect(() => {
    avance.set(0);
    avance.set(withTiming(1, {
      duration: reducido ? DURACION_MS.fundido : DURACION_MS.seleccion,
      easing: CURVA_SALIDA,
      reduceMotion: ReduceMotion.Never,
    }));
  }, [avance, cita.id, reducido]);
  const estilo = useAnimatedStyle(() => ({
    opacity: avance.get(),
    transform: [{ translateY: reducido ? 0 : (1 - avance.get()) * 8 }],
  }));

  return (
    <Animated.View
      style={[styles.barra, { backgroundColor: colores.barraDeCita, borderColor: c.border }, estilo]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.barraContenido} accessible accessibilityLabel={`Respondiendo a ${cita.autor}: ${cita.resumen}`}>
        <ContenidoDeCita cita={cita} colores={colores} fondo={colores.citaAjena} lineasDelResumen={1} />
      </View>
      <Presionable
        onPress={onCerrar}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="No responder a este mensaje"
        style={styles.cerrar}
      >
        <Icon name="close" size={18} color={colores.hora} />
      </Presionable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cita: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 48,
    paddingRight: 6,
  },
  franja: {
    alignSelf: 'stretch',
    width: 4,
  },
  textos: {
    flex: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 1,
  },
  autor: {
    fontFamily: 'Jost_700Bold',
    fontSize: 14.5,
  },
  lineaDelResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resumen: {
    flexShrink: 1,
    fontFamily: 'Jost_400Regular',
    fontSize: 14.5,
    lineHeight: 19,
  },
  eliminada: {
    flex: 1,
    paddingHorizontal: 9,
    paddingVertical: 12,
    fontFamily: 'Jost_400Regular',
    fontStyle: 'italic',
    fontSize: 14.5,
  },
  miniatura: {
    width: TAM_MINIATURA,
    height: TAM_MINIATURA,
    borderRadius: 6,
  },
  miniaturaSticker: {
    borderRadius: 0,
  },
  enLaBurbuja: {
    marginBottom: 5,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 4,
    padding: 6,
    paddingRight: 2,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  barraContenido: {
    flex: 1,
  },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
});
