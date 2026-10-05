import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';

export interface FaseDelMetodo {
  numero: number;
  titulo: string;
  rango: string;
  icono: IconName;
  frase: string;
  resumen: string;
  puntos: string[];
}

/** Entre una página y la siguiente. Con el relleno de la pantalla (24) asoman 12 px de la próxima. */
const SEPARACION_PAGINAS = 12;

/** La página más cercana a `x`, dentro de `[0, total - 1]`. */
export function paginaEn(x: number, paso: number, total: number): number {
  'worklet';
  if (paso <= 0) return 0;
  return Math.max(0, Math.min(total - 1, Math.round(x / paso)));
}

/**
 * Las cuatro fases de «El Método Renaser» como páginas que se deslizan con el dedo (rediseño de Yo,
 * 2026-10-05).
 *
 * **Antes**: una sola tarjeta que «giraba» en 3D con el `Animated` de React Native
 * (`useNativeDriver: false`, en el hilo de JavaScript), dos flechas redondas y cuatro puntos de 8 px
 * que había que acertar con el dedo. **Ahora** (`animate-expo`, `apple-design`):
 *
 * - Es un `ScrollView` horizontal que engancha página por página (`snapToInterval`, y en la web el
 *   `scroll-snap` del CSS, que la rueda del mouse sí respeta). El dedo arrastra la página 1:1, el
 *   impulso decide adónde llega, y se puede agarrar y dar vuelta a mitad de camino: todo lo hace el
 *   desplazamiento del sistema, sin animación escrita a mano.
 * - Asoma el borde de la página siguiente: es lo que dice «esto se desliza» sin un texto que lo
 *   explique.
 * - Los puntos son solo un indicador: siguen al dedo (se enciende el de la página a la vista) en el
 *   hilo de la interfaz, y no se tocan. Para el lector de pantalla son un control ajustable: «Fase 2 de 4», y deslizar
 *   arriba o abajo cambia de fase.
 * - Debajo queda una sola acción escrita, «Siguiente fase», para quien no desliza.
 * - Los colores pastel a mano (`#90CAF9`, `#FFE082`…) se fueron: el amarillo no se veía sobre crema.
 *   Todo sale del tema.
 *
 * La página actual se le avisa a React solo cuando cambia (al cruzar la mitad), no en cada cuadro.
 */
export function MetodoEnPaginas({ fases, margenLateral }: { fases: FaseDelMetodo[]; margenLateral: number }) {
  const { c } = useTheme();
  const lista = useAnimatedRef<Animated.ScrollView>();
  const [anchoVisible, setAnchoVisible] = useState(0);
  const [pagina, setPagina] = useState(0);
  const desplazamiento = useSharedValue(0);
  const paginaActual = useSharedValue(0);

  const anchoPagina = Math.max(0, anchoVisible - margenLateral * 2);
  const paso = anchoPagina + SEPARACION_PAGINAS;
  const total = fases.length;
  const ultima = pagina === total - 1;

  const alDesplazar = useAnimatedScrollHandler({
    onScroll: e => {
      desplazamiento.set(e.contentOffset.x);
      const nueva = paginaEn(e.contentOffset.x, paso, total);
      if (nueva !== paginaActual.get()) {
        paginaActual.set(nueva);
        scheduleOnRN(setPagina, nueva);
      }
    },
  });

  const irA = (indice: number) => {
    const destino = Math.max(0, Math.min(total - 1, indice));
    lista.current?.scrollTo({ x: destino * paso, animated: true });
  };

  const alAccionAccesible = (evento: AccessibilityActionEvent) => {
    irA(evento.nativeEvent.actionName === 'increment' ? pagina + 1 : pagina - 1);
  };

  return (
    <View style={{ gap: space.gap }}>
      <View
        onLayout={(e: LayoutChangeEvent) => setAnchoVisible(e.nativeEvent.layout.width)}
        style={{ marginHorizontal: -margenLateral }}
      >
        {anchoPagina > 0 ? (
          <Animated.ScrollView
            ref={lista}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={paso}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onScroll={alDesplazar}
            scrollEventThrottle={16}
            style={Platform.OS === 'web' ? (ENGANCHE_WEB as object) : undefined}
            contentContainerStyle={{ paddingHorizontal: margenLateral, gap: SEPARACION_PAGINAS }}
          >
            {fases.map(fase => (
              <PaginaDeFase key={fase.numero} fase={fase} ancho={anchoPagina} />
            ))}
          </Animated.ScrollView>
        ) : null}
      </View>

      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Fases del método"
        accessibilityValue={{ text: `Fase ${pagina + 1} de ${total}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={alAccionAccesible}
        style={estilos.puntos}
      >
        {fases.map((fase, i) => (
          <Punto key={fase.numero} indice={i} paso={paso} desplazamiento={desplazamiento} />
        ))}
      </View>

      <Presionable
        onPress={() => irA(ultima ? 0 : pagina + 1)}
        accessibilityRole="button"
        accessibilityLabel={ultima ? 'Volver a la fase 1' : 'Siguiente fase'}
        style={[estilos.siguiente, { borderColor: c.borderStrong, backgroundColor: c.cardBg }]}
      >
        <Text style={[estilos.siguienteTexto, { color: c.textStrong }]}>{ultima ? 'Volver a la fase 1' : 'Siguiente fase'}</Text>
        {ultima ? null : <Icon name="arrow" size={TAMANO_ICONO.chico} color={c.goldInk} />}
      </Presionable>
    </View>
  );
}

/** En la web, la rueda del mouse y el trackpad no conocen `snapToInterval`: engancha el CSS. */
const ENGANCHE_WEB = { scrollSnapType: 'x mandatory' };
const ALINEACION_WEB = { scrollSnapAlign: 'center' };

function PaginaDeFase({ fase, ancho }: { fase: FaseDelMetodo; ancho: number }) {
  const { c, t } = useTheme();
  return (
    <View
      style={[
        estilos.pagina,
        { width: ancho, borderColor: c.border, backgroundColor: c.cardBg },
        Platform.OS === 'web' ? (ALINEACION_WEB as object) : null,
      ]}
    >
      <View style={estilos.cabecera}>
        <View style={[estilos.disco, { backgroundColor: c.goldWash }]}>
          <Icon name={fase.icono} size={TAMANO_ICONO.grande} color={c.goldInk} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.small, estilos.rotulo, { color: c.goldInk }]}>{`Fase ${fase.numero} · ${fase.rango}`}</Text>
          <Text accessibilityRole="header" style={[t.cardTitle, estilos.tituloFase, { color: c.textStrong }]}>
            {fase.titulo}
          </Text>
        </View>
      </View>
      <Text style={[estilos.frase, { color: c.goldInk }]}>{`“${fase.frase}”`}</Text>
      <Text style={[t.body, { color: c.textSoft }]}>{fase.resumen}</Text>
      <View style={{ gap: 10, paddingTop: 2 }}>
        {fase.puntos.map(punto => (
          <View key={punto} style={estilos.punto}>
            <View style={[estilos.vineta, { backgroundColor: c.gold }]} />
            <Text style={[t.body, { flex: 1, color: c.textSoft }]}>{punto}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Un punto del indicador, como los de iOS: todos del mismo tamaño, y el de la página a la vista se
 * enciende de dorado. Se anima solo la opacidad de la capa dorada (gratis, en el hilo de la interfaz):
 * cambiar el ancho de un punto movería a sus vecinos en cada cuadro.
 */
function Punto({ indice, paso, desplazamiento }: { indice: number; paso: number; desplazamiento: SharedValue<number> }) {
  const { c } = useTheme();
  const estilo = useAnimatedStyle(() => {
    const distancia = paso > 0 ? Math.abs(desplazamiento.get() / paso - indice) : indice;
    return { opacity: interpolate(distancia, [0, 1], [1, 0], Extrapolation.CLAMP) };
  });
  return (
    <View style={[estilos.puntoIndicador, { backgroundColor: c.borderStrong }]}>
      <Animated.View style={[StyleSheet.absoluteFill, estilos.puntoIndicador, { backgroundColor: c.gold }, estilo]} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, gap: 13 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  disco: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 14 },
  tituloFase: { fontSize: 19, lineHeight: 25 },
  frase: { fontFamily: 'Jost_400Regular', fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  punto: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  vineta: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  puntos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 24 },
  puntoIndicador: { width: 8, height: 8, borderRadius: 4 },
  siguiente: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  siguienteTexto: { fontFamily: 'Jost_500Medium', fontSize: 16 },
});
