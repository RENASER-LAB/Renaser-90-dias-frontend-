import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { DURACION_MS } from '../../../theme/movimiento';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { IlustracionTopografica } from './IlustracionTopografica';
import {
  PROPORCION_DE_LA_IMAGEN,
  altoDeLaCabecera,
  conOpacidad,
  corrimientoDeLaImagen,
  inicioDelDegradado,
  paradasDelDegradado,
  solapeDelTitulo,
  type VarianteDeCabecera,
} from '../utils/cabeceraDelIngreso';

/**
 * La cabecera del login y de «Solicitar acceso» (rediseño del 2026-10-05, pedido del dueño): la
 * imagen del fénix a sangre —llega hasta arriba de todo, detrás de la hora y la batería, sin
 * franja blanca encima— que se funde con el fondo en un degradado largo, de modo que el título
 * «Iniciar sesión» queda apoyado sobre el final del degradado.
 *
 * > **Corregido 2026-10-05 (mismo día).** Primero terminaba en una onda SÓLIDA del color del fondo
 * > (`react-native-svg`) a la altura de las alas, y la cola del fénix no se veía. Pedido del dueño
 * > viéndolo en el emulador: «que sea transparente, y que no cubra toda la imagen porque no veo la
 * > cola». Ahora la cabecera es más alta (~54 % en el login), la imagen sube un poco y en vez de un
 * > corte hay un degradado. La onda dibujada se quitó a propósito, también como línea fina: la
 * > imagen ya trae sus propias ondas doradas abajo, y una raya más cruzaría justo la cola que el
 * > dueño pidió ver — volvería a ser un corte, sólo que más delgado.
 *
 * ## La imagen, y cómo cambiarla
 *
 * Son DOS archivos, uno por tema, y cambiar la imagen es reemplazar el archivo con el mismo nombre:
 *
 * - `assets/login/cabecera.webp` — modo claro (fondo crema).
 * - `assets/login/cabecera-oscura.webp` — modo oscuro (fondo casi negro).
 *
 * Tamaño esperado: **1024 × 1536, vertical** (la imagen se dibuja a esa proporción, a lo ancho de
 * la pantalla), con el sujeto en la mitad de arriba: la cabeza a ~24 % desde arriba y la cola
 * terminando a ~80 %. Si el sujeto de una imagen nueva queda en otra altura, se corrigen
 * `CABEZA_EN_LA_IMAGEN` y `COLA_EN_LA_IMAGEN` en `cabeceraDelIngreso`. Las actuales las generó el
 * dueño con ChatGPT y se pasaron a WebP (calidad 85, ~180 y ~240 KB) con:
 *
 *     magick original.png -strip -quality 85 -define webp:method=6 \
 *       -define webp:use-sharp-yuv=true assets/login/cabecera.webp
 *
 * Si algún día hay una sola versión, las dos líneas de `IMAGENES` apuntan al mismo archivo. Un PNG
 * también sirve: se cambia la extensión en `IMAGENES` (Metro necesita la ruta escrita tal cual, no
 * puede «buscar si existe»). Si la imagen no carga (`onError`), se dibuja `IlustracionTopografica`
 * en su lugar: la cabecera nunca queda vacía.
 *
 * ## Contraste
 *
 * El degradado llega a opaco (el color del fondo) en el borde de abajo de la cabecera, y el título
 * se mete `solapeDelTitulo` dp en ese tramo final, donde el fondo ya tapa ~90 % de la imagen: el
 * título queda por encima de 12:1 en los dos temas, y las etiquetas y campos, sobre fondo liso. No
 * hay otro texto sobre la imagen; el único control encima es «Volver», en una pastilla opaca.
 *
 * La imagen entra con un fundido de 160 ms (`transition`): un cuadro vacío que de golpe se llena se
 * lee como algo que se rompió; el fundido corto, como algo que llegó. El degradado no se anima.
 */
const IMAGENES = {
  light: require('../../../../assets/login/cabecera.webp'),
  dark: require('../../../../assets/login/cabecera-oscura.webp'),
} as const;

const PARADAS = paradasDelDegradado();

export function CabeceraDelIngreso({
  variante,
  alVolver,
  accesibilidadVolver = 'Volver a iniciar sesión',
}: {
  variante: VarianteDeCabecera;
  /** Si viene, una flecha arriba a la izquierda (todo menos el login mismo). */
  alVolver?: () => void;
  accesibilidadVolver?: string;
}) {
  const { c, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: ancho, height: altoDeLaVentana } = useWindowDimensions();
  const { horizontalPadding } = useResponsive();
  // Para qué tema falló la imagen (si falló): al cambiar de tema se vuelve a intentar con la otra.
  const [falloEn, setFalloEn] = useState<typeof mode | null>(null);

  const alto = altoDeLaCabecera(altoDeLaVentana, variante);
  const solape = solapeDelTitulo(variante);
  const corrimiento = corrimientoDeLaImagen({ ancho, alto, margenSuperior: insets.top, variante });
  const inicio = inicioDelDegradado(alto, variante);

  return (
    /* En el flujo ocupa `alto - solape`: el título de abajo se mete esos dp dentro de la cabecera,
       sobre el final del degradado. La capa de la imagen sí mide `alto` y sobresale hacia abajo. */
    <View style={{ height: alto - solape }}>
      {/* Decorativo: el lector de pantalla no lo anuncia y nunca roba un toque. */}
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.capa, { height: alto, backgroundColor: c.bg }]}
      >
        {falloEn === mode ? (
          <IlustracionTopografica ancho={ancho} alto={alto} />
        ) : (
          <Image
            testID="cabecera-imagen"
            source={IMAGENES[mode]}
            contentFit="cover"
            transition={DURACION_MS.fundido}
            onError={() => setFalloEn(mode)}
            style={{ position: 'absolute', left: 0, top: -corrimiento, width: ancho, height: ancho * PROPORCION_DE_LA_IMAGEN }}
          />
        )}
        <LinearGradient
          testID="cabecera-degradado"
          colors={PARADAS.opacidades.map(o => conOpacidad(c.bg, o)) as [string, string, ...string[]]}
          locations={PARADAS.posiciones as [number, number, ...number[]]}
          style={[styles.degradado, { top: inicio }]}
        />
      </View>

      {alVolver ? (
        <Presionable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={accesibilidadVolver}
          onPress={alVolver}
          contenedorStyle={[styles.volverArea, { top: insets.top + 8, left: horizontalPadding }]}
          style={[styles.volver, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name="arrowLeft" size={18} color={c.goldInk} />
        </Presionable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  capa: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  degradado: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  volverArea: {
    position: 'absolute',
  },
  volver: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
