import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Constants from 'expo-constants';

import { useTheme } from '../../../theme/ThemeContext';
import { distanciaM, type Coordenada } from '../utils/geo';
import type { FiguraDelAvatar } from '../utils/fusionDelAvatar';
import { TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';
import { AvatarCaminante } from './AvatarCaminante';

/**
 * El mapa de la carrera (FR-037): Google Maps con los edificios, que sigue a la persona en su rumbo, y la ruta como una línea dorada
 * que crece. El mapa NO calcula nada: dibuja lo que el motor ya aceptó.
 *
 * **Cámara en diagonal, estilo navegación** (pedido del dueño del 2026-11-05: «direccionar diagonal para que se note más el 3D»):
 * inclinación al máximo de Google Maps a ese acercamiento (67,5°) y el avatar en el tercio de abajo (`mapPadding` arriba), para que
 * adelante se vean más calles y edificios en perspectiva. «Terminaste» (`modo="resumen"`) conserva la cámara centrada de antes.
 *
 * El avatar va FIJO encima del mapa (`AvatarCaminante`), donde cae el centro de la cámara; lo que se anima es la cámara, entre
 * posiciones, con la duración que da la fusión de pasos y GPS (≤ 600 ms, o sin animar si saltó más de 30 m).
 *
 * **Aparece sin esperar el primer punto** (2026-11-05: tardaba de 5 a 30 s): con `centroDeVista` (la última posición conocida, la
 * aproximada o el primer punto crudo del GPS, ver `centroDelMapa`) se monta ya en la cuenta 3, 2, 1, y cuando llega la `posicion`
 * del motor la cámara va hasta ella. El centro de vista nunca se dibuja en la ruta ni se mide.
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

/** La cámara de cada modo. `avatarAlto`: a qué fracción del alto, desde arriba, cae el centro de la cámara (y el avatar). */
export const CAMARA = {
  navegacion: { inclinacion: 67.5, acercamiento: 18.5, avatarAlto: 0.68 },
  resumen: { inclinacion: 60, acercamiento: 18, avatarAlto: 0.5 },
} as const;
export type ModoDelMapa = keyof typeof CAMARA;

/** El relleno de arriba que deja el centro de la cámara a `avatarAlto` del alto: el centro cae en `P + (alto − P) / 2`. */
export function rellenoDeArriba(alto: number, avatarAlto: number): number {
  if (!(alto > 0)) return 0;
  return Math.max(0, Math.round(alto * (2 * avatarAlto - 1)));
}

/** Más lejos que esto, del centro de vista al primer punto real, la cámara salta en vez de viajar. */
const VIAJE_MAXIMO_M = 2000;
const DURACION_AL_PRIMER_PUNTO_MS = 700;
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
  centroDeVista = null,
  modo = 'navegacion',
}: {
  ruta: readonly Coordenada[];
  posicion: Coordenada | null;
  /** Dónde mirar mientras el motor no tiene `posicion`. Solo para mirar: no entra a la ruta. */
  centroDeVista?: Coordenada | null;
  modo?: ModoDelMapa;
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
  const reducir = useReducedMotion();
  const camara = CAMARA[modo];
  const [altoMedido, setAltoMedido] = useState(alto ?? 0);
  const relleno = rellenoDeArriba(altoMedido, camara.avatarAlto);
  const centro = posicion ?? centroDeVista;
  const dibujada = useMemo(() => ruta.slice(-PUNTOS_DIBUJADOS).map(p => ({ latitude: p.lat, longitude: p.lng })), [ruta]);
  /** El último centro al que se llevó la cámara, y si era el de vista (todavía sin punto del motor). */
  const anterior = useRef<{ pos: Coordenada; deVista: boolean } | null>(null);

  useEffect(() => {
    if (!centro || !mapa.current) return;
    const previo = anterior.current;
    anterior.current = { pos: centro, deVista: posicion == null };
    let duracion = duracionMs;
    // Del centro de vista al primer punto real: un viaje corto (sin animar con «reducir movimiento» o si está lejos).
    if (posicion && previo?.deVista) {
      duracion = reducir || distanciaM(previo.pos, posicion) > VIAJE_MAXIMO_M ? 0 : DURACION_AL_PRIMER_PUNTO_MS;
    } else if (!posicion) {
      duracion = reducir ? 0 : DURACION_AL_PRIMER_PUNTO_MS;
    }
    mapa.current.animateCamera(
      { center: { latitude: centro.lat, longitude: centro.lng }, heading: rumbo, pitch: camara.inclinacion, zoom: camara.acercamiento },
      { duration: Math.max(1, duracion) },
    );
    // Solo cambia la cámara cuando cambia dónde mirar o el rumbo; las demás dependencias se leen en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro?.lat, centro?.lng, rumbo, duracionMs]);

  return (
    <View
      onLayout={ev => setAltoMedido(ev.nativeEvent.layout.height)}
      style={[estilos.contenedor, alto != null ? { height: alto } : { flex: 1 }, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}
    >
      {Mapas && centro ? (
        <Mapas.default
          ref={mapa}
          provider={Mapas.PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialCamera={{
            center: { latitude: centro.lat, longitude: centro.lng },
            heading: rumbo,
            pitch: camara.inclinacion,
            zoom: camara.acercamiento,
            altitude: 0,
          }}
          mapPadding={{ top: relleno, right: 0, bottom: 0, left: 0 }}
          googleRenderer="LATEST"
          loadingEnabled={false}
          loadingBackgroundColor={c.cardBgAlt}
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
      <View pointerEvents="none" style={[estilos.centro, { top: relleno }]}>
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
