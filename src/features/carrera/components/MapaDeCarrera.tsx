import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { useTheme } from '../../../theme/ThemeContext';
import type { Coordenada } from '../utils/geo';
import type { FiguraDelAvatar } from '../utils/fusionDelAvatar';
import { TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';
import { AvatarCaminante } from './AvatarCaminante';

/**
 * El mapa de la carrera (FR-037): Google Maps con la cámara inclinada (60°) y los edificios, que sigue a la persona en su rumbo, y
 * la ruta como una línea dorada que crece. El mapa NO calcula nada: dibuja lo que el motor ya aceptó.
 *
 * El avatar va FIJO al centro, encima del mapa (`AvatarCaminante`); lo que se anima es la cámara, entre posiciones, con la duración
 * que da la fusión de pasos y GPS (≤ 600 ms, o sin animar si saltó más de 30 m).
 *
 * **Sin clave de Google Maps** (`extra.mapaGoogle` en `app.config.js`, de la variable de EAS `GOOGLE_MAPS_ANDROID_KEY`) o sin el
 * módulo nativo, se dibuja un fondo neutro con el avatar y una línea que lo dice: la carrera se cuenta igual. Sin botón 2D/3D.
 */

type ModuloMapas = typeof import('react-native-maps');

function cargarMapas(): ModuloMapas | null {
  if (Constants.expoConfig?.extra?.mapaGoogle !== true) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-maps') as ModuloMapas;
  } catch {
    return null;
  }
}

export const INCLINACION = 60;
export const ACERCAMIENTO = 18;
/** Cuántos puntos de la ruta se dibujan (los últimos): una carrera larga no debe trabar el mapa. */
const PUNTOS_DIBUJADOS = 1500;

export function MapaDeCarrera({
  ruta,
  posicion,
  rumbo,
  duracionMs,
  figura,
  caminando,
  iniciales,
  fotoUrl,
  chapa,
  alto,
}: {
  ruta: readonly Coordenada[];
  posicion: Coordenada | null;
  rumbo: number;
  duracionMs: number;
  figura: FiguraDelAvatar;
  caminando: boolean;
  iniciales: string;
  fotoUrl?: string | null;
  chapa?: string | null;
  alto?: number;
}) {
  const { c, t } = useTheme();
  const Mapas = useMemo(cargarMapas, []);
  const mapa = useRef<InstanceType<ModuloMapas['default']> | null>(null);
  const dibujada = useMemo(() => ruta.slice(-PUNTOS_DIBUJADOS).map(p => ({ latitude: p.lat, longitude: p.lng })), [ruta]);

  useEffect(() => {
    if (!posicion || !mapa.current) return;
    mapa.current.animateCamera(
      { center: { latitude: posicion.lat, longitude: posicion.lng }, heading: rumbo, pitch: INCLINACION, zoom: ACERCAMIENTO },
      { duration: Math.max(1, duracionMs) },
    );
  }, [posicion, rumbo, duracionMs]);

  return (
    <View style={[estilos.contenedor, alto != null ? { height: alto } : { flex: 1 }, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
      {Mapas && posicion ? (
        <Mapas.default
          ref={mapa}
          provider={Mapas.PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialCamera={{
            center: { latitude: posicion.lat, longitude: posicion.lng },
            heading: rumbo,
            pitch: INCLINACION,
            zoom: ACERCAMIENTO,
            altitude: 0,
          }}
          showsBuildings
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {dibujada.length >= 2 ? <Mapas.Polyline coordinates={dibujada} strokeColor="#B2924F" strokeWidth={6} /> : null}
        </Mapas.default>
      ) : (
        <View style={[StyleSheet.absoluteFill, estilos.neutro]}>
          {!Mapas ? (
            <Text style={[t.small, { color: c.textSoft, textAlign: 'center', paddingHorizontal: 24 }]}>{TEXTOS_DE_LA_CARRERA.mapaSinClave}</Text>
          ) : null}
        </View>
      )}
      <View pointerEvents="none" style={estilos.centro}>
        <AvatarCaminante figura={figura} caminando={caminando} iniciales={iniciales} fotoUrl={fotoUrl} />
      </View>
      {chapa ? (
        <View style={[estilos.chapa, { backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }]}>
          <Text style={[t.small, { color: c.textStrong, fontVariant: ['tabular-nums'] }]}>{chapa}</Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  neutro: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24 },
  centro: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  chapa: { position: 'absolute', top: 12, left: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
});
