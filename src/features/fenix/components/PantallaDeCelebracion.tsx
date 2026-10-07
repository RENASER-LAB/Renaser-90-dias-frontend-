import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Image as ImagenRN, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { tacto } from '../../../utils/tacto';
import type { MomentoGrande } from '../estado/momentoGrande';
import PhoenixMascot, { PHOENIX_STATIC_IMAGES, type PhoenixMascotHandle } from '../rive/PhoenixMascot';
import type { PhoenixMood } from '../rive/phoenixMaster';
import {
  AMORTIGUACION_DE_ENTRADA,
  ESCALA_DE_ENTRADA,
  PANTALLA_MS,
  planDeLaPantalla,
  textosDeLaPantalla,
} from '../utils/pantallaDeCelebracion';
import { BrasasDoradas } from './BrasasDoradas';
import { ContadorQueSube } from './ContadorQueSube';

const TAMANO_FENIX = 220;
const TAMANO_FENIX_CON_ANIMAL = 176;
const TAMANO_ANIMAL = 150;

/**
 * La pantalla completa de los momentos grandes (pedido del dueño, 2026-10-07): todos los hábitos del día, rachas de 7
 * y 30 y fase nueva. El fénix grande al centro celebrando (`trgCelebrate`, el clip largo: salto, alas, vuelo corto y
 * aterrizaje), el mensaje, los contadores que suben, brasas doradas sutiles, «Seguir». Se cierra sola, tocando en
 * cualquier lado, con «Seguir» o con «atrás». Sin sonido; una vibración de logro al aparecer.
 *
 * Movimiento (emil-design-eng, animate-expo): velo con fundido de 220 ms; el contenido entra desde escala 0.96 y
 * opacidad 0 con un resorte; sale en 180 ms. Todo `transform`/`opacity` en el hilo de la interfaz; los números los
 * escribe un worklet. Con «reducir movimiento»: el fénix quieto en su imagen, solo fundidos, sin brasas.
 *
 * Es el ÚNICO lienzo Rive mientras está: el fénix del centro de Hoy pasa a su foto fija (`OrbeAcompanante`).
 */
export function PantallaDeCelebracion({
  momento,
  animo,
  onCerrar,
}: {
  momento: MomentoGrande;
  animo: PhoenixMood;
  onCerrar: () => void;
}) {
  const { c, t, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const reducido = useReducedMotion();
  const [plan] = useState(() => planDeLaPantalla(reducido));
  const textos = textosDeLaPantalla(momento);
  const cerrar = useCierre(onCerrar, plan.entrada === 'fundido');
  const conAnimal = momento.principal === 'fase' && momento.fase !== null;

  useAparicion(textos.anuncio, cerrar.cerrar);

  return (
    <Animated.View style={[estilos.capa, cerrar.estiloVelo]} testID="pantalla-de-celebracion" accessibilityViewIsModal>
      <View style={[estilos.capa, { backgroundColor: c.bg, opacity: 0.97 }]} />
      <Pressable
        style={estilos.capa}
        onPress={cerrar.cerrar}
        accessibilityRole="button"
        accessibilityLabel={`${textos.anuncio}. Tocar para cerrar`}
      />
      <Animated.View
        pointerEvents="box-none"
        style={[estilos.contenido, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }, cerrar.estiloContenido]}
      >
        <View pointerEvents="none" style={estilos.escena}>
          <View style={[estilos.halo, { backgroundColor: c.goldWash }]} />
          {plan.brasas ? <BrasasDoradas color={c.gold} /> : null}
          <View style={estilos.fila}>
            {conAnimal ? (
              <Image
                source={momento.fase!.animal.imagen}
                placeholder={momento.fase!.animal.imagenDeRespaldo}
                contentFit="contain"
                style={{ width: TAMANO_ANIMAL, height: TAMANO_ANIMAL, marginRight: -18 }}
                accessibilityIgnoresInvertColors
                testID="animal-de-la-fase"
              />
            ) : null}
            <FenixQueCelebra
              size={conAnimal ? TAMANO_FENIX_CON_ANIMAL : TAMANO_FENIX}
              animo={animo}
              oscuro={mode === 'dark'}
              enImagen={plan.fenix === 'imagen'}
            />
          </View>
        </View>

        <View pointerEvents="none" style={estilos.textos}>
          {textos.numeroGrande !== null ? (
            <ContadorQueSube
              valor={textos.numeroGrande}
              sube={plan.contadoresSuben}
              esperaMs={PANTALLA_MS.esperaContadores}
              duracionMs={PANTALLA_MS.contadores}
              style={[estilos.numeroGrande, { color: c.goldInk }]}
              testID="numero-grande"
            />
          ) : null}
          <Text style={[t.screenTitle, estilos.titulo, { color: c.textStrong }]}>{textos.titulo}</Text>
          {textos.bajada ? <Text style={[t.body, estilos.centrado, { color: c.textSoft, fontSize: 17 }]}>{textos.bajada}</Text> : null}
          {textos.lineas.map(linea => (
            <Text key={linea} style={[t.body, estilos.centrado, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>
              {linea}
            </Text>
          ))}
          {textos.contadores.length > 0 ? (
            <View style={estilos.contadores}>
              {textos.contadores.map(cuenta => (
                <View key={cuenta.clave} style={[estilos.contador, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                  <ContadorQueSube
                    valor={cuenta.valor}
                    prefijo={cuenta.clave === 'puntos' ? '+' : ''}
                    sube={plan.contadoresSuben}
                    esperaMs={PANTALLA_MS.esperaContadores}
                    duracionMs={PANTALLA_MS.contadores}
                    style={[estilos.cifra, { color: c.textStrong }]}
                    testID={`contador-${cuenta.clave}`}
                  />
                  <Text style={[t.small, { color: c.textSoft }]}>{cuenta.rotulo}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <GoldButton label="Seguir" onPress={cerrar.cerrar} style={estilos.boton} />
      </Animated.View>
    </Animated.View>
  );
}

/** El fénix de la pantalla: el rig con `trgCelebrate` en cuanto está listo; con «reducir movimiento», su imagen. */
function FenixQueCelebra({ size, animo, oscuro, enImagen }: { size: number; animo: PhoenixMood; oscuro: boolean; enImagen: boolean }) {
  const fenix = useRef<PhoenixMascotHandle>(null);
  const alEstarListo = useCallback(() => {
    void fenix.current?.react('celebrate');
  }, []);
  if (enImagen) {
    return (
      <ImagenRN
        source={PHOENIX_STATIC_IMAGES[animo]}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="Fénix"
        testID="fenix-celebrando-quieto"
      />
    );
  }
  return (
    <PhoenixMascot
      ref={fenix}
      size={size}
      mood={animo}
      life={1}
      onDarkBackground={oscuro}
      interactive={false}
      reduceMotion={false}
      onReady={alEstarListo}
      accessibilityLabel="Fénix celebrando"
      testID="fenix-celebrando"
    />
  );
}

/**
 * Entrada y salida. La entrada arranca al montar; `cerrar` corre la salida (180 ms) y recién después avisa. Tocar dos
 * veces no cierra dos veces.
 */
function useCierre(onCerrar: () => void, soloFundido: boolean) {
  const velo = useSharedValue(0);
  const entrada = useSharedValue(soloFundido ? 1 : ESCALA_DE_ENTRADA);
  const opacidad = useSharedValue(0);
  const cerrando = useRef(false);
  const avisar = useRef(onCerrar);
  avisar.current = onCerrar;

  useEffect(() => {
    velo.set(withTiming(1, { duration: PANTALLA_MS.velo, easing: CURVA_SALIDA }));
    opacidad.set(withTiming(1, { duration: soloFundido ? PANTALLA_MS.velo : PANTALLA_MS.velo + 60, easing: CURVA_SALIDA }));
    if (!soloFundido) entrada.set(withSpring(1, { duration: PANTALLA_MS.entrada, dampingRatio: AMORTIGUACION_DE_ENTRADA }));
  }, [velo, entrada, opacidad, soloFundido]);

  const cerrar = useCallback(() => {
    if (cerrando.current) return;
    cerrando.current = true;
    const salida = { duration: PANTALLA_MS.salida, easing: CURVA_SALIDA };
    velo.set(withTiming(0, salida));
    if (!soloFundido) entrada.set(withTiming(0.98, salida));
    setTimeout(() => avisar.current(), PANTALLA_MS.salida);
  }, [velo, entrada, soloFundido]);

  const estiloVelo = useAnimatedStyle(() => ({ opacity: velo.get() }));
  const estiloContenido = useAnimatedStyle(() => ({ opacity: opacidad.get(), transform: [{ scale: entrada.get() }] }));
  return { cerrar, estiloVelo, estiloContenido };
}

/** Al aparecer: una vibración de logro, el anuncio para el lector de pantalla, «atrás» cierra y el cierre solo. */
function useAparicion(anuncio: string, cerrar: () => void) {
  useEffect(() => {
    tacto.hito();
    AccessibilityInfo.announceForAccessibility?.(anuncio);
    const atras = BackHandler.addEventListener('hardwareBackPress', () => {
      cerrar();
      return true;
    });
    let espera: ReturnType<typeof setTimeout> | null = null;
    let vivo = true;
    /* Con lector de pantalla no se cierra sola: hay que poder escucharla entera. */
    Promise.resolve(AccessibilityInfo.isScreenReaderEnabled?.())
      .catch(() => false)
      .then(lector => {
        if (vivo && !lector) espera = setTimeout(cerrar, PANTALLA_MS.autocierre);
      });
    return () => {
      vivo = false;
      atras.remove();
      if (espera) clearTimeout(espera);
    };
    // Solo al aparecer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

const estilos = StyleSheet.create({
  capa: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  contenido: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 20 },
  escena: { alignItems: 'center', justifyContent: 'center', minHeight: TAMANO_FENIX + 20 },
  halo: { position: 'absolute', width: 260, height: 260, borderRadius: 130 },
  fila: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  textos: { alignSelf: 'stretch', alignItems: 'stretch', gap: 8 },
  numeroGrande: { fontFamily: 'Fraunces_700Bold', fontSize: 88, lineHeight: 96, letterSpacing: -2, textAlign: 'center' },
  titulo: { textAlign: 'center', fontSize: 30, lineHeight: 36 },
  centrado: { textAlign: 'center' },
  contadores: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 10 },
  contador: { alignItems: 'center', minWidth: 112, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1 },
  cifra: { fontFamily: 'Jost_700Bold', fontSize: 28, lineHeight: 34, textAlign: 'center' },
  boton: { alignSelf: 'stretch', maxWidth: 420, marginTop: 8 },
});
