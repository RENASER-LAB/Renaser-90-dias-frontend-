import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.fondo}>
        <View style={[styles.hoja, { backgroundColor: c.bg, borderColor: c.border }]}>
          <View style={styles.encabezado}>
            <Text style={[t.cardTitle, { color: c.text, flex: 1 }]}>¿De qué hábito es la foto?</Text>
            <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
              <Text style={[t.body, { color: c.micro }]}>Cerrar</Text>
            </Pressable>
          </View>

          {cargando && <ActivityIndicator color={c.goldInk} style={{ marginVertical: 20 }} />}

          {error !== null && <Text style={[t.small, { color: c.danger }]}>{error}</Text>}

          {!cargando && opciones.length === 0 && error === null && (
            <Text style={[t.body, { color: c.micro, paddingVertical: 16 }]}>
              Hoy no tienes hábitos pendientes con foto.
            </Text>
          )}

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {opciones.map(opcion => {
              const { track } = opcion;
              const titulo = tituloVisible({ id: track.habitoId, title: track.tituloHabito }, titulos);
              return (
                <Pressable
                  key={track.id}
                  onPress={() => onElegir(opcion)}
                  accessibilityRole="button"
                  accessibilityLabel={`Subir la foto de ${titulo}`}
                  style={[styles.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[t.cardTitle, { color: c.text, fontSize: 14.5 }]} numberOfLines={1}>
                      {titulo}
                    </Text>
                    {/* Sin puntos informados no se inventa un número: la línea no aparece. */}
                    {typeof track.puntosEnJuego === 'number' && (
                      <Text style={[t.small, { color: c.micro }]}>
                        {track.puntosEnJuego}
                        {typeof track.puntosMaximos === 'number' ? ` / ${track.puntosMaximos}` : ''} pts en juego
                      </Text>
                    )}
                  </View>
                  <Icon name="camera" size={16} color={c.goldInk} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  hoja: {
    gap: 10,
    padding: 18,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 56,
  },
});
