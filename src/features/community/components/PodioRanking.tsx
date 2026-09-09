import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Polygon,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/ThemeContext';

/** Una posición del podio, tal como la arma `ComunidadScreen` con los datos reales del ranking. */
export interface PuestoPodio {
  name: string;
  score: string;
}

interface PodioRankingProps {
  /**
   * Los tres primeros puestos. Cualquiera puede venir en `null`, y el podio se pinta igual con ese
   * lugar VACÍO: es una decisión de producto del 2026-09-07, no una tolerancia a datos faltantes.
   * Antes, sin puntos en el corte, no había podio —solo una tarjeta gris avisándolo— y la sección
   * arrancaba explicando lo que le falta al backend. Ahora el escenario está armado desde el primer
   * día y los lugares libres se leen como una invitación a ocuparlos.
   */
  top1: PuestoPodio | null;
  top2: PuestoPodio | null;
  top3: PuestoPodio | null;
  /**
   * `true` mientras la sección Ranking es la que se está mirando. Dispara —y repite— la entrada, y
   * apaga todos los bucles al salir: un podio que no se ve no tiene por qué seguir animándose.
   */
  activo: boolean;
}

/**
 * En web `useNativeDriver: true` no existe: react-native-web cae a la animación por JS y encima
 * avisa por consola una vez ("the native animated module is missing"). Se le dice `false` de
 * entrada para no ensuciar la consola del build de Vercel; en Android e iOS sí va por el hilo
 * nativo, que es donde importa para que nada de esto le pese al scroll.
 */
const NATIVO = Platform.OS !== 'web';

/** Alto de la cara frontal de cada bloque. El oro manda: los otros dos se leen contra él. */
const ALTO_ORO = 118;
const ALTO_PLATA = 86;
const ALTO_BRONCE = 66;
/**
 * Alto de la cara superior antes de acostarse. Proyectada (`rotateX: -61°`) queda en torno a la
 * mitad: es la franja de "tapa" que se ve. Los números salen de mirarla renderizada, no de la
 * trigonometría a secas — por debajo de ~30 la tapa se lee como un borde y la caja vuelve a ser un
 * rectángulo.
 */
const ALTO_TAPA = 34;
/** Alto del reflejo bajo cada bloque. */
const ALTO_REFLEJO = 26;

/** Posición horizontal de cada chispa, en porcentaje del ancho del escenario. */
const CHISPAS = [30, 42, 50, 58, 70];

/**
 * Podio de honor del Ranking.
 *
 * No es una tarjeta con tres rectángulos: es un escenario. Todo lo que hay acá está para que se
 * lea como un objeto con volumen, iluminado, y no como una lista de tres cosas.
 *
 * **El 3D es real, no un dibujo que lo simula.** Sale entero de los transforms que React Native ya
 * trae, sin ninguna dependencia nueva: three.js o expo-gl habrían traído un contexto WebGL, medio
 * mega de bundle y una superficie más que validar aparte en el build web, para un adorno de una
 * sola pantalla.
 *
 * - Cada bloque tiene DOS caras: la frontal y una tapa superior en fuga (`rotateX: -61°` con
 *   `transformOrigin: 'bottom'`, o sea que la tapa se acuesta hacia atrás pivotando justo sobre el
 *   canto de la cara frontal). Eso es lo que convierte un rectángulo en una caja.
 * - `perspective: 900` por columna: en React Native la perspectiva no se hereda, es un transform
 *   más de cada hijo. Sin ella, las rotaciones aplastan en vez de dar profundidad.
 * - `transformOrigin: 'bottom'` en las columnas clava el pivote en el piso. Sin esto los bloques
 *   rotan alrededor de su centro y flotan; con esto se levantan desde la base, como algo apoyado.
 * - Las columnas laterales giran 10° hacia el centro. Es lo que arma el escenario: las tres miran
 *   a quien está enfrente y se ve la cara interna de cada bloque lateral.
 *
 * **Lo que se mueve, y por qué:**
 *
 * - *Entrada*: los bloques suben del piso con `spring` (rebote = peso) escalonados de menor a
 *   mayor, así la mirada termina en el primer puesto. El `rotateX` va de 34° a 8° durante la
 *   subida: el bloque se endereza mientras aparece.
 * - *Balanceo*: el escenario entero oscila ±2.5° sobre el eje vertical, en bucle de 7 segundos.
 *   Es el detalle que lo vuelve inconfundiblemente tridimensional — un objeto plano no cambia de
 *   cara al girar; este sí.
 * - *Foco*: un degradado radial en SVG detrás del primer puesto (`react-native-svg`, que el
 *   proyecto ya usa). No hay degradados radiales en `expo-linear-gradient`, de ahí las dos
 *   librerías conviviendo acá.
 * - *Corona*: flota arriba y abajo en bucle, con un halo que late detrás.
 * - *Chispas*: cinco puntos dorados que suben y se desvanecen con retrasos distintos. Son lo que
 *   hace que el escenario nunca esté del todo quieto.
 * - *Brillo*: un barrido de luz cruza el bloque de oro, ocupado o vacío. Vacío es cuando más falta
 *   hace: señala el lugar libre.
 * - *Reflejo*: cada bloque se espeja hacia abajo, invertido y desvaneciéndose. Es lo que convierte
 *   el fondo en un piso pulido en lugar de un vacío.
 *
 * **Por qué el escenario es oscuro incluso en modo claro:** el oro necesita fondo oscuro para
 * brillar; sobre crema se apaga y todo el podio se lee lavado. No rompe el estilo de la app —las
 * portadas de los cursos ya son bloques oscuros dentro del modo claro— y el borde sigue siendo el
 * oro del tema.
 */
export function PodioRanking({ top1, top2, top3, activo }: PodioRankingProps) {
  const { c } = useTheme();

  // Un valor por columna, de 0 (bajo el piso) a 1 (apoyada).
  const oro = useRef(new Animated.Value(0)).current;
  const plata = useRef(new Animated.Value(0)).current;
  const bronce = useRef(new Animated.Value(0)).current;
  // Bucles de ambiente.
  const brillo = useRef(new Animated.Value(0)).current;
  const balanceo = useRef(new Animated.Value(0)).current;
  const corona = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const chispas = useRef(CHISPAS.map(() => new Animated.Value(0))).current;

  // Los nombres entran en las dependencias para que un corte nuevo del ranking (cambió el podio)
  // vuelva a levantarlo: el podio se rearma, no se actualiza en silencio debajo del dedo.
  const nombreOro = top1?.name ?? null;
  const nombrePlata = top2?.name ?? null;
  const nombreBronce = top3?.name ?? null;

  useEffect(() => {
    if (!activo) return;

    [oro, plata, bronce, brillo, balanceo, corona, halo, ...chispas].forEach(v => v.setValue(0));

    const subida = (valor: Animated.Value, friccion: number) =>
      Animated.spring(valor, { toValue: 1, friction: friccion, tension: 42, useNativeDriver: NATIVO });

    const entrada = Animated.stagger(150, [
      subida(bronce, 8),
      subida(plata, 7.5),
      // Menos fricción = rebote más largo. El primer puesto se lo puede permitir.
      subida(oro, 5.5),
    ]);

    /** Ida y vuelta continua entre 0 y 1. La base de todos los bucles de ambiente. */
    const vaiven = (valor: Animated.Value, duracion: number, retraso = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(retraso),
          Animated.timing(valor, {
            toValue: 1,
            duration: duracion,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: NATIVO,
          }),
          Animated.timing(valor, {
            toValue: 0,
            duration: duracion,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: NATIVO,
          }),
        ])
      );

    const barridoBrillo = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(brillo, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVO,
        }),
        Animated.timing(brillo, { toValue: 0, duration: 0, useNativeDriver: NATIVO }),
      ])
    );

    // Cada chispa sube de una sola vez y vuelve a empezar desde abajo (de ahí el `sequence` con el
    // retorno en duración 0, y no un vaivén: una chispa no baja).
    const subidaChispas = chispas.map((valor, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 420),
          Animated.timing(valor, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVO,
          }),
          Animated.timing(valor, { toValue: 0, duration: 0, useNativeDriver: NATIVO }),
        ])
      )
    );

    const bucles = [
      barridoBrillo,
      vaiven(balanceo, 3500),
      vaiven(corona, 1600),
      vaiven(halo, 1400),
      ...subidaChispas,
    ];

    entrada.start();
    bucles.forEach(b => b.start());

    // Sin esto, salir del Ranking deja diez bucles corriendo para siempre contra una vista que ya
    // no se pinta.
    return () => {
      entrada.stop();
      bucles.forEach(b => b.stop());
    };
  }, [activo, nombreOro, nombrePlata, nombreBronce, oro, plata, bronce, brillo, balanceo, corona, halo, chispas]);

  return (
    <View style={[styles.marco, { borderColor: c.gold }]}>
      <LinearGradient colors={['#241D14', '#14100B', '#0B0908']} style={StyleSheet.absoluteFill} />

      {/*
        Foco de luz. `width`/`height` al 100% NO son decorativos: en web react-native-svg emite un
        `<svg>` del DOM, que es un elemento reemplazado — posicionado en absoluto y sin ancho, el
        navegador ignora `right`/`bottom` y cae a 300x150 px. Es exactamente el bug E-136 que ya
        mordió en la firma del onboarding (ver `SignatureCanvas`).
      */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="focoPodio" cx="50%" cy="38%" r="62%">
            <Stop offset="0" stopColor={c.gold} stopOpacity="0.34" />
            <Stop offset="0.55" stopColor={c.gold} stopOpacity="0.08" />
            <Stop offset="1" stopColor={c.gold} stopOpacity="0" />
          </RadialGradient>
          <SvgLinearGradient id="hazPodio" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFD678" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#FFD678" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#focoPodio)" />
        {/* Haz de luz cayendo sobre el primer puesto: un trapecio que se abre desde el techo. Es
            lo que termina de convertir la tarjeta en un escenario. */}
        <Polygon points="45,0 55,0 72,78 28,78" fill="url(#hazPodio)" />
      </Svg>

      {/* Chispas: viven fuera del escenario que se balancea, para que no se vayan de lado con él. */}
      {chispas.map((valor, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.chispa,
            {
              left: `${CHISPAS[i]}%`,
              backgroundColor: c.gold,
              opacity: valor.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.9, 0.5, 0] }),
              transform: [
                { translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [0, -140] }) },
                { scale: valor.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.4] }) },
              ],
            },
          ]}
        />
      ))}

      {/* Escenario: es lo único que se balancea, así el foco y las chispas quedan quietos detrás. */}
      <Animated.View
        style={[
          styles.escenario,
          {
            transform: [
              { perspective: 1200 },
              { rotateY: balanceo.interpolate({ inputRange: [0, 1], outputRange: ['-2.5deg', '2.5deg'] }) },
            ],
          },
        ]}
      >
        <ColumnaPodio
          puesto={top2}
          avance={plata}
          giroY={10}
          alto={ALTO_PLATA}
          numero="2"
          emoji="🥈"
          etiqueta="PLATA"
          etiquetaVacia="LIBRE"
          nombreVacio="Libre"
          frente={['#D8D8D8', '#9A9A9A', '#6A6A6A']}
          tapa={['#F2F2F2', '#C9C9C9']}
          frenteVacio={['rgba(226,226,226,0.30)', 'rgba(226,226,226,0.07)']}
          tapaVacia={['rgba(240,240,240,0.34)', 'rgba(240,240,240,0.12)']}
          bordeMedalla="#E0E0E0"
          colorNumero="#20201E"
          colorEtiqueta="#3A3A3A"
        />

        <ColumnaPodio
          puesto={top1}
          avance={oro}
          brillo={brillo}
          corona={corona}
          halo={halo}
          giroY={0}
          alto={ALTO_ORO}
          numero="1"
          emoji="👑"
          etiqueta="ORO LÍDER"
          etiquetaVacia="TU LUGAR"
          nombreVacio="Tu lugar"
          destacado
          frente={['#FFE9AE', '#E8C97F', '#C29A48', '#8E6D2A']}
          tapa={['#FFF6DC', '#F0D89A']}
          frenteVacio={[c.goldWash, c.goldWash]}
          tapaVacia={[c.goldWash, c.goldWash]}
          bordeMedalla={c.gold}
          colorNumero="#1E1B18"
          colorEtiqueta="#1E1B18"
        />

        <ColumnaPodio
          puesto={top3}
          avance={bronce}
          giroY={-10}
          alto={ALTO_BRONCE}
          numero="3"
          emoji="🥉"
          etiqueta="BRONCE"
          etiquetaVacia="LIBRE"
          nombreVacio="Libre"
          frente={['#D89A5E', '#A56B33', '#6E4319']}
          tapa={['#F0BE8A', '#C98A50']}
          frenteVacio={['rgba(224,150,80,0.34)', 'rgba(224,150,80,0.08)']}
          tapaVacia={['rgba(236,172,104,0.36)', 'rgba(236,172,104,0.13)']}
          bordeMedalla="#CD7F32"
          colorNumero="#25190F"
          colorEtiqueta="#3A2814"
        />
      </Animated.View>

      {/* Canto del escenario: la línea de luz donde termina el piso. */}
      <LinearGradient
        colors={['rgba(212,160,23,0)', c.goldWash, 'rgba(212,160,23,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cantoPiso}
        pointerEvents="none"
      />
    </View>
  );
}

type Degradado = [string, string, ...string[]];

interface ColumnaPodioProps {
  /** `null` = lugar vacío. Toda la columna cambia de piel, no solo el texto. */
  puesto: PuestoPodio | null;
  /** Valor 0→1 que levanta esta columna del piso. */
  avance: Animated.Value;
  /** Solo la columna de oro los recibe: barrido de luz, flotación de la corona y latido del halo. */
  brillo?: Animated.Value;
  corona?: Animated.Value;
  halo?: Animated.Value;
  /** Grados de giro sobre el eje vertical: hacia dónde mira el bloque. */
  giroY: number;
  alto: number;
  numero: string;
  emoji: string;
  etiqueta: string;
  /** Qué dice el bloque cuando el lugar está libre (p. ej. "TU LUGAR" en el de oro). */
  etiquetaVacia: string;
  nombreVacio: string;
  /** El de oro: corona flotante, halo, brillo y tipografía más grande. */
  destacado?: boolean;
  frente: Degradado;
  tapa: Degradado;
  frenteVacio: Degradado;
  tapaVacia: Degradado;
  bordeMedalla: string;
  colorNumero: string;
  colorEtiqueta: string;
}

/**
 * Una de las tres columnas: medalla, nombre, puntaje, la caja 3D y su reflejo.
 *
 * El lugar vacío no es la columna ocupada con otros textos. Cambia el relleno (translúcido en vez
 * de metálico), el borde (punteado), la tapa (apenas insinuada) y el color del número y la
 * etiqueta, que sobre un relleno translúcido tienen que ser claros y no oscuros. Los metálicos
 * están pensados sobre un bloque sólido y sobre uno translúcido se pierden.
 */
function ColumnaPodio({
  puesto,
  avance,
  brillo,
  corona,
  halo,
  giroY,
  alto,
  numero,
  emoji,
  etiqueta,
  etiquetaVacia,
  nombreVacio,
  destacado,
  frente,
  tapa,
  frenteVacio,
  tapaVacia,
  bordeMedalla,
  colorNumero,
  colorEtiqueta,
}: ColumnaPodioProps) {
  const { c, t } = useTheme();
  const vacio = puesto === null;
  /**
   * El punteado se reserva para el primer puesto. Es el signo de "acá falta alguien" y en los tres
   * lugares a la vez se volvía ruido: cuatro rectángulos y tres círculos de rayitas leían como un
   * boceto sin terminar en vez de como un podio esperando dueño. Plata y bronce quedan con un
   * contorno sólido apenas visible, que ya alcanza para distinguirlos de un bloque ocupado.
   */
  const punteado = Boolean(destacado);
  const bordeVacio = destacado ? c.gold : 'rgba(246,244,238,0.22)';

  return (
    <Animated.View
      style={[
        styles.columna,
        {
          opacity: avance,
          transformOrigin: 'bottom',
          transform: [
            { perspective: 900 },
            { translateY: avance.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) },
            { rotateX: avance.interpolate({ inputRange: [0, 1], outputRange: ['34deg', '8deg'] }) },
            { rotateY: `${giroY}deg` },
            { scale: avance.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
          ],
        },
      ]}
    >
      {/* Medalla, con halo que late detrás solo en el primer puesto. */}
      <View style={styles.zonaMedalla}>
        {halo && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                borderColor: c.gold,
                opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
              },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.medalla,
            destacado && styles.medallaGrande,
            vacio
              ? {
                  borderColor: bordeVacio,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderStyle: punteado ? 'dashed' : 'solid',
                }
              : { borderColor: bordeMedalla, backgroundColor: 'rgba(0,0,0,0.45)' },
            corona
              ? {
                  transform: [
                    { translateY: corona.interpolate({ inputRange: [0, 1], outputRange: [3, -5] }) },
                  ],
                }
              : null,
          ]}
        >
          <Text style={[{ fontSize: destacado ? 21 : 16 }, vacio && styles.emojiApagado]}>{emoji}</Text>
        </Animated.View>
      </View>

      <Text
        numberOfLines={1}
        style={[
          t.micro,
          styles.nombre,
          { color: vacio ? '#B8AE9E' : destacado ? c.goldInk : '#F0EDE6', fontFamily: destacado ? 'Jost_700Bold' : 'Jost_700Bold' },
        ]}
      >
        {vacio ? nombreVacio : puesto.name}
      </Text>
      <Text style={[t.micro, styles.puntaje, { color: vacio ? '#8A8073' : destacado ? c.goldInk : '#B8AE9E' }]}>
        {vacio ? '—' : destacado ? `🔥 ${puesto.score}` : puesto.score}
      </Text>

      {/* LA CAJA: tapa en fuga + cara frontal. */}
      <View style={[styles.caja, { height: alto }]}>
        <LinearGradient
          colors={vacio ? tapaVacia : tapa}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[
            styles.tapa,
            vacio && {
              borderWidth: punteado ? 1.4 : 1,
              borderBottomWidth: 0,
              borderStyle: punteado ? 'dashed' : 'solid',
              borderColor: bordeVacio,
            },
          ]}
          pointerEvents="none"
        />

        <LinearGradient
          colors={vacio ? frenteVacio : frente}
          style={[
            styles.frente,
            vacio && {
              borderWidth: punteado ? 1.4 : 1,
              borderStyle: punteado ? 'dashed' : 'solid',
              borderColor: bordeVacio,
            },
          ]}
        >
          <Text style={[styles.numero, destacado && styles.numeroGrande, { color: vacio ? '#EDE7DB' : colorNumero }]}>
            {numero}
          </Text>
          <Text
            style={[
              t.micro,
              styles.etiqueta,
              { color: vacio ? '#C3BAAA' : colorEtiqueta },
              destacado && !vacio && { fontFamily: 'Jost_700Bold' },
            ]}
          >
            {vacio ? etiquetaVacia : etiqueta}
          </Text>

          {brillo && (
            /* Barrido de luz. `pointerEvents="none"`: es decoración, no puede comerse un toque. */
            <Animated.View
              pointerEvents="none"
              style={[
                styles.brillo,
                {
                  transform: [
                    { rotate: '18deg' },
                    { translateX: brillo.interpolate({ inputRange: [0, 1], outputRange: [-70, 260] }) },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0)', vacio ? 'rgba(255,214,120,0.55)' : 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          )}
        </LinearGradient>

        {/* Reflejo en el piso: el mismo degradado invertido y desvaneciéndose. Es lo que hace que
            el fondo se lea como una superficie pulida y no como un vacío detrás del bloque. */}
        <View style={styles.reflejo} pointerEvents="none">
          <LinearGradient
            colors={vacio ? frenteVacio : frente}
            style={[StyleSheet.absoluteFill, { transform: [{ scaleY: -1 }] }]}
          />
          <LinearGradient
            colors={['rgba(11,9,8,0.30)', 'rgba(11,9,8,1)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
    </Animated.View>
  );
}

interface EntradaEscalonadaProps {
  /** Posición en la lista: es lo que define cuánto espera esta fila antes de entrar. */
  indice: number;
  /** `true` mientras la sección que contiene la lista es la que se mira. */
  activo: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Envoltorio que hace entrar a su contenido con un desvanecido y un deslizamiento corto desde la
 * derecha, escalonado según `indice`. Lo usa la tabla de clasificación del Ranking, debajo del
 * podio: las filas caen una detrás de otra en el mismo orden en el que se leen.
 *
 * El retraso se corta a los 700 ms (`TOPE_RETRASO`): con una tribu grande, escalonar linealmente
 * dejaría a la fila número cuarenta entrando ocho segundos tarde, o sea una lista que parece rota.
 * A partir de ahí entran todas juntas, que a esa altura del scroll ya nadie distingue.
 */
export function EntradaEscalonada({ indice, activo, style, children }: EntradaEscalonadaProps) {
  const valor = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!activo) {
      valor.setValue(0);
      return;
    }
    const animacion = Animated.timing(valor, {
      toValue: 1,
      duration: 320,
      delay: Math.min(indice * 55, TOPE_RETRASO),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVO,
    });
    animacion.start();
    return () => animacion.stop();
  }, [activo, indice, valor]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: valor,
          transform: [{ translateX: valor.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Ver `EntradaEscalonada`: tope del escalonado, en milisegundos. */
const TOPE_RETRASO = 700;

const styles = StyleSheet.create({
  marco: {
    borderWidth: 1.5,
    borderRadius: 22,
    height: 288,
    marginTop: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  escenario: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    // Deja el piso libre para el canto de luz y para que los reflejos no toquen el borde.
    paddingBottom: ALTO_REFLEJO + 8,
  },
  columna: {
    alignItems: 'center',
    flex: 1,
  },
  zonaMedalla: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  medalla: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallaGrande: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  emojiApagado: {
    opacity: 0.5,
  },
  nombre: {
    fontSize: 11,
    marginTop: 5,
    letterSpacing: 0,
  },
  puntaje: {
    fontSize: 10.5,
    letterSpacing: 0,
    marginBottom: 4,
  },
  caja: {
    width: '90%',
    // Reserva el hueco que ocupa la tapa, que se dibuja por fuera de la caja (`bottom: '100%'`).
    marginTop: 18,
  },
  /**
   * La tapa del bloque. Se acuesta hacia atrás pivotando sobre su canto inferior —que es
   * exactamente el canto superior de la cara frontal—, así las dos caras comparten arista y el
   * conjunto se lee como una caja y no como dos piezas sueltas.
   */
  tapa: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    height: ALTO_TAPA,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    transformOrigin: 'bottom',
    transform: [{ perspective: 520 }, { rotateX: '-61deg' }],
  },
  frente: {
    flex: 1,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    // Necesario para que el barrido de brillo se recorte contra los bordes del bloque.
    overflow: 'hidden',
  },
  reflejo: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: ALTO_REFLEJO,
    overflow: 'hidden',
    opacity: 0.6,
  },
  numero: {
    fontSize: 24,
    fontFamily: 'Jost_700Bold',
  },
  numeroGrande: {
    fontSize: 30,
  },
  etiqueta: {
    fontSize: 10.5,
    fontFamily: 'Jost_700Bold',
    letterSpacing: 0.4,
  },
  brillo: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    width: 44,
  },
  chispa: {
    position: 'absolute',
    bottom: 60,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  cantoPiso: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
    height: 1.5,
  },
});
