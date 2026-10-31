import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { BloqueOcupado, HuecoDelDia, VentanaDelDia } from '../types/huecos.types';
import {
  acomodarEnCarriles,
  aMinutos,
  bloqueHablado,
  deMinutosAHora,
  DP_POR_MINUTO,
  duracionDelHueco,
  huecoHabladoEnLaAgenda,
  marcasDeHora,
  minutosDeLaVentana,
  nombreDelBloque,
} from '../utils/agendaDelDia';
import { tramoEnPalabras } from '../utils/textosDeHuecos';

/** Lo que se agrega arriba y abajo para que la primera y la última marca de hora no queden cortadas. */
const AIRE_VERTICAL = 10;
const SEPARACION_ENTRE_CARRILES = 3;
/** El tamaño de la letra del sistema que la línea sigue: más allá de 1,6 el día se alargaría sin ganar legibilidad. */
const ESCALA_MAXIMA = 1.6;

/**
 * La agenda de UN día, como una línea de tiempo vertical (spec 015, corregido 2026-10-29): de la hora de Despertar a la de
 * Dormir, con una marca cada 2 horas. Lo ocupado va en bloques grises con su nombre; la agenda personal, solo «Ocupado».
 * Cada hueco de 30 minutos o más va en dorado con su duración y su rango.
 *
 * - **Se dibuja con vistas posicionadas**, no con SVG: un minuto mide {@link DP_POR_MINUTO} dp por la escala de la letra del
 *   sistema, así que un bloque de 30 minutos siempre tiene el alto de una línea de texto, también con la letra al 130 %.
 * - **Los bloques que se cruzan** se reparten en columnas, como una agenda (`acomodarEnCarriles`): dos cosas a la misma hora
 *   se ven las dos.
 * - **`ocupados === null`** (un día de una semana cerrada, que no guarda nombres) dibuja solo los huecos sobre un fondo
 *   liso: lo que no es dorado no se sabe qué era, y no se inventa.
 * - Un bloque más corto que una línea de texto va sin texto (su nombre lo lee el lector de pantalla). Los huecos van en el
 *   orden de hora y los bloques también: se oye la agenda de corrido.
 */
export function LineaDeTiempoDelDia({
  ventana,
  huecos,
  ocupados,
}: {
  ventana: VentanaDelDia;
  huecos: HuecoDelDia[];
  ocupados: BloqueOcupado[] | null;
}) {
  const { c, t, mode } = useTheme();
  const { fontScale } = useWindowDimensions();
  const escala = Math.min(Math.max(fontScale, 1), ESCALA_MAXIMA);
  const minutos = minutosDeLaVentana(ventana);
  if (minutos === null) return null;

  const dp = DP_POR_MINUTO * escala;
  const inicio = aMinutos(ventana.desde);
  const alto = Math.round(minutos * dp);
  const lineaDeTexto = Math.ceil(13 * 1.2 * escala);
  const ancho = Math.round(40 * Math.min(escala, 1.4));
  const ocupado = mode === 'dark' ? c.cardBgAlt : c.border;
  const acomodados = ocupados ? acomodarEnCarriles(ocupados, ventana) : [];

  return (
    <View testID="linea-de-tiempo" style={[estilos.exterior, { height: alto + AIRE_VERTICAL * 2 }]}>
      <View style={[estilos.interior, { top: AIRE_VERTICAL, height: alto }]}>
        {marcasDeHora(ventana).map(marca => {
          const y = Math.round((marca - inicio) * dp);
          return (
            <React.Fragment key={marca}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={[estilos.marca, { top: y, backgroundColor: c.divider }]}
              />
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={[estilos.hora, { top: y - lineaDeTexto / 2, width: ancho - 6, lineHeight: lineaDeTexto, color: c.textSoft }]}
              >
                {deMinutosAHora(marca)}
              </Text>
            </React.Fragment>
          );
        })}

        <View style={[estilos.zona, { left: ancho }, ocupados === null ? { backgroundColor: c.divider, borderRadius: 8 } : null]}>
          {acomodados.map(b => {
            const altoDelBloque = Math.max(2, Math.round((b.hasta - b.desde) * dp) - 2);
            return (
              <View
                key={`${b.bloque.desde}-${b.bloque.hasta}-${b.carril}-${b.bloque.titulo ?? b.bloque.tipo}`}
                testID="bloque"
                accessible
                accessibilityLabel={bloqueHablado(b.bloque)}
                style={[
                  estilos.carril,
                  {
                    top: Math.round((b.desde - inicio) * dp) + 1,
                    height: altoDelBloque,
                    left: `${(b.carril / b.carriles) * 100}%`,
                    width: `${100 / b.carriles}%`,
                    paddingRight: b.carril < b.carriles - 1 ? SEPARACION_ENTRE_CARRILES : 0,
                  },
                ]}
              >
                <View style={[estilos.bloque, { backgroundColor: ocupado, borderColor: c.divider }]}>
                  {altoDelBloque >= lineaDeTexto ? (
                    <Text
                      numberOfLines={1}
                      style={[t.body, estilos.nombre, { color: b.bloque.titulo ? c.text : c.textSoft, lineHeight: lineaDeTexto }]}
                    >
                      {nombreDelBloque(b.bloque)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {huecos.map(hueco => {
            const desde = aMinutos(hueco.desde);
            const altoDelHueco = Math.max(2, Math.round((aMinutos(hueco.hasta) - desde) * dp) - 3);
            return (
              <View
                key={`${hueco.desde}-${hueco.hasta}`}
                testID="hueco"
                accessible
                accessibilityLabel={huecoHabladoEnLaAgenda(hueco)}
                style={[
                  estilos.hueco,
                  { top: Math.round((desde - inicio) * dp) + 1, height: altoDelHueco, backgroundColor: c.goldWash, borderColor: c.gold },
                ]}
              >
                {altoDelHueco >= lineaDeTexto ? (
                  <>
                    <Text numberOfLines={1} style={[estilos.duracion, { color: c.goldInk, lineHeight: lineaDeTexto }]}>
                      {duracionDelHueco(hueco)}
                    </Text>
                    <Text numberOfLines={1} style={[estilos.rango, { color: c.goldInk, lineHeight: lineaDeTexto }]}>
                      {tramoEnPalabras(hueco.desde, hueco.hasta)}
                    </Text>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  exterior: { marginTop: 12 },
  interior: { position: 'absolute', left: 0, right: 0 },
  marca: { position: 'absolute', left: 0, right: 0, height: 1 },
  hora: {
    position: 'absolute',
    left: 0,
    fontFamily: fuentes.media,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  zona: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  carril: { position: 'absolute' },
  bloque: { flex: 1, justifyContent: 'center', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', paddingHorizontal: 8 },
  nombre: { fontFamily: fuentes.media, fontSize: 13 },
  hueco: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  duracion: { fontFamily: fuentes.negrita, fontSize: 13, flexShrink: 1 },
  rango: { fontFamily: fuentes.media, fontSize: 13, fontVariant: ['tabular-nums'] },
});
