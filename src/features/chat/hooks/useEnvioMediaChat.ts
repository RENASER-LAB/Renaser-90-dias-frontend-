import { useCallback, useState } from 'react';
import { Alert } from '../../../components/Alerta';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import {
  almacenamientoSinConfigurar,
  enviarMensajeConMedia,
  solicitarUrlSubidaChat,
  subirMediaChatAS3,
} from '../api/chatApi';
import type { WireMensaje } from '../types/chat.types';
import {
  elegirFotoDeGaleriaChat,
  mimeDeAudioChat,
  tomarFotoConCamaraChat,
} from '../utils/capturarMediaChat';

/**
 * Mandar una foto o una nota de voz por chat, con el patrón de tres pasos del backend: pedir la
 * URL firmada, `PUT` de los bytes directo a S3, y recién entonces crear el mensaje.
 *
 * Vive acá y no dentro de `ComunidadScreen` porque los tres pasos, el permiso de micrófono y el
 * manejo de fallo intermedio son ~100 líneas que no tienen nada que ver con pintar la pantalla —
 * y porque la pantalla ya son 4400 líneas.
 *
 * <p>El fallo intermedio importa: si el `PUT` sube el archivo pero el `POST` del mensaje falla,
 * el objeto queda en el bucket sin que ningún mensaje lo referencie. No se intenta borrarlo (no
 * hay endpoint para eso y no debería haberlo: dárselo al cliente es dárselo a cualquiera), pero
 * sí se avisa con un error claro en vez de dejar la pantalla como si nada hubiera pasado.
 */
export function useEnvioMediaChat(conversationId: string | null,
                                    alEnviar: (mensaje: WireMensaje) => void) {
  const grabador = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estadoGrabador = useAudioRecorderState(grabador);
  const [enviando, setEnviando] = useState(false);

  /** Los tres pasos, en orden. Devuelve `true` si el mensaje llegó a crearse. */
  const subirYEnviar = useCallback(
    async (archivo: { uri: string; mimeType: string }, tipo: 'IMAGE' | 'AUDIO',
            durationSeconds?: number): Promise<boolean> => {
      if (!conversationId) return false;
      setEnviando(true);
      try {
        const url = await solicitarUrlSubidaChat(conversationId, archivo.mimeType);
        // Sin `STORAGE_PROVEEDOR=s3` el backend devuelve `about:blank#pendiente-s3/...`; un PUT
        // ahí falla con un error de red críptico. Se detecta antes de intentarlo (D-34).
        if (almacenamientoSinConfigurar(url.uploadUrl)) {
          Alert.alert(
            'Todavía no se pueden mandar archivos',
            'El almacenamiento del servidor no está configurado. Puedes seguir escribiendo por texto.',
          );
          return false;
        }
        await subirMediaChatAS3(url.uploadUrl, archivo.uri, archivo.mimeType);
        const mensaje = await enviarMensajeConMedia(conversationId, {
          tipo,
          bucket: url.bucket,
          ruta: url.ruta,
          mime: archivo.mimeType,
          durationSeconds,
        });
        alEnviar(mensaje);
        return true;
      } catch (e) {
        Alert.alert('No se pudo enviar',
          e instanceof Error ? e.message : 'Intentá de nuevo en un momento.');
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [conversationId, alEnviar],
  );

  const enviarFoto = useCallback(async (origen: 'camara' | 'galeria') => {
    if (enviando || !conversationId) return;
    const archivo = origen === 'camara'
      ? await tomarFotoConCamaraChat()
      : await elegirFotoDeGaleriaChat();
    if (!archivo) return;
    await subirYEnviar(archivo, 'IMAGE');
  }, [conversationId, enviando, subirYEnviar]);

  /**
   * Un solo botón para grabar y para soltar, como en WhatsApp: el primer toque arranca, el
   * segundo corta y manda. `estadoGrabador.isRecording` es lo que la pantalla mira para pintar
   * el botón en rojo y mostrar el cronómetro.
   */
  const alternarGrabacion = useCallback(async () => {
    if (enviando || !conversationId) return;

    if (estadoGrabador.isRecording) {
      await grabador.stop();
      const uri = grabador.uri;
      const segundos = Math.round(estadoGrabador.durationMillis / 1000);
      if (!uri) {
        Alert.alert('La grabación no dejó ningún archivo', 'Probá de nuevo.');
        return;
      }
      // El backend rechaza `mediaDurationSeconds` si no es positivo, así que una nota de menos
      // de un segundo se manda sin duración en vez de con un 0 que haría fallar el envío entero.
      await subirYEnviar({ uri, mimeType: mimeDeAudioChat(uri) }, 'AUDIO',
        segundos > 0 ? segundos : undefined);
      return;
    }

    const permiso = await requestRecordingPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        'Permiso de micrófono requerido',
        'Renaser necesita el micrófono para que puedas mandar notas de voz.',
      );
      return;
    }
    // `allowsRecording` es obligatorio en iOS: sin él, `record()` no captura nada y el archivo
    // sale mudo sin que ninguna API avise.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await grabador.prepareToRecordAsync();
    grabador.record();
  }, [conversationId, enviando, estadoGrabador.isRecording, estadoGrabador.durationMillis,
      grabador, subirYEnviar]);

  /** Descartar lo grabado sin mandarlo — el equivalente a deslizar para cancelar. */
  const cancelarGrabacion = useCallback(async () => {
    if (!estadoGrabador.isRecording) return;
    await grabador.stop();
  }, [estadoGrabador.isRecording, grabador]);

  return {
    enviando,
    grabando: estadoGrabador.isRecording,
    segundosGrabados: Math.floor(estadoGrabador.durationMillis / 1000),
    enviarFoto,
    alternarGrabacion,
    cancelarGrabacion,
  };
}
