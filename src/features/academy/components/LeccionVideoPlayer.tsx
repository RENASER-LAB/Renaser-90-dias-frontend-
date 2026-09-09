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
            <Icon name="play" size={22} color={c.goldInk} />
          </View>
          {!!duracionTexto && (
            <View style={styles.durBadge}>
              <Text style={[t.micro, { color: '#FFFFFF', fontSize: 11 }]}>{duracionTexto}</Text>
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
              /*
               * D-98 — Error 153 de YouTube ("Error de configuración del reproductor de video").
               * Cargar la URL del embed DIRECTO como documento principal del WebView hace que la
               * petición salga sin `Referer`, y desde julio de 2025 el reproductor rechaza los
               * embeds sin origen con ese código (doc oficial: "153 — the request does not
               * include the HTTP Referer header"). La salida es envolver el reproductor en un
               * HTML propio con un `<iframe>` y darle `baseUrl`, para que el WebView mande
               * `Referer`. Es el mismo iframe que ya usa la rama web de arriba.
               *
               * El origen NO puede ser youtube.com: se probó y YouTube lo rechaza con 152-4
               * ("este video no está disponible"), que es la familia de 101/150 — el embed viene
               * de un sitio que no acepta. Tiene que ser un origen PROPIO; el patrón confirmado
               * por varias personas en react-native-webview#3889 es un dominio ficticio del
               * estilo `https://miapp.local`. Ver ORIGEN_EMBED_YOUTUBE.
               */
              source={
                videoTipo === 'youtube'
                  ? { html: htmlYoutubeEmbebido(idYoutube), baseUrl: ORIGEN_EMBED_YOUTUBE }
                  : { html: htmlVideoDirecto(videoUrl) }
              }
              originWhitelist={['*']}
              style={styles.webview}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
            />
          )}
          <Pressable onPress={() => setReproduciendo(false)} style={styles.closeBtn} hitSlop={8}>
            <Icon name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </>
      )}
    </View>
  );
}

/** `videoTipo === 'storage'`: mp4 propio en S3, sin iframe de por medio — un `<video>` HTML5 nativo alcanza. */
/**
 * Página mínima que envuelve el reproductor de YouTube en un iframe a pantalla completa. Ver la
 * nota sobre el Error 153 en el `<WebView>` de abajo: existe solo para que la petición del embed
 * lleve un origen, no como "diseño".
 */
/**
 * Origen con el que la app se identifica ante YouTube al embeber un video (es lo que viaja en el
 * `Referer` y en el parámetro `origin` del embed). No es un dominio real y no hace falta que lo
 * sea: YouTube exige que HAYA un origen y que no sea el suyo, no que resuelva en DNS — es el
 * patrón `https://miapp.local` confirmado en react-native-webview#3889. Si algún día Renaser
 * tiene dominio web propio, conviene poner ese acá: si el dueño de un video restringe el embed
 * a dominios concretos, este es el que tendría que autorizar.
 */
const ORIGEN_EMBED_YOUTUBE = 'https://renaser.local';

function htmlYoutubeEmbebido(idYoutube: string | null): string {
  const origen = encodeURIComponent(ORIGEN_EMBED_YOUTUBE);
  const src = `https://www.youtube.com/embed/${idYoutube ?? ''}?autoplay=1&playsinline=1&rel=0&origin=${origen}`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>html,body{margin:0;height:100%;background:#000}iframe{width:100%;height:100%;border:0}</style></head>
<body><iframe src="${src}" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
}

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
    fontFamily: 'Jost_700Bold',
  },
});
