import { fuentes } from '../../../theme/fuentes';
import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { dark } from '../../../theme/tokens';
import { ALTO_DE_LA_TARJETA, ANCHO_DE_LA_TARJETA } from '../utils/medidasDelPodio';
import type { PodioParaCompartir, PuestoParaCompartir } from '../utils/podioParaCompartir';

/**
 * La imagen del podio que se comparte (spec 006 del backend, pedido del dueño: «que haya opción para
 * descargar en los podios»): vertical 9:16, con el fénix de Renaser, la fecha, el nombre de la tabla, el podio
 * de los tres primeros y del 4.º al 10.º, con nombre completo y puntaje, en los colores de la marca.
 *
 * ## Cómo se arma
 *
 * - **Es una vista de la app que se captura** (`captureRef`, en `useCompartirPodio`), no un dibujo aparte: se
 *   monta FUERA de la pantalla, solo mientras se genera la imagen, y se desmonta al terminar. Por eso es una
 *   tarjeta completa con su propio fondo y no depende de nada que la rodee.
 * - **El lienzo mide 540 × 960 dp y sale a 1080 × 1920 px** (`utils/medidasDelPodio`, el doble; por qué a la
 *   mitad, ahí). Todo lo de abajo está dado en esa escala: 1 dp = 2 px de la imagen, así que el nombre a 19 dp
 *   se lee como 38 px en una historia de Instagram.
 * - **Siempre oscura, sin importar el tema**: la imagen sale de la app y no puede cambiar de aspecto según
 *   quién la genere. Usa la paleta oscura de la marca (`dark` de los tokens) y los metales del podio de la app
 *   (`PodioRanking`: oro, plata y bronce), sin el 3D: el podio es PLANO a propósito, porque los transformados y
 *   las animaciones del de la app no se capturan bien.
 * - **Tipografía de la app**: la fuente display solo en el título (≥ 24); todo lo demás, los otros roles, en tipo oración y sin
 *   espaciar letras. Las cifras, tabulares.
 * - **Nada se sale de su lugar.** Los nombres ya llegan recortados con «…» (`recortarNombre`) y además cada uno
 *   vive en una caja de ancho fijo con `numberOfLines` (2 en el podio, 1 en la lista): si un nombre con letras
 *   muy anchas no cupiera, la propia vista lo corta. Los lugares del podio sin nadie se dibujan libres, como en
 *   la app.
 * - **Sin íconos ni emojis**: la numeración va en texto. Un SVG o un emoji se capturan distinto en Android, iOS y
 *   web, y esta imagen tiene que verse igual en los tres.
 *
 * `onListo` avisa que el fénix terminó de cargar (o falló): `captureRef` no espera a las imágenes, así que quien
 * captura espera esa señal. Con el fénix caído la tarjeta sigue siendo válida (queda el texto).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FENIX = require('../../../../assets/imagenes/fenix-renaser.png');

/* Los metales del podio de la app (`PodioRanking`), en dos paradas: plano, con apenas un gesto de profundidad. */
const ORO = { frente: ['#FFE9AE', '#C29A48'] as const, texto: '#1E1B18' };
const PLATA = { frente: ['#D8D8D8', '#8A8A8A'] as const, texto: '#20201E' };
const BRONCE = { frente: ['#D89A5E', '#8F5A2A'] as const, texto: '#25190F' };

/** Alto de la lista: filas de 48 en un panel con borde de 1. */
const ALTO_DE_FILA = 48;
const FILAS_DE_LA_LISTA = 7;

export const TarjetaDelPodioParaCompartir = forwardRef<View, { podio: PodioParaCompartir; onListo?: () => void }>(
  function TarjetaDelPodioParaCompartir({ podio, onListo }, ref) {
    const [primero, segundo, tercero] = podio.podio;
    return (
      /* `collapsable={false}`: en Android, react-native-view-shot necesita que la vista exista de verdad en
         el árbol nativo (si no, la «optimiza» fuera y la captura sale vacía). Mismo caso que `SignatureCanvas`. */
      <View ref={ref} collapsable={false} style={estilos.lienzo}>
        <LinearGradient colors={['#241D14', '#14100B', '#0B0908']} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={estilos.marco} />

        <View style={estilos.cabecera}>
          <View style={estilos.fenix}>
            <Image
              source={FENIX}
              style={estilos.fenixImagen}
              contentFit="cover"
              transition={0}
              onLoad={onListo}
              onError={onListo}
              accessible={false}
            />
          </View>
          {/* Spec 024: con formación conocida, su nombre («Diplomado Renaser»); si no, la línea de siempre. */}
          <Text style={estilos.marca} numberOfLines={1}>
            {podio.formacion ?? 'Renaser · 90 días'}
          </Text>
          <Text style={estilos.titulo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {podio.titulo}
          </Text>
          <Text style={estilos.detalle} numberOfLines={1}>
            {podio.detalle}
          </Text>
          <Text style={estilos.fecha}>{podio.fecha}</Text>
        </View>

        <View style={estilos.podio}>
          <ColumnaDelPodio lado="plata" numero={2} puesto={segundo} metal={PLATA} alto={92} ancho={136} />
          <ColumnaDelPodio lado="oro" numero={1} puesto={primero} metal={ORO} alto={120} ancho={160} destacado />
          <ColumnaDelPodio lado="bronce" numero={3} puesto={tercero} metal={BRONCE} alto={72} ancho={136} />
        </View>

        {podio.lista.length > 0 ? (
          <View style={estilos.lista}>
            {podio.lista.map((p, indice) => (
              <View
                key={`${p.posicion}-${indice}`}
                style={[estilos.fila, indice < podio.lista.length - 1 && estilos.filaConLinea]}
              >
                <Text style={estilos.filaPosicion}>#{p.posicion}</Text>
                <Text style={estilos.filaNombre} numberOfLines={1}>
                  {p.nombre}
                </Text>
                <Text style={estilos.filaPuntaje} numberOfLines={1}>
                  {p.puntaje}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={estilos.pie}>Comunidad Renaser</Text>
      </View>
    );
  },
);

function ColumnaDelPodio({
  lado,
  numero,
  puesto,
  metal,
  alto,
  ancho,
  destacado = false,
}: {
  lado: 'oro' | 'plata' | 'bronce';
  numero: 1 | 2 | 3;
  puesto: PuestoParaCompartir | null;
  metal: { frente: readonly [string, string]; texto: string };
  alto: number;
  ancho: number;
  destacado?: boolean;
}) {
  const libre = puesto === null;
  return (
    <View style={[estilos.columna, { width: ancho }]} testID={`podio-${lado}`}>
      <Text
        style={[estilos.columnaNombre, destacado && estilos.columnaNombreDestacado, libre && estilos.columnaLibre]}
        numberOfLines={2}
      >
        {libre ? 'Lugar libre' : puesto.nombre}
      </Text>
      <Text style={[estilos.columnaPuntaje, libre && estilos.columnaLibre]} numberOfLines={1}>
        {libre ? '—' : puesto.puntaje}
      </Text>
      {libre ? (
        <View style={[estilos.pedestal, estilos.pedestalLibre, { height: alto }]}>
          <Text style={[estilos.pedestalNumero, { color: dark.micro, fontSize: destacado ? 44 : 36 }]}>{numero}</Text>
        </View>
      ) : (
        <LinearGradient colors={[metal.frente[0], metal.frente[1]]} style={[estilos.pedestal, { height: alto }]}>
          <Text style={[estilos.pedestalNumero, { color: metal.texto, fontSize: destacado ? 44 : 36 }]}>{numero}</Text>
        </LinearGradient>
      )}
    </View>
  );
}

const CIFRAS: ('tabular-nums')[] = ['tabular-nums'];

const estilos = StyleSheet.create({
  lienzo: {
    width: ANCHO_DE_LA_TARJETA,
    height: ALTO_DE_LA_TARJETA,
    overflow: 'hidden',
    backgroundColor: '#0B0908',
    paddingHorizontal: 44,
    paddingTop: 48,
    paddingBottom: 36,
  },
  /* Un marco fino dorado, adentro del borde: el «papel» de la imagen. */
  marco: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 28,
  },
  cabecera: { alignItems: 'center' },
  fenix: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    borderColor: dark.gold,
    overflow: 'hidden',
    backgroundColor: '#F7F1EA',
  },
  fenixImagen: { width: '100%', height: '100%' },
  marca: { marginTop: 12, fontFamily: fuentes.negrita, fontSize: 16, lineHeight: 20, color: dark.gold },
  titulo: {
    marginTop: 12,
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: fuentes.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
    color: dark.textStrong,
  },
  detalle: {
    marginTop: 6,
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: fuentes.regular,
    fontSize: 17,
    lineHeight: 22,
    color: dark.textSoft,
  },
  fecha: { marginTop: 6, fontFamily: fuentes.negrita, fontSize: 16, lineHeight: 22, color: dark.gold },

  podio: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
  },
  columna: { alignItems: 'center' },
  columnaNombre: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: fuentes.negrita,
    fontSize: 17,
    lineHeight: 22,
    color: dark.textStrong,
  },
  columnaNombreDestacado: { fontSize: 19, lineHeight: 24 },
  columnaPuntaje: {
    marginTop: 2,
    marginBottom: 10,
    fontFamily: fuentes.negrita,
    fontSize: 17,
    lineHeight: 22,
    color: dark.gold,
    fontVariant: CIFRAS,
  },
  columnaLibre: { color: dark.micro, fontFamily: fuentes.regular },
  pedestal: {
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalLibre: {
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: dark.borderStrong,
    backgroundColor: dark.goldWash,
  },
  pedestalNumero: { fontFamily: fuentes.negrita, fontVariant: CIFRAS },

  lista: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    maxHeight: ALTO_DE_FILA * FILAS_DE_LA_LISTA + 2,
  },
  fila: { height: ALTO_DE_FILA, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  filaConLinea: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dark.divider },
  filaPosicion: { width: 46, fontFamily: fuentes.negrita, fontSize: 18, color: dark.gold, fontVariant: CIFRAS },
  filaNombre: { flex: 1, flexShrink: 1, fontFamily: fuentes.media, fontSize: 19, color: dark.textStrong },
  filaPuntaje: { fontFamily: fuentes.negrita, fontSize: 18, color: dark.gold, fontVariant: CIFRAS, textAlign: 'right' },

  /* Pegado al fondo: con menos de 10 personas la lista termina antes y el pie sigue abajo, no flota a medias. */
  pie: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    textAlign: 'center',
    fontFamily: fuentes.media,
    fontSize: 15,
    lineHeight: 18,
    color: dark.textSoft,
  },
});
