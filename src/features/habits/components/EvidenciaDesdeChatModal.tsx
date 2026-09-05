import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerTracksDeHoy } from '../api/habitsApi';
import type { TrackDelDiaApi } from '../types/habits.types';
import {
  almacenamientoSinConfigurar,
  completarRegistro,
  confirmarEvidencia,
  solicitarUrlSubidaEvidencia,
  subirArchivoAS3,
} from '../api/evidenciaHabitoApi';
import { elegirFotoDeGaleria, tomarFotoConCamara, type ArchivoEvidencia } from '../utils/capturarEvidencia';

/**
 * Subir la evidencia de un hábito DESDE el chat (pedido del dueño, 2026-09-05).
 *
 * **La decisión que define este archivo: acción explícita, nunca inferencia.** No se adivina que
 * una foto cualquiera del chat "parece" la evidencia de algún hábito. El aprendiz toca una opción
 * aparte, elige de una lista cuál hábito está evidenciando, y recién ahí se saca la foto.
 *
 * **Y la foto NO va al bucket del chat.** Va a los endpoints de evidencia
 * (`/habit-tracks/{id}/evidence/upload-url` → PUT a S3 → `/habit-tracks/{id}/evidence`), que es
 * un camino distinto del de medios de chat: otro bucket, otra validación, y consecuencias
 * distintas (una evidencia sellada otorga puntos y queda sujeta a revisión; una foto de chat es
 * una foto de chat). Mezclarlas es el error que este componente existe para evitar — si algún día
 * alguien "simplifica" reusando `solicitarUrlSubidaChat` acá, está rompiendo eso.
 *
 * Si además se quiere dejar constancia en la conversación, eso es un MENSAJE APARTE que manda
 * quien use este componente (`onSubida`), no un efecto de la subida.
 */

/** Un registro terminal ya no acepta evidencia: el backend lo rechaza y no tiene sentido ofrecerlo. */
const ESTADOS_TERMINALES: ReadonlySet<string> = new Set(['COMPLETADO', 'EXPIRADO', 'FALLIDO']);

type Props = {
  visible: boolean;
  onCerrar: () => void;
  /** Se llama SOLO cuando el backend ya selló la evidencia y cerró el registro. */
  onSubida: (resultado: { tituloHabito: string; puntosOtorgados: number }) => void | Promise<void>;
};

export function EvidenciaDesdeChatModal({ visible, onCerrar, onSubida }: Props) {
  const { c, t } = useTheme();
  const [pendientes, setPendientes] = useState<TrackDelDiaApi[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const tracks = await obtenerTracksDeHoy();
      setPendientes(tracks.filter(track => !ESTADOS_TERMINALES.has(track.estado)));
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar tus hábitos de hoy'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void cargar();
    }
  }, [visible, cargar]);

  const subir = useCallback(
    async (track: TrackDelDiaApi, archivo: ArchivoEvidencia) => {
      setSubiendo(track.id);
      setError(null);
      try {
        const url = await solicitarUrlSubidaEvidencia(track.id, archivo.mimeType);
        if (almacenamientoSinConfigurar(url.uploadUrl)) {
          setError('El almacenamiento de archivos todavía no está configurado en el servidor.');
          return;
        }
        await subirArchivoAS3(url.uploadUrl, archivo.uri, archivo.mimeType);
        await confirmarEvidencia(track.id, { tipo: 'FOTO', bucket: url.bucket, rutaStorage: url.ruta });
        // Mismo cierre que el modal de evidencia de Training: subir la prueba y cerrar el
        // registro son dos llamadas distintas del backend, y es la segunda la que otorga los
        // puntos. Los puntos son los que devolvió el servidor, nunca un número calculado acá.
        const registro = await completarRegistro(track.id, null);
        await onSubida({ tituloHabito: track.tituloHabito, puntosOtorgados: registro.puntosOtorgados });
        onCerrar();
      } catch (e) {
        setError(mensajeDeError(e, 'No se pudo subir tu evidencia. Intentá de nuevo.'));
      } finally {
        setSubiendo(null);
      }
    },
    [onSubida, onCerrar],
  );

  const elegirOrigen = useCallback(
    (track: TrackDelDiaApi) => {
      Alert.alert(`Evidencia de "${track.tituloHabito}"`, '¿De dónde sacamos la foto?', [
        {
          text: 'Cámara',
          onPress: () => {
            void tomarFotoConCamara().then(archivo => archivo && subir(track, archivo));
          },
        },
        {
          text: 'Galería',
          onPress: () => {
            void elegirFotoDeGaleria().then(archivo => archivo && subir(track, archivo));
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    },
    [subir],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.fondo}>
        <View style={[styles.hoja, { backgroundColor: c.bg, borderColor: c.border }]}>
          <View style={styles.encabezado}>
            <Text style={[t.cardTitle, { color: c.text }]}>Subir evidencia de un hábito</Text>
            <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
              <Text style={[t.body, { color: c.micro }]}>Cerrar</Text>
            </Pressable>
          </View>

          <Text style={[t.small, { color: c.micro }]}>
            Elegí cuál estás evidenciando. La foto se sella como evidencia del hábito, no como una
            foto del chat.
          </Text>

          {cargando && <ActivityIndicator color={c.gold} style={{ marginVertical: 20 }} />}

          {error !== null && (
            <Text style={[t.small, { color: '#E06A66' }]}>{error}</Text>
          )}

          {!cargando && pendientes.length === 0 && error === null && (
            <Text style={[t.body, { color: c.micro, paddingVertical: 16 }]}>
              No te queda ningún hábito por evidenciar hoy.
            </Text>
          )}

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {pendientes.map(track => (
              <Pressable
                key={track.id}
                onPress={() => elegirOrigen(track)}
                disabled={subiendo !== null}
                accessibilityRole="button"
                style={[
                  styles.fila,
                  { borderColor: c.border, backgroundColor: c.cardBg, opacity: subiendo !== null ? 0.5 : 1 },
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[t.cardTitle, { color: c.text, fontSize: 14.5 }]} numberOfLines={1}>
                    {track.tituloHabito}
                  </Text>
                  {/* Sin puntos informados no se inventa un número: la línea simplemente no aparece. */}
                  {typeof track.puntosEnJuego === 'number' && (
                    <Text style={[t.small, { color: c.micro }]}>
                      {track.puntosEnJuego}
                      {typeof track.puntosMaximos === 'number' ? ` / ${track.puntosMaximos}` : ''} pts en juego
                    </Text>
                  )}
                </View>
                {subiendo === track.id ? (
                  <ActivityIndicator color={c.gold} />
                ) : (
                  <Icon name="chevron" size={14} color={c.chevron} />
                )}
              </Pressable>
            ))}
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
