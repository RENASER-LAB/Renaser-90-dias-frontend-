import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Constants from 'expo-constants';

import { Presionable } from '../../../components/Presionable';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { marcarMapaCalentado } from '../servicios/calentarLaCarrera';
import { useVistaDelMapa, type VistaDelMapa } from '../servicios/vistaDelMapa';
import { distanciaM, type Coordenada } from '../utils/geo';
import type { FiguraDelAvatar } from '../utils/fusionDelAvatar';
import { segmentosDeLaRuta, type PuntoConCorte } from '../utils/segmentosDeLaRuta';
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
 * **Mientras Google Maps dibuja las calles** (2026-11-06) no se ve su gris de carga: encima va un velo del color de la tarjeta, con el
 * avatar ya en su lugar, que se funde (`DURACION_DEL_VELO_MS`) cuando Google Maps avisa que cargó, o a los `TOPE_DEL_VELO_MS` aunque
 * no avise. Con «reducir movimiento», se quita sin fundido. Y el mapa avisa que Google Maps ya está cargado en este proceso
 * (`marcarMapaCalentado`), para que no se vuelva a calentar.
 *
 * **Sin clave de Google Maps** (`extra.mapaGoogle` en `app.config.js`, de la variable de EAS `GOOGLE_MAPS_ANDROID_KEY`) o sin el
 * módulo nativo, se dibuja un fondo neutro con el avatar y una línea que lo dice: la carrera se cuenta igual. Sin botón 2D/3D.
 */

type ModuloMapas = typeof import('react-native-maps');

export function cargarMapas(): ModuloMapas | null {
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
  /** 2D (botón del mapa, 2026-11-05): desde arriba, con el rumbo hacia arriba y el avatar al centro. Sin edificios en relieve
   * (2026-11-07: con ellos el mapa seguía viéndose en 3D aunque la cámara mirara desde arriba). */
  plano: { inclinacion: 0, acercamiento: 17.5, avatarAlto: 0.5 },
  resumen: { inclinacion: 60, acercamiento: 18, avatarAlto: 0.5 },
} as const;
export type CamaraDelMapa = keyof typeof CAMARA;
export type ModoDelMapa = 'navegacion' | 'resumen';

/** Qué cámara usa el mapa: el resumen siempre la suya; corriendo, 3D (diagonal) o 2D (desde arriba) según el botón. */
export function camaraDelMapa(modo: ModoDelMapa, vista: VistaDelMapa): CamaraDelMapa {
  if (modo === 'resumen') return 'resumen';
  return vista === '2d' ? 'plano' : 'navegacion';
}

/** Cuánto tarda la cámara en pasar de 3D a 2D o al revés. */
export const DURACION_CAMBIO_DE_VISTA_MS = 400;

/** El relleno de arriba que deja el centro de la cámara a `avatarAlto` del alto: el centro cae en `P + (alto − P) / 2`. */
export function rellenoDeArriba(alto: number, avatarAlto: number): number {
  if (!(alto > 0)) return 0;
  return Math.max(0, Math.round(alto * (2 * avatarAlto - 1)));
}

/** Cuánto baja el avatar desde el centro del recuadro para quedar en el centro de la cámara: la mitad del relleno de arriba. */
export function bajadaDelAvatar(alto: number, camara: CamaraDelMapa): number {
  return rellenoDeArriba(alto, CAMARA[camara].avatarAlto) / 2;
}

/** El fundido del velo cuando aparecen las calles. */
export const DURACION_DEL_VELO_MS = 220;
/** Lo más que el velo espera a que Google Maps avise que cargó: después se ve el mapa como esté. */
export const TOPE_DEL_VELO_MS = 2500;

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
  cuentaId = null,
}: {
  /** Para recordar 2D o 3D por cuenta en este teléfono. */
  cuentaId?: string | null;
  ruta: readonly PuntoConCorte[];
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
  const [vista, cambiarVista] = useVistaDelMapa(modo === 'navegacion' ? cuentaId : null);
  const claveDeCamara = camaraDelMapa(modo, vista);
  const camara = CAMARA[claveDeCamara];
  const [altoMedido, setAltoMedido] = useState(alto ?? 0);
  const relleno = rellenoDeArriba(altoMedido, camara.avatarAlto);
  const camaraPrevia = useRef(claveDeCamara);
  // El avatar baja con el centro de la cámara: P / 2 desde el centro del recuadro. Viaja junto con la cámara al cambiar de vista.
  const destinoDeLaBajada = bajadaDelAvatar(altoMedido, claveDeCamara);
  const bajada = useSharedValue(destinoDeLaBajada);
  useEffect(() => {
    const cambioDeVista = camaraPrevia.current !== claveDeCamara;
    bajada.set(
      cambioDeVista && !reducir
        ? withTiming(destinoDeLaBajada, { duration: DURACION_CAMBIO_DE_VISTA_MS, easing: CURVA_SALIDA })
        : destinoDeLaBajada,
    );
  }, [destinoDeLaBajada, claveDeCamara, reducir, bajada]);
  const estiloDelAvatar = useAnimatedStyle(() => ({ transform: [{ translateY: bajada.get() }] }));
  // El velo de carga: tapa el gris de Google Maps hasta que dibuja las calles (o hasta el tope).
  // `mapPadding` solo cuando Google Maps está listo: si cambia antes (el recuadro ya medido y el mapa todavía sin crear),
  // react-native-maps llama a `setPadding` sobre un mapa nulo y la app se cae (visto el 2026-11-06 con Google Maps ya calentado).
  const [listo, setListo] = useState(false);
  const [calles, setCalles] = useState(false);
  const [veloQuitado, setVeloQuitado] = useState(false);
  const velo = useSharedValue(1);
  const hayMapa = Mapas != null && (posicion ?? centroDeVista) != null;
  useEffect(() => {
    if (!hayMapa || calles) return;
    const id = setTimeout(() => setCalles(true), TOPE_DEL_VELO_MS);
    return () => clearTimeout(id);
  }, [hayMapa, calles]);
  useEffect(() => {
    if (!calles) return;
    if (reducir) {
      velo.set(0);
      setVeloQuitado(true);
      return;
    }
    velo.set(withTiming(0, { duration: DURACION_DEL_VELO_MS, easing: CURVA_SALIDA }));
    const id = setTimeout(() => setVeloQuitado(true), DURACION_DEL_VELO_MS);
    return () => clearTimeout(id);
  }, [calles, reducir, velo]);
  const estiloDelVelo = useAnimatedStyle(() => ({ opacity: velo.get() }));
  const centro = posicion ?? centroDeVista;
  const dibujada = useMemo(() => segmentosDeLaRuta(ruta.slice(-PUNTOS_DIBUJADOS)), [ruta]);
  /** El último centro al que se llevó la cámara, y si era el de vista (todavía sin punto del motor). */
  const anterior = useRef<{ pos: Coordenada; deVista: boolean } | null>(null);

  useEffect(() => {
    // Antes de que Google Maps esté listo la cámara no se puede mover (se pierde): se mueve al quedar listo.
    if (!centro || !mapa.current || !listo) return;
    const previo = anterior.current;
    anterior.current = { pos: centro, deVista: posicion == null };
    const cambioDeVista = camaraPrevia.current !== claveDeCamara;
    camaraPrevia.current = claveDeCamara;
    let duracion = duracionMs;
    if (cambioDeVista) {
      // 3D ↔ 2D: un pase suave; con «reducir movimiento», en el acto.
      duracion = reducir ? 0 : DURACION_CAMBIO_DE_VISTA_MS;
    } else if (posicion && previo?.deVista) {
      // Del centro de vista al primer punto real: un viaje corto (sin animar con «reducir movimiento» o si está lejos).
      duracion = reducir || distanciaM(previo.pos, posicion) > VIAJE_MAXIMO_M ? 0 : DURACION_AL_PRIMER_PUNTO_MS;
    } else if (!posicion) {
      // Entre centros de vista (el guardado → la última conocida → la aproximada): un viaje corto, o un salto si está lejos.
      duracion = reducir || (previo && distanciaM(previo.pos, centro) > VIAJE_MAXIMO_M) ? 0 : DURACION_AL_PRIMER_PUNTO_MS;
    }
    mapa.current.animateCamera(
      { center: { latitude: centro.lat, longitude: centro.lng }, heading: rumbo, pitch: camara.inclinacion, zoom: camara.acercamiento },
      { duration: Math.max(1, duracion) },
    );
    // Solo cambia la cámara cuando cambia dónde mirar o el rumbo; las demás dependencias se leen en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro?.lat, centro?.lng, rumbo, duracionMs, claveDeCamara, listo]);

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
          mapPadding={listo ? { top: relleno, right: 0, bottom: 0, left: 0 } : undefined}
          googleRenderer="LATEST"
          onMapReady={() => {
            marcarMapaCalentado();
            setListo(true);
          }}
          onMapLoaded={() => setCalles(true)}
          loadingEnabled={false}
          loadingBackgroundColor={c.cardBgAlt}
          showsBuildings={claveDeCamara !== 'plano'}
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
          {dibujada.segmentos.map((coordenadas, i) => (
            <Mapas.Polyline key={`seg-${i}`} testID="ruta-dorada" coordinates={coordenadas} strokeColor="#B2924F" strokeWidth={6} />
          ))}
          {dibujada.conectores.map((coordenadas, i) => (
            <Mapas.Polyline
              key={`hueco-${i}`}
              testID="ruta-hueco"
              coordinates={coordenadas}
              strokeColor="rgba(178,146,79,0.5)"
              strokeWidth={3}
              lineDashPattern={[6, 8]}
            />
          ))}
        </Mapas.default>
      ) : (
        <View style={[StyleSheet.absoluteFill, estilos.neutro]}>
          {!Mapas ? (
            <Text style={[t.small, { color: c.textSoft, textAlign: 'center', paddingHorizontal: 24 }]}>{TEXTOS_DE_LA_CARRERA.mapaSinClave}</Text>
          ) : null}
        </View>
      )}
      {Mapas && centro && !veloQuitado ? (
        <Animated.View testID="velo-del-mapa" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.cardBgAlt }, estiloDelVelo]} />
      ) : null}
      <Animated.View pointerEvents="none" style={[estilos.centro, estiloDelAvatar]}>
        <AvatarCaminante figura={figura} caminando={caminando} iniciales={iniciales} fotoUrl={fotoUrl} />
      </Animated.View>
      {Mapas && centro && modo === 'navegacion' ? (
        <Presionable
          onPress={() => {
            tacto.seleccion();
            cambiarVista();
          }}
          accessibilityRole="button"
          accessibilityLabel={vista === '3d' ? 'Ver el mapa en 2D' : 'Ver el mapa en 3D'}
          style={[estilos.botonVista, { backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }]}
        >
          <Text style={[estilos.textoVista, { color: c.textStrong }]}>{vista === '3d' ? '2D' : '3D'}</Text>
        </Presionable>
      ) : null}
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
  botonVista: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 48,
    height: 48,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoVista: { fontFamily: fuentes.negrita, fontSize: 15, fontVariant: ['tabular-nums'] },
  chapa: { position: 'absolute', top: 12, left: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
});
