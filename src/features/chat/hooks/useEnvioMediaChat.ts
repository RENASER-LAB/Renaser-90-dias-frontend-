import { useCallback, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { Alert } from '../../../components/Alerta';
import { useGrabadorDeVoz } from '../../../hooks/useGrabadorDeVoz';

import {
  almacenamientoSinConfigurar,
  enviarMensajeConMedia,
  solicitarUrlSubidaChat,
  subirMediaChatAS3,
} from '../api/chatApi';
import type { WireMensaje } from '../types/chat.types';
import type { StickerRenaser } from '../data/stickersRenaser';
import { textoDeSticker } from '../utils/stickersRenaser';
import {
  elegirFotoDeGaleriaChat,
  mimeDeAudioChat,
  tomarFotoConCamaraChat,
} from '../utils/capturarMediaChat';

/**
 * El mensaje recién enviado, listo para verse y escucharse en el teléfono de quien lo mandó.
 *
 * La respuesta de `POST .../messages` NO trae `mediaUrl`: el servidor firma la lectura solo en el
 * listado (`GET .../messages`), igual que `senderName` y `status` (ver `MensajeResponse` del backend).
 * Sin URL, la burbuja propia decía «Audio no disponible» (o «📷 Imagen adjunta» en vez de la foto)
 * apenas se enviaba, y así quedaba: el aviso en vivo del propio mensaje se descarta como eco. Para
 * quien lo mandó, el audio «fallaba» aunque había llegado bien (E-402 del backend, 28/09).
 *
 * El archivo ya está en el teléfono (la grabación o la foto elegida), así que se muestra ese, como
 * WhatsApp. Al volver a abrir el chat llega la URL firmada del servidor. Si algún día la respuesta de
 * enviar trae su `mediaUrl`, se usa la del servidor.
 */
export function conLaCopiaLocal(mensaje: WireMensaje, uriLocal: string): WireMensaje {
  return mensaje.mediaUrl ? mensaje : { ...mensaje, mediaUrl: uriLocal };
}

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
  // El grabador se crea recién al tocar «grabar», nunca al montar Comunidad (E-424): si el
  // micrófono no está disponible, falla ese botón y no la pantalla.
  const grabador = useGrabadorDeVoz();
  const [enviando, setEnviando] = useState(false);
  const envioEnCurso = useRef(false);

  /** Los tres pasos, en orden. Devuelve `true` si el mensaje llegó a crearse. */
  const subirYEnviar = useCallback(
    async (origen: { uri: string; mimeType: string } | (() => Promise<{ uri: string; mimeType: string }>),
            tipo: 'IMAGE' | 'AUDIO', durationSeconds?: number, text?: string): Promise<boolean> => {
      // El ref también bloquea dos toques antes de que React actualice `enviando`.
      if (!conversationId || envioEnCurso.current) return false;
      envioEnCurso.current = true;
      setEnviando(true);
      try {
        const archivo = typeof origen === 'function' ? await origen() : origen;
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
          text,
        });
        alEnviar(conLaCopiaLocal(mensaje, archivo.uri));
        return true;
      } catch (e) {
        Alert.alert('No se pudo enviar',
          e instanceof Error ? e.message : 'Intenta de nuevo en un momento.');
        return false;
      } finally {
        envioEnCurso.current = false;
        setEnviando(false);
      }
    },
    [conversationId, alEnviar],
  );

  const enviarSticker = useCallback(async (sticker: StickerRenaser): Promise<boolean> => {
    if (grabador.grabando) return false;
    return subirYEnviar(async () => {
      const asset = await Asset.fromModule(sticker.imagen).downloadAsync();
      // Los bytes originales se suben como WebP; no pasan por la conversión a JPEG de las fotos.
      return { uri: asset.localUri ?? asset.uri, mimeType: 'image/webp' };
    }, 'IMAGE', undefined, textoDeSticker(sticker.nombre));
  }, [grabador.grabando, subirYEnviar]);

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
   * segundo corta y manda. `grabando` es lo que la pantalla mira para pintar el botón en rojo y
   * mostrar el cronómetro.
   */
  const alternarGrabacion = useCallback(async () => {
    if (enviando || !conversationId) return;

    if (grabador.grabando) {
      const grabacion = await grabador.terminar();
      const segundos = Math.round((grabacion?.durationMillis ?? 0) / 1000);
      if (!grabacion?.uri) {
        Alert.alert('La grabación no dejó ningún archivo', 'Inténtalo de nuevo.');
        return;
      }
      // El backend rechaza `mediaDurationSeconds` si no es positivo, así que una nota de menos
      // de un segundo se manda sin duración en vez de con un 0 que haría fallar el envío entero.
      await subirYEnviar({ uri: grabacion.uri, mimeType: mimeDeAudioChat(grabacion.uri) }, 'AUDIO',
        segundos > 0 ? segundos : undefined);
      return;
    }

    const inicio = await grabador.empezar();
    if (inicio === 'sin-permiso') {
      Alert.alert(
        'Permiso de micrófono requerido',
        'Renaser necesita el micrófono para que puedas mandar notas de voz.',
      );
    } else if (inicio === 'no-disponible') {
      Alert.alert('No se pudo usar el micrófono', 'Intenta de nuevo en un momento.');
    }
  }, [conversationId, enviando, grabador, subirYEnviar]);

  /** Descartar lo grabado sin mandarlo — el equivalente a deslizar para cancelar. */
  const cancelarGrabacion = grabador.descartar;

  return {
    enviando,
    grabando: grabador.grabando,
    segundosGrabados: Math.floor(grabador.durationMillis / 1000),
    enviarFoto,
    enviarSticker,
    alternarGrabacion,
    cancelarGrabacion,
  };
}
