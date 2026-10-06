import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import type { Palette } from '../../../theme/tokens';
import { tacto } from '../../../utils/tacto';
import type { AnimalParaLaTarjeta } from '../utils/animalConfigurado';
import type { DiasDeLaFase } from '../utils/diasDeLaFase';

const ENTRADA = { damping: 14, stiffness: 170, reduceMotion: ReduceMotion.System } as const;
const ALTO = 262;
const LADO_DEL_ANIMAL = 240;

/** Un nombre largo («Sistema de Alto Rendimiento») baja un punto para no pisar al animal. */
function tamanoDelTitulo(nombre: string) {
  return nombre.length > 20 ? { fontSize: 23, lineHeight: 27 } : { fontSize: 27, lineHeight: 30 };
}

/**
 * La tarjeta «héroe» de Yo (diseño B elegido por el dueño, 2026-10-06): «FASE 2 DE 4», el nombre de la
 * fase en serif, «Tu animal: Gorila», los días dentro de la fase con su barra, el día del programa y el
 * animal grande saliendo por la derecha, sobre un degradado dorado sutil. Claro y oscuro.
 *
 * **Es la misma que ve el administrador al previsualizar** (`AnimalDeFaseDetalleScreen`): por eso
 * recibe todo por props, la imagen incluida, y la paleta opcional para dibujarla en claro y en oscuro a
 * la vez. Sin `diasDeLaFase` no dibuja la barra ni su línea.
 *
 * - `imagen` es la configurada o la de la app; si no carga (URL vencida, sin red) cae a
 *   `imagenDeRespaldo`.
 * - `celebrar` (sólo la primera vez que se entra en una fase): el animal aterriza desde un 82 % con un
 *   resorte corto y una sola vibración. Con «reducir movimiento» el sistema salta la animación.
 */
export function TarjetaDeFase({
  numero,
  totalDeFases,
  nombreDeLaFase,
  animal,
  diasDeLaFase,
  diaDelPrograma,
  diasDelPrograma,
  celebrar = false,
  paleta,
}: {
  numero: number;
  totalDeFases: number;
  nombreDeLaFase: string;
  animal: AnimalParaLaTarjeta;
  diasDeLaFase?: DiasDeLaFase | null;
  diaDelPrograma?: number | null;
  diasDelPrograma: number;
  celebrar?: boolean;
  paleta?: Palette;
}) {
  const tema = useTheme();
  const c = paleta ?? tema.c;
  const { t } = tema;
  const [fallo, setFallo] = useState(false);
  const escala = useSharedValue(1);

  useEffect(() => setFallo(false), [animal.imagen]);
  useEffect(() => {
    if (!celebrar) return;
    escala.set(0.82);
    escala.set(withSpring(1, ENTRADA));
    tacto.logro();
  }, [celebrar, escala]);
  const estiloAnimal = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }));

  const avance = diasDeLaFase ? Math.min(1, diasDeLaFase.dia / diasDeLaFase.total) : 0;
  const dichoDelDia = diaDelPrograma != null ? `Día ${diaDelPrograma} de ${diasDelPrograma} en total` : null;
  return (
    <View
      accessible
      accessibilityLabel={
        `Fase ${numero} de ${totalDeFases}, ${nombreDeLaFase}. Tu animal: ${animal.nombre}.` +
        (diasDeLaFase ? ` Día ${diasDeLaFase.dia} de ${diasDeLaFase.total} de esta fase.` : '') +
        (dichoDelDia ? ` ${dichoDelDia}.` : '')
      }
      style={{ minHeight: ALTO, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: c.border, backgroundColor: c.cardBg }}
    >
      <LinearGradient
        colors={[c.cardBg, c.goldWash, c.goldWash]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', right: -26, bottom: -14, width: LADO_DEL_ANIMAL, height: LADO_DEL_ANIMAL }, estiloAnimal]}
      >
        <Image
          source={fallo ? animal.imagenDeRespaldo : animal.imagen}
          onError={() => setFallo(true)}
          contentFit="contain"
          contentPosition="bottom right"
          style={{ width: LADO_DEL_ANIMAL, height: LADO_DEL_ANIMAL }}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
      {/* Una sola columna con el texto de arriba y los días abajo: si un nombre largo da otra línea, la tarjeta
          crece en vez de que los dos bloques se pisen. */}
      <View style={{ flex: 1, minHeight: ALTO - 2, padding: 20, paddingRight: 160, justifyContent: 'space-between', gap: 14 }}>
        <View>
          {celebrar ? (
            <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', marginBottom: 2 }]}>
              ¡Entraste en la Fase {numero}!
            </Text>
          ) : null}
          <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1.4 }]}>
            FASE {numero} DE {totalDeFases}
          </Text>
          <Text style={{ fontFamily: 'Fraunces_700Bold', ...tamanoDelTitulo(nombreDeLaFase), letterSpacing: -0.5, color: c.textStrong, marginTop: 6 }}>
            {nombreDeLaFase}
          </Text>
          <Text style={[t.body, { color: c.textSoft, marginTop: 8, fontSize: 16 }]}>
            Tu animal: <Text style={{ fontFamily: 'Jost_500Medium', color: c.textStrong }}>{animal.nombre}</Text>
          </Text>
        </View>
        <View style={{ width: 170 }}>
          {diasDeLaFase ? (
            <>
              <Text style={[t.body, { color: c.textStrong, fontFamily: 'Jost_500Medium', fontSize: 17 }]}>
                Día {diasDeLaFase.dia} de {diasDeLaFase.total}{' '}
                <Text style={{ fontFamily: 'Jost_400Regular', color: c.textSoft, fontSize: 15 }}>de esta fase</Text>
              </Text>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.border, marginTop: 10, marginBottom: 8, overflow: 'hidden' }}>
                <View style={{ width: `${avance * 100}%`, height: '100%', borderRadius: 4, backgroundColor: c.gold }} />
              </View>
            </>
          ) : null}
          {dichoDelDia ? <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>{dichoDelDia}</Text> : null}
        </View>
      </View>
    </View>
  );
}
