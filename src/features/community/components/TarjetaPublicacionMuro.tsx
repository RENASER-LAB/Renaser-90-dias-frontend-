import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { AvatarPersona } from '../../../components/ui';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import type { CommentItem, PostItem } from '../../../screens/ComunidadScreen';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import type { FotoMuroNormalizada } from '../utils/normalizarImagen';
import { PROPORCION_POR_DEFECTO } from '../utils/proporcionImagen';
import { FotoMuro } from './FotoMuro';

const EMOJIS_RAPIDOS = ['🔥', '👏', '💪', '⚡', '❤️', '🦅', '🎯', '🙌'];

/**
 * Todo lo que una tarjeta puede pedirle a la pantalla. Llega como UN objeto estable (la pantalla
 * lo arma una sola vez), para que `memo` pueda saltarse las tarjetas que no cambiaron.
 */
export type AccionesPublicacion = {
  alternarExpandida: (postId: string) => void;
  alternarComentarios: (postId: string) => void;
  alternarLike: (postId: string) => void;
  compartir: (postId: string) => void;
  verReacciones: (postId: string) => void;
  abrirFotos: (post: PostItem, indice: number) => void;
  recordarProporcion: (postId: string, proporcion: number) => void;
  alternarComentarioExpandido: (comentarioId: string) => void;
  abrirFotoDeComentario: (comentario: CommentItem) => void;
  votarComentario: (postId: string, comentarioId: string) => void;
  agregarEmoji: (postId: string, emoji: string) => void;
  quitarFotoComentario: (postId: string) => void;
  elegirFotoComentario: (postId: string) => void;
  escribirComentario: (postId: string, texto: string) => void;
  enviarComentario: (postId: string) => void;
  /** La confirmación en línea de esta publicación terminó de irse. */
  cerrarConfirmacion: (postId: string) => void;
};

type Props = {
  post: PostItem;
  /** "Ver más" del texto de la publicación. */
  expandida: boolean;
  comentariosAbiertos: boolean;
  /** La publicación a la que se llegó desde Hoy: borde dorado. */
  destacada: boolean;
  /** Proporción real de la foto única, cuando ya se conoce. */
  proporcion: number | undefined;
  textoComentario: string;
  fotoComentario: FotoMuroNormalizada | null | undefined;
  comentariosExpandidos: Record<string, boolean>;
  /** «Compartida en …», debajo de las acciones, cuando ESTA publicación se acaba de compartir. */
  confirmacion?: { clave: number; texto: string } | null;
  acciones: AccionesPublicacion;
};

/**
 * Una publicación del Muro: cabecera, texto, fotos, acciones y comentarios.
 *
 * > **Salió de `ComunidadScreen` el 26/09/2026 (V-4).** Era el cuerpo de un `posts.map(...)`
 * > dentro de un `ScrollView`, y cada tarjeta avisaba su posición con un `onLayout` que hacía
 * > `setPostOffsets` en la pantalla: con N publicaciones, N re-renders de las ~5000 líneas de
 * > `ComunidadScreen` al abrir el Muro, y otra vez con cada foto que cambiaba el alto. Ahora el
 * > Muro es una `FlatList` (solo monta lo que está cerca de la vista) y esta tarjeta va en `memo`:
 * > tocar "Like" en una re-renderiza esa sola. El JSX es el mismo de antes, sin cambios visuales.
 */
function TarjetaPublicacionMuroBase({
  post,
  expandida,
  comentariosAbiertos,
  destacada,
  proporcion,
  textoComentario,
  fotoComentario,
  comentariosExpandidos,
  confirmacion,
  acciones,
}: Props) {
  const { c, t } = useTheme();
  const isExpanded = expandida;
  const commentsVisible = comentariosAbiertos;

  return (
      <View
        style={[
          styles.postCard,
          {
            borderColor: destacada ? c.gold : c.border,
            backgroundColor: c.cardBg,
          },
          // Único cambio visual del post optimista: atenuado mientras se confirma. Se
          // suma como estilo al lado de los que ya estaban, sin tocar `styles.postCard`
          // ni reestructurar el JSX de la tarjeta.
          post.pendiente && { opacity: 0.55 },
        ]}
      >
        {/* Header del Post */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Su foto o sus iniciales (2026-10-05). Antes era el emoji 👤, el mismo para todos. */}
            <AvatarPersona nombre={post.author} avatarUrl={post.avatarUrl} size={36} />
            <View>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>{post.author}</Text>
              <Text style={[t.small, { color: c.micro }]}>
                {post.cell} · {post.timeAgo}
              </Text>
            </View>
          </View>
          {/* Sin día no hay insignia. Dibujar "Día 0" era peor que no dibujar nada. */}
          {post.diaPrograma !== null ? (
            <View style={[styles.dayBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
                Día {post.diaPrograma}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Texto del Post con "Ver más..." */}
        <View style={{ marginTop: 8 }}>
          <Text
            numberOfLines={isExpanded ? undefined : 3}
            style={[t.body, { color: c.text }]}
          >
            {post.text}
          </Text>
          {post.text.length > 120 && (
            <Pressable
              onPress={() => acciones.alternarExpandida(post.id)}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                {isExpanded ? 'Ver menos' : 'Ver más...'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Galería Autodetectada */}
        {post.media.length > 0 && (
          <View style={[styles.mediaGridContainer, { marginTop: 10 }]}>
            {post.media.length === 1 ? (
              <Pressable
                onPress={() => acciones.abrirFotos(post, 0)}
                style={[
                  styles.mediaSingleBox,
                  // La forma de la caja la da la foto, no un alto fijo: mientras no se
                  // sabe, cuadrada; al cargar, la proporción real que avisó `FotoMuro`.
                  { aspectRatio: proporcion ?? PROPORCION_POR_DEFECTO },
                  { backgroundColor: c.placeholderA },
                ]}
              >
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                  {post.media[0].title}
                </Text>
                {/* Overlay DESPUÉS del texto a propósito: si la foto carga, lo tapa; si es
                    video o falla, no dibuja nada y el texto de siempre queda visible. */}
                <FotoMuro
                  url={post.media[0].url}
                  mimeType={post.media[0].mimeType}
                  radioBorde={12}
                  colorFondo={c.cardBgAlt}
                  ajuste="contain"
                  onProporcion={medida => acciones.recordarProporcion(post.id, medida)}
                />
              </Pressable>
            ) : post.media.length === 2 ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {post.media.map((m, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => acciones.abrirFotos(post, idx)}
                    style={[styles.mediaHalfBox, { backgroundColor: c.placeholderA }]}
                  >
                    <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                      {m.title}
                    </Text>
                    <FotoMuro url={m.url} mimeType={m.mimeType} radioBorde={10} colorFondo={c.cardBgAlt} />
                  </Pressable>
                ))}
              </View>
            ) : (
              // Mosaico de 3 o más: proporción en vez de alto fijo, para que crezca con
              // el ancho de la tarjeta igual que en Instagram/Facebook. Con 130 px
              // fijos las tres fotos quedaban en una tira demasiado baja.
              <View style={{ flexDirection: 'row', gap: 6, aspectRatio: 1.5 }}>
                <Pressable
                  onPress={() => acciones.abrirFotos(post, 0)}
                  style={[styles.mediaLargeLeft, { backgroundColor: c.placeholderA }]}
                >
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                    {post.media[0].title}
                  </Text>
                  <FotoMuro
                    url={post.media[0].url}
                    mimeType={post.media[0].mimeType}
                    radioBorde={10}
                    colorFondo={c.cardBgAlt}
                  />
                </Pressable>
                <View style={{ flex: 1, gap: 6 }}>
                  {post.media.slice(1, 3).map((m, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => acciones.abrirFotos(post, idx + 1)}
                      style={[styles.mediaSmallRight, { backgroundColor: c.placeholderA }]}
                    >
                      <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                        {m.title}
                      </Text>
                      <FotoMuro url={m.url} mimeType={m.mimeType} radioBorde={8} colorFondo={c.cardBgAlt} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* El resumen: quién reaccionó y cuántos comentarios, A LA IZQUIERDA (2026-10-05).
            > Corregido 2026-10-05. Decía que las reacciones bajaban a la fila de acciones, al mismo
            > nivel que Like, Comentar y Compartir, con la chapa empujada al borde derecho. Ese borde
            > es justo donde flota el botón de SER: al desplazar el Muro la chapa quedaba debajo de él
            > y no se podía tocar. Ahora va acá, a la izquierda, como en Facebook, y la fila de acciones
            > queda solo con las tres acciones. La chapa ES el botón: lleva su propia etiqueta. */}
        <View style={styles.reactionsSummaryRow}>
          <Pressable
            onPress={() => acciones.verReacciones(post.id)}
            accessibilityRole="button"
            accessibilityLabel={
              post.likes === 1
                ? 'Una reacción. Toca para ver quién reaccionó'
                : `${post.likes} reacciones. Toca para ver quién reaccionó`
            }
            hitSlop={6}
            style={styles.rxCountBotonFila}
          >
            <View style={[styles.rxCountBadge, { backgroundColor: c.goldWash }]}>
              <Icon name="thumbsUp" size={TAMANO_ICONO.chico} color={c.goldInk} />
              <Text style={[styles.rxCountTexto, { color: c.goldInk }]}>{post.likes}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => acciones.alternarComentarios(post.id)}
            hitSlop={8}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={[t.small, styles.cifras, { color: c.textSoft }]}>
              {post.comments.length === 1 ? '1 comentario' : `${post.comments.length} comentarios`}
            </Text>
          </Pressable>
        </View>

        {/* Las tres acciones (2026-10-05): ícono de 20 y texto de 14, en un solo color neutro; «Me
            gusta» pasa a dorado y negrita cuando ya lo diste (el color no es la única señal). Antes:
            íconos de 14, texto de 10,5 en versales y un color distinto por botón (verde, dorado, gris)
            que no significaba nada. */}
        <View style={[styles.actionButtonsRow, { borderTopColor: c.divider }]}>
          <Pressable
            onPress={() => acciones.alternarLike(post.id)}
            accessibilityRole="button"
            accessibilityLabel={post.userReaction === 'like' ? 'Quitar reaccion' : 'Reaccionar a la publicacion'}
            accessibilityState={{ selected: post.userReaction === 'like' }}
            style={({ pressed }) => [styles.actionBtn, pressed && { backgroundColor: c.goldWash }]}
          >
            <Icon
              name="thumbsUp"
              size={TAMANO_ICONO.normal}
              color={post.userReaction === 'like' ? c.goldInk : c.textSoft}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.actionTexto,
                post.userReaction === 'like'
                  ? { color: c.goldInk, fontFamily: 'Jost_700Bold' }
                  : { color: c.textSoft },
              ]}
            >
              Me gusta
            </Text>
          </Pressable>

          <Pressable
            onPress={() => acciones.alternarComentarios(post.id)}
            accessibilityRole="button"
            accessibilityLabel="Ver y escribir comentarios"
            style={({ pressed }) => [styles.actionBtn, pressed && { backgroundColor: c.goldWash }]}
          >
            <Icon name="messageCircle" size={TAMANO_ICONO.normal} color={c.textSoft} />
            <Text numberOfLines={1} style={[styles.actionTexto, { color: c.textSoft }]}>
              Comentar
            </Text>
          </Pressable>

          <Pressable
            onPress={() => acciones.compartir(post.id)}
            accessibilityRole="button"
            accessibilityLabel="Compartir la publicacion"
            style={({ pressed }) => [styles.actionBtn, pressed && { backgroundColor: c.goldWash }]}
          >
            <Icon name="forward" size={TAMANO_ICONO.normal} color={c.textSoft} />
            <Text numberOfLines={1} style={[styles.actionTexto, { color: c.textSoft }]}>
              Compartir
            </Text>
          </Pressable>
        </View>

        {confirmacion ? (
          <View style={{ marginTop: 8 }}>
            <ConfirmacionEnLinea
              key={confirmacion.clave}
              texto={confirmacion.texto}
              onTerminar={() => acciones.cerrarConfirmacion(post.id)}
            />
          </View>
        ) : null}

        {/* Comentarios con Fotos */}
        {commentsVisible && (
          <View style={[styles.commentsSection, { borderTopColor: c.divider }]}>
            {post.comments.map(cItem => {
              const isLong = cItem.text.length > 90;
              const isExpanded = !!comentariosExpandidos[cItem.id];
              const displayText = isLong && !isExpanded ? cItem.text.slice(0, 90) + '...' : cItem.text;

              return (
                <View key={cItem.id} style={[styles.commentCard, { backgroundColor: c.cardBgAlt }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[t.cardTitle, { color: c.goldInk, fontSize: 14 }]}>
                      {cItem.author} {cItem.role ? `(${cItem.role})` : ''}
                    </Text>
                    <Text style={[t.micro, { color: c.textSoft }]}>{cItem.timeAgo}</Text>
                  </View>

                  <Text style={[t.body, { color: c.text, marginTop: 6 }]}>
                    {displayText}
                  </Text>

                  {isLong && (
                    <Pressable
                      onPress={() => acciones.alternarComentarioExpandido(cItem.id)}
                      hitSlop={6}
                      style={{ minHeight: 48, justifyContent: 'center' }}
                    >
                      <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                        {isExpanded ? 'Ver menos' : 'Ver más...'}
                      </Text>
                    </Pressable>
                  )}

                  {cItem.photoAttached && (
                    <Pressable
                      onPress={() => acciones.abrirFotoDeComentario(cItem)}
                      style={styles.commentPhotoBox}
                    >
                      <Image
                        source={{ uri: cItem.photoAttached }}
                        style={styles.commentPhotoImage}
                        resizeMode="cover"
                      />
                    </Pressable>
                  )}

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' }}>
                    {/* Con estado (2026-10-05): gris si no votaste, dorado y en negrita si sí. Antes el
                        pulgar era siempre verde y no decía si ya lo habías tocado. */}
                    <Pressable
                      onPress={() => acciones.votarComentario(post.id, cItem.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Me gusta este comentario. ${cItem.likes}`}
                      accessibilityState={{ selected: cItem.userReaction === 'like' }}
                      hitSlop={6}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, minWidth: 48 }}
                    >
                      <Icon
                        name="thumbsUp"
                        size={TAMANO_ICONO.chico}
                        color={cItem.userReaction === 'like' ? c.goldInk : c.textSoft}
                      />
                      <Text
                        style={[
                          t.small,
                          styles.cifras,
                          cItem.userReaction === 'like'
                            ? { color: c.goldInk, fontFamily: 'Jost_700Bold' }
                            : { color: c.textSoft },
                        ]}
                      >
                        {cItem.likes}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {/* Input de Comentario con Emojis y Foto Real */}
            <View style={{ gap: 6, marginTop: 8 }}>
              {/* Tira de Emojis Rápidos */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 6 }}>
                {EMOJIS_RAPIDOS.map(emoji => (
                  <Pressable
                    key={emoji}
                    onPress={() => acciones.agregarEmoji(post.id, emoji)}
                    hitSlop={4}
                    style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Previsualización compacta de foto seleccionada */}
              {fotoComentario && (
                <View style={[styles.commentPhotoPreview, { backgroundColor: c.goldWash, gap: 8 }]}>
                  <Image
                    source={{ uri: fotoComentario.uri }}
                    style={{ width: 38, height: 38, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="image" size={TAMANO_ICONO.chico} color={c.goldInk} />
                      <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>Foto adjunta</Text>
                    </View>
                    <Text style={[t.small, { color: c.textSoft }]}>
                      Lista para enviar con tu comentario
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => acciones.quitarFotoComentario(post.id)}
                    hitSlop={6}
                    style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="close" size={14} color={c.danger} />
                  </Pressable>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {/* `image` y no `camera`: el botón abre la GALERÍA, no la cámara (2026-10-05). */}
                <Pressable
                  onPress={() => acciones.elegirFotoComentario(post.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Adjuntar una foto de la galería"
                  style={[styles.attachPhotoBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                  hitSlop={6}
                >
                  <Icon name="image" size={TAMANO_ICONO.normal} color={c.goldInk} />
                </Pressable>

                <TextInput
                  value={textoComentario}
                  onChangeText={val => acciones.escribirComentario(post.id, val)}
                  placeholder="Escribe un comentario..."
                  placeholderTextColor={c.textSoft}
                  style={[styles.commentInput, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                />

                {/* El mismo botón redondo con `send` del chat (2026-10-05): era un rectángulo con
                    «Enviar» escrito, el único envío de la app que no se parecía a los demás. */}
                <Pressable
                  onPress={() => acciones.enviarComentario(post.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar comentario"
                  hitSlop={4}
                  style={[styles.sendCommentBtn, { backgroundColor: c.gold }]}
                >
                  <Icon name="send" size={TAMANO_ICONO.normal} color={c.onGold} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
  );
}

export const TarjetaPublicacionMuro = memo(TarjetaPublicacionMuroBase);

const styles = StyleSheet.create({
  /* El contenedor externo de una publicación: su borde se queda. Lo que se fue son los trece
     bordes que vivían adentro. */
  postCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  /** Cifras que cambian en pantalla: ancho de dígito fijo (AGENTS.md §4). */
  cifras: { fontVariant: ['tabular-nums'] },
  dayBadge: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaGridContainer: {
    borderRadius: space.radiusSm,
    overflow: 'hidden',
  },
  // SIN `height`: el alto sale del `aspectRatio` que se pasa en línea con la proporción real de la
  // foto (ver `proporcionesFoto` en esta pantalla). El `height: 120` que había acá era la causa de
  // que toda foto vertical apareciera recortada.
  /* Los cuatro recuadros de foto perdieron el borde: lo que tienen adentro es una imagen, que ya
     define su propia forma. Un contorno alrededor de una foto, dentro de una tarjeta que también
     tiene contorno, son dos marcos para una sola imagen. */
  mediaSingleBox: {
    width: '100%',
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Dos fotos: una al lado de la otra y cuadradas, como el mosaico de Instagram. Antes eran de
  // 100 px de alto con el ancho de media tarjeta, o sea apaisadas a la fuerza.
  mediaHalfBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sin `height: '100%'`: la fila que lo contiene ya no tiene alto en píxeles sino `aspectRatio`,
  // y un porcentaje contra un alto derivado es justo el caso frágil de Yoga. El estirado vertical
  // lo da el `alignItems: 'stretch'` que la fila trae por defecto.
  mediaLargeLeft: {
    flex: 1.4,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaSmallRight: {
    flex: 1,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Una publicación llegaba a tener tres filetes horizontales seguidos: resumen de reacciones,
     fila de acciones y comentarios. Se quedan los dos últimos, que separan cosas distintas; este
     iba 8 px encima de otro y sólo agregaba ruido. Lo reemplaza el aire. */
  reactionsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  rxCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: space.radiusSm,
  },
  rxCountTexto: {
    fontSize: 13,
    fontFamily: 'Jost_700Bold',
    fontVariant: ['tabular-nums'],
  },
  actionButtonsRow: {
    flexDirection: 'row',
    /* Alineadas a la IZQUIERDA, no repartidas. Con `flex: 1` en cada botón la fila se estiraba de
       borde a borde y "Like" quedaba pegado al margen, lejos del pulgar en un teléfono de 360 px.
       Agrupadas a la izquierda, las tres caen dentro del arco natural del dedo. */
    justifyContent: 'flex-start',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  actionBtn: {
    /* Sin `flex: 1`: cada botón mide lo que su contenido. `flexShrink` evita que los tres juntos
       desborden en 360 px, que es el ancho de referencia (AGENTS.md §2). */
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    /* 48px minimos (AGENTS.md 4): con `paddingVertical: 6` la fila medía ~26 y era la accion
       mas usada del Muro. `flexShrink` en la etiqueta evita que "Compartir" empuje la fila. */
    minHeight: 48,
    gap: 6,
    paddingVertical: 6,
    /* 8, no 4 ni 12. Sin `flex: 1` el respiro lateral es lo único que separa "Like" de
       "Comentar", así que 4 los pegaba. Pero con 12 los tres botones sumaban 280 px y llenaban
       justo la tarjeta de 281: quedaban agrupados a la izquierda y no se notaba, porque no
       sobraba sitio. Con 8 sobran ~25 px a la derecha y el agrupamiento SE VE.
       > Corregido 2026-10-05: ahora 4. Con íconos de 20 y texto de 14 (pedido del dueño) los tres
       > botones con 8 medían ~294 px y a 360 de ancho se cortaban en «Me gu…», «Comen…». Con 4
       > miden ~282 y entran en la tarjeta de 286; ya no se pegan, porque cada uno empieza con su
       > ícono de 20, que es lo que los separa a la vista. */
    paddingHorizontal: 4,
    borderRadius: space.radiusSm,
  },
  /** Texto de lectura (14), no versal de 10,5: es la acción más usada del Muro. */
  actionTexto: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    flexShrink: 1,
  },
  /** La chapa de reacciones, al principio del resumen. Misma altura de toque que las acciones. */
  rxCountBotonFila: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: space.gap,
  },
  commentCard: {
    borderRadius: space.radiusSm,
    padding: 12,
  },
  commentPhotoBox: {
    borderRadius: space.radiusSm,
    marginTop: 8,
    overflow: 'hidden',
    maxWidth: 220,
  },
  commentPhotoImage: {
    width: '100%',
    height: 130,
    borderRadius: space.radiusSm,
  },
  commentPhotoPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: space.radiusSm,
    padding: 8,
  },
  /* El clip y el botón de enviar son los dos controles de la fila de comentario: conservan su
     forma, pero pasan de 34 y ~30 px de alto a 48 (AGENTS.md §4). */
  attachPhotoBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Era `fontSize: 12`: por debajo del mínimo de input de AGENTS.md §4 (14–15.5). */
  commentInput: {
    flex: 1,
    /* Sin esto, en la web el campo no baja de su ancho propio y empujaba el botón de enviar fuera
       de la tarjeta a 360 px. */
    minWidth: 0,
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 15,
  },
  /* Redondo como el del chat, a 48 como el de adjuntar (AGENTS.md §4: 48–52). */
  sendCommentBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
