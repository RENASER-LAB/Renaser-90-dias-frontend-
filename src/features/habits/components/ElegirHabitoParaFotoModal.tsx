import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Platform, useWindowDimensions } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerCatalogo, obtenerTracksDeHoy } from '../api/habitsApi';
import { habitosParaFotoDeHoy, type HabitoParaFoto } from '../utils/habitosParaFotoDeHoy';
import { tituloVisible } from '../utils/renombreDeHabito';

/**
 * Elegir DE CUÁL hábito de hoy es la foto que se va a subir. Solo elige: la cámara, la pantalla
 * partida y la subida son las de siempre (`useRegistroConFoto` + `RegistroConFotoModal`), las
 * mismas que usa Training. Lo usa «+ Subir Foto» de Yo (2026-09-29).
 *
 * **Acción explícita, nunca inferencia.** No se adivina a qué hábito corresponde una foto: la
 * persona lo elige de la lista y recién ahí se abre la cámara.
 *
 * > **Corregido 2026-09-29.** Este archivo era `EvidenciaDesdeChatModal` (el atajo del chat,
 * > quitado ese mismo día) y subía la foto por su cuenta, cerrando el registro sin respuesta. Eso
 * > se saltaba el «¿Qué sentiste?» obligatorio de los rituales (D-172). Ahora solo elige y deja la
 * > subida al flujo común.
 *
 * **Hoja desde abajo (rediseño de Training, 2026-10-05).** Era una hoja hecha a mano con «Cerrar» de
 * texto. Ahora es la `HojaDesdeAbajo` de la app, del alto de lo que lleva (`contenido`: son pocos
 * hábitos, y una hoja casi entera con dos filas se vería vacía): se arrastra, tiene la ✕ de 44, las
 * filas se hunden al tocarlas y elegir vibra con el «tic» de selección.
 */

type Props = {
  visible: boolean;
  onCerrar: () => void;
  onElegir: (elegido: HabitoParaFoto) => void;
  /** Los nombres propios que la persona le puso a sus hábitos (`useRenombreLocal`). */
  titulos: Readonly<Record<string, string>>;
};

export function ElegirHabitoParaFotoModal({ visible, onCerrar, onElegir, titulos }: Props) {
  const { c, t } = useTheme();
  const [opciones, setOpciones] = useState<HabitoParaFoto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [tracks, catalogo] = await Promise.all([obtenerTracksDeHoy(), obtenerCatalogo()]);
      setOpciones(habitosParaFotoDeHoy(tracks, catalogo, Platform.OS === 'web'));
    } catch (e) {
      setOpciones([]);
      setError(mensajeDeError(e, 'No pudimos cargar tus hábitos de hoy'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void cargar();
  }, [visible, cargar]);

  const { height: altoVentana } = useWindowDimensions();

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      titulo="¿De qué hábito es la foto?"
      subtitulo="Elige uno y se abre la cámara"
      etiquetaCerrar="Cerrar sin elegir"
    >
      <View style={styles.cuerpo}>
        {cargando && <ActivityIndicator color={c.goldInk} style={{ marginVertical: 20 }} />}

        {error !== null && <Text style={[t.body, { color: c.danger }]}>{error}</Text>}

        {!cargando && opciones.length === 0 && error === null && (
          <Text style={[t.body, { color: c.textSoft, paddingVertical: 16 }]}>
            Hoy no tienes hábitos pendientes con foto.
          </Text>
        )}

        <ScrollView style={{ maxHeight: Math.round(altoVentana * 0.5) }} showsVerticalScrollIndicator={false}>
          {opciones.map(opcion => {
            const { track } = opcion;
            const titulo = tituloVisible({ id: track.habitoId, title: track.tituloHabito }, titulos);
            return (
              <Presionable
                key={track.id}
                onPress={() => {
                  tacto.seleccion();
                  onElegir(opcion);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Subir la foto de ${titulo}`}
                style={[styles.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[t.cardTitle, { color: c.text }]} numberOfLines={1}>
                    {titulo}
                  </Text>
                  {/* Sin puntos informados no se inventa un número: la línea no aparece. */}
                  {typeof track.puntosEnJuego === 'number' && (
                    <Text style={[t.small, { color: c.textSoft }]}>
                      {track.puntosEnJuego}
                      {typeof track.puntosMaximos === 'number' ? ` / ${track.puntosMaximos}` : ''} pts en juego
                    </Text>
                  )}
                </View>
                <Icon name="camera" size={TAMANO_ICONO.normal} color={c.goldInk} />
              </Presionable>
            );
          })}
        </ScrollView>
      </View>
    </HojaDesdeAbajo>
  );
}

const styles = StyleSheet.create({
  cuerpo: {
    gap: 4,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 56,
  },
});
