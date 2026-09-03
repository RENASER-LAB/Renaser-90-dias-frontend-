import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';

import { useTheme } from '../../../theme/ThemeContext';
import { Icon } from '../../../components/Icon';
import { extraerIdYoutube, formatearDuracionMs } from '../api/academyMappers';

interface LeccionVideoPlayerProps {
  videoTipo: 'youtube' | 'storage' | null | undefined;
  videoUrl: string;
  videoMiniaturaUrl: string | null | undefined;
  videoDuracionMs: number | null | undefined;
}

/**
 * Reproductor de la lección — el diseño original (`fullScreenLesson` en `ComunidadScreen.tsx`)
 * no tenía NINGÚN player, solo texto; este componente es enteramente nuevo, agregado porque hacía
 * falta, reutilizando los colores del tema (`c.gold`/`c.border`/`c.cardBgAlt`) en vez de una
 * paleta propia.
 *
 * POR QUÉ SE MONTA EL WebView RECIÉN AL TOCAR "REPRODUCIR", Y NO ANTES:
 * un WebView es un navegador completo embebido (su propio proceso de renderizado, con o sin nada
 * reproduciéndose). Si se montara uno por lección apenas se abre la pantalla —o peor, uno por
 * cada lección de la lista— cada uno de esos navegadores ocupa memoria y CPU aunque nadie lo esté
 * mirando: eso es lo que vuelve lenta a una pantalla de cursos con muchos videos. Por eso acá,
 * ANTES del toque, lo único que existe en el árbol de componentes es un `<Image>` liviano (la
 * miniatura) — una imagen carga en milisegundos, un navegador no. El `<WebView>` recién se crea
 * cuando `reproduciendo` pasa a `true`, y se destruye (`setReproduciendo(false)`, o al cerrar la
 * lección — el padre desmonta este componente entero) para no seguir consumiendo memoria ni
 * reproduciendo en segundo plano.
 *
 * NO "simplificar" esto montando el WebView siempre / de entrada: es exactamente la lentitud que
 * este componente existe para evitar.
 */
export function LeccionVideoPlayer({
  videoTipo,
  videoUrl,
  videoMiniaturaUrl,
  videoDuracionMs,
}: LeccionVideoPlayerProps) {
  const { c, t } = useTheme();
  const [reproduciendo, setReproduciendo] = useState(false);

  const idYoutube = videoTipo === 'youtube' ? extraerIdYoutube(videoUrl) : null;
  // Respaldo SOLO si el backend no mandó `videoMiniaturaUrl` — YouTube expone una miniatura
  // pública derivable del id del video, sin pedirle nada al backend. Se usa nada más como último
  // recurso, tal como lo pide la tarea.
  const miniatura = videoMiniaturaUrl || (idYoutube ? `https://img.youtube.com/vi/${idYoutube}/hqdefault.jpg` : null);
  const duracionTexto = formatearDuracionMs(videoDuracionMs);

  if (videoTipo === 'youtube' && !idYoutube) {
    // La URL vino en una forma que no se pudo reconocer — no hay de dónde sacar un id de video
    // real, así que no se puede armar el embed. Se avisa con texto en vez de mostrar un
    // reproductor roto (mismo criterio de "no inventar" que el resto de la integración).
    return (
      <View style={[styles.wrap, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
        <Text style={[t.micro, { color: c.textSoft, padding: 14, textAlign: 'center' }]}>
          No pudimos reconocer el video de esta lección.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor: c.border, backgroundColor: '#000' }]}>
      {!reproduciendo ? (
        <Pressable onPress={() => setReproduciendo(true)} style={styles.thumbWrap}>
          {miniatura ? (
            <Image
              source={{ uri: miniatura }}
              style={styles.thumb}
              contentFit="cover"
              transition={120}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.thumb, { backgroundColor: c.cardBgAlt }]} />
          )}
          <View style={[styles.playBadge, { borderColor: c.gold, backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Icon name="play" size={22} color={c.gold} />
          </View>
          {!!duracionTexto && (
            <View style={styles.durBadge}>
              <Text style={[t.micro, { color: '#FFFFFF', fontSize: 9.5 }]}>{duracionTexto}</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <>
          {Platform.OS === 'web' ? (
            /*
             * `react-native-webview` es SOLO nativo: en web lanza "does not support this platform"
             * y no se ve nada. En un navegador no hace falta un WebView — un `<iframe>` (para
             * YouTube) o un `<video>` (para un mp4 propio) son los elementos nativos de la
             * plataforma. Se usan vía `createElement` porque JSX en React Native no conoce esas
             * etiquetas; en web react-native-web las pasa tal cual al DOM.
             */
            React.createElement(
              videoTipo === 'youtube' ? 'iframe' : 'video',
              videoTipo === 'youtube'
                ? {
                    src: `https://www.youtube.com/embed/${idYoutube}?autoplay=1&playsinline=1`,
                    style: { width: '100%', height: '100%', border: 0 },
                    allow: 'autoplay; encrypted-media; picture-in-picture',
                    allowFullScreen: true,
                  }
                : {
                    src: videoUrl,
                    controls: true,
                    autoPlay: true,
                    playsInline: true,
                    style: { width: '100%', height: '100%', backgroundColor: '#000' },
                  }
            )
          ) : (
            <WebView
              source={
                videoTipo === 'youtube'
                  ? { uri: `https://www.youtube.com/embed/${idYoutube}?autoplay=1&playsinline=1` }
                  : { html: htmlVideoDirecto(videoUrl) }
              }
              style={styles.webview}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
            />
          )}
          <Pressable onPress={() => setReproduciendo(false)} style={styles.closeBtn} hitSlop={8}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

/** `videoTipo === 'storage'`: mp4 propio en S3, sin iframe de por medio — un `<video>` HTML5 nativo alcanza. */
function htmlVideoDirecto(url: string): string {
  return `<!doctype html><html><body style="margin:0;background:#000">
<video src="${url}" controls autoplay playsinline style="width:100%;height:100vh;background:#000"></video>
</body></html>`;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbWrap: {
    flex: 1,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    marginTop: -26,
    marginLeft: -26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
