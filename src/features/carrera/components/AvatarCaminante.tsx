import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { fuentes } from '../../../theme/fuentes';
import type { FiguraDelAvatar } from '../utils/fusionDelAvatar';

/**
 * La persona en el mapa (FR-038): va FIJA al centro del mapa y el mapa se mueve debajo (así el avatar no depende de un `Marker`
 * animado, que en Android se dibuja como imagen fija).
 *
 * **Arte provisional.** Mientras no llegue el personaje propio de Renaser (hombre, mujer o neutral), se dibuja un marcador claro:
 * un círculo con la foto o las iniciales y borde dorado, con un vaivén de «paso» mientras camina. Para poner el arte final se
 * cambia SOLO `DibujoDelAvatar` (por ejemplo, un Rive con los estados caminar / quieto y la figura): las props ya traen la figura,
 * si camina y si hay que reducir el movimiento.
 *
 * Quieto en pausa; con «reducir movimiento», nunca hay vaivén (solo cambia de lugar, porque se mueve el mapa).
 */

export const ARTE_DEL_AVATAR_PROVISIONAL = true;

const ETIQUETA: Record<FiguraDelAvatar, string> = { hombre: 'Tu avatar, hombre', mujer: 'Tu avatar, mujer', neutral: 'Tu avatar' };

export function AvatarCaminante({
  figura,
  caminando,
  iniciales,
  fotoUrl,
}: {
  figura: FiguraDelAvatar;
  caminando: boolean;
  iniciales: string;
  fotoUrl?: string | null;
}) {
  const reducir = useReducedMotion();
  const vaiven = useSharedValue(0);

  useEffect(() => {
    if (caminando && !reducir) {
      // Un paso cada 300 ms: sube 3 px y vuelve. Constante mientras camina, por eso `inOut`.
      vaiven.set(
        withRepeat(
          withSequence(
            withTiming(-3, { duration: 150, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 150, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
        ),
      );
    } else {
      cancelAnimation(vaiven);
      vaiven.set(withTiming(0, { duration: 120 }));
    }
  }, [caminando, reducir, vaiven]);

  const estilo = useAnimatedStyle(() => ({ transform: [{ translateY: vaiven.get() }] }));

  return (
    // Decorativo y NUNCA enfocable: en Android `accessible` vuelve la vista enfocable y, fuera del modo táctil (al volver de modo
    // avión, con un teclado), recibía el foco y Android le pintaba encima su resaltado gris: el «cuadro gris detrás del avatar» de
    // «Terminaste». Lo que importa (km, duración, ritmo) lo leen las tarjetas de datos; el mapa ya está oculto para el lector.
    <View
      pointerEvents="none"
      accessibilityLabel={ETIQUETA[figura]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      focusable={false}
      style={estilos.contenedor}
    >
      <View style={estilos.sombra} />
      <Animated.View style={estilo}>
        <DibujoDelAvatar figura={figura} iniciales={iniciales} fotoUrl={fotoUrl ?? null} />
      </Animated.View>
    </View>
  );
}

/** El dibujo del avatar. Reemplazable por el arte final sin tocar nada más. */
function DibujoDelAvatar({ figura, iniciales, fotoUrl }: { figura: FiguraDelAvatar; iniciales: string; fotoUrl: string | null }) {
  return (
    <View style={[estilos.circulo, figura === 'neutral' ? null : estilos.circuloConFigura]}>
      {fotoUrl ? (
        <Image source={{ uri: fotoUrl }} style={estilos.foto} contentFit="cover" />
      ) : (
        <Text style={estilos.iniciales}>{iniciales.slice(0, 2).toUpperCase()}</Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', justifyContent: 'flex-end', width: 72, height: 80 },
  sombra: { position: 'absolute', bottom: 0, width: 28, height: 8, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.18)' },
  circulo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#B2924F',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  circuloConFigura: { borderWidth: 4 },
  foto: { width: '100%', height: '100%' },
  iniciales: { fontFamily: fuentes.negrita, fontSize: 18, color: '#856C35' },
});
