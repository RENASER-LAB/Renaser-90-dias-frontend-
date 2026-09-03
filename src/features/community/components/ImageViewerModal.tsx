import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Pressable,
  Animated,
  PanResponder,
  FlatList,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { elegirYNormalizarFotoMuro, type FotoMuroNormalizada } from '../utils/normalizarImagen';
import { SharePostSheet } from './SharePostSheet';
import type { ChatConversation } from '../../../screens/ComunidadScreen';

export interface ImageViewerItem {
  url: string;
  mimeType?: string;
  title?: string;
}

export interface ImageViewerCommentItem {
  id: string;
  author: string;
  avatar?: string;
  role?: string;
  text: string;
  photoAttached?: string;
  likes: number;
  dislikes: number;
  userReaction?: 'like' | 'dislike' | null;
  timeAgo: string;
}

export interface ImageViewerModalProps {
  visible: boolean;
  onClose: () => void;
  images: ImageViewerItem[];
  initialIndex?: number;
  authorName?: string;
  timeAgo?: string;
  postText?: string;
  postId?: string;
  likes?: number;
  dislikes?: number;
  userReaction?: 'like' | 'dislike' | null;
  comments?: ImageViewerCommentItem[];
  onToggleLike?: (postId: string) => void;
  onToggleDislike?: (postId: string) => void;
  onCommentVote?: (postId: string, commentId: string, type: 'like' | 'dislike') => void;
  onAddComment?: (postId: string, text: string, photoUri?: string) => Promise<void> | void;
  onShare?: (postId: string) => void;
  conversations?: ChatConversation[];
  tieneCelula?: boolean;
  onShareToConversation?: (conv: ChatConversation) => Promise<void> | void;
}

const EMOJIS_RAPIDOS = ['🔥', '👏', '💪', '⚡', '❤️', '🦅', '🎯', '🙌'];

function cacheKeyEstable(url: string): string {
  return url.split('?')[0];
}

export function ImageViewerModal({
  visible,
  onClose,
  images,
  initialIndex = 0,
  authorName,
  timeAgo,
  postText,
  postId,
  likes = 0,
  dislikes = 0,
  userReaction = null,
  comments = [],
  onToggleLike,
  onToggleDislike,
  onCommentVote,
  onAddComment,
  onShare,
  conversations = [],
  tieneCelula = false,
  onShareToConversation,
}: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);

  // Panel inferior de comentarios (Bottom Sheet estilo Facebook)
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentPhoto, setCommentPhoto] = useState<FotoMuroNormalizada | null>(null);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Panel inferior de compartir (Apps externas, Global, Célula, Directos)
  const [showShareSheet, setShowShareSheet] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const lastTapRef = useRef<number>(0);

  // Animaciones de arrastre hacia abajo (Facebook swipe-down to dismiss)
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Soporte de navegación por gestos Android / Xiaomi:
  // Si el panel de compartir o comentarios está abierto, atrás lo cierra; si no, cierra el visor
  useSystemBackHandler(() => {
    if (showShareSheet) {
      setShowShareSheet(false);
      return true;
    }
    if (showCommentsSheet) {
      setShowCommentsSheet(false);
      return true;
    }
    onClose();
    return true;
  }, visible);

  // Sincronizar estado inicial cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setControlsVisible(true);
      setShowCommentsSheet(false);
      setIsTextExpanded(false);
      setCommentText('');
      setCommentPhoto(null);
      translateY.setValue(0);
      scaleAnim.setValue(1);

      setTimeout(() => {
        if (flatListRef.current && initialIndex > 0 && initialIndex < images.length) {
          flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
        }
      }, 50);
    }
  }, [visible, initialIndex, images.length, translateY, scaleAnim]);

  // Manejo de toque simple y doble toque (zoom 1x ⇄ 2.2x)
  const handleImagePress = useCallback(() => {
    if (showCommentsSheet) {
      setShowCommentsSheet(false);
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Doble toque: zoom toggle
      const targetScale = isZoomed ? 1 : 2.2;
      setIsZoomed(!isZoomed);
      Animated.spring(scaleAnim, {
        toValue: targetScale,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      // Toque simple: alternar controles
      if (!isZoomed) {
        setControlsVisible(prev => !prev);
      }
    }
    lastTapRef.current = now;
  }, [isZoomed, scaleAnim, showCommentsSheet]);

  // PanResponder para arrastrar hacia abajo y cerrar estilo Facebook
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          !isZoomed &&
          !showCommentsSheet &&
          gestureState.dy > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 90 || gestureState.vy > 0.8) {
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 6,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Seleccionar foto para el comentario
  const handlePickCommentPhoto = async () => {
    try {
      const foto = await elegirYNormalizarFotoMuro();
      if (foto) {
        setCommentPhoto(foto);
      }
    } catch {
      Alert.alert('Foto', 'No se pudo seleccionar la foto.');
    }
  };

  // Enviar comentario desde el visor
  const handleSubmitComment = async () => {
    if (!postId || !onAddComment) return;
    const text = commentText.trim();
    if (!text) {
      if (commentPhoto) {
        Alert.alert('Falta el texto', 'Escribe algo para acompañar tu foto.');
      }
      return;
    }

    setEnviandoComentario(true);
    try {
      await onAddComment(postId, text, commentPhoto?.uri);
      setCommentText('');
      setCommentPhoto(null);
    } catch {
      Alert.alert('Error', 'No se pudo publicar el comentario.');
    } finally {
      setEnviandoComentario(false);
    }
  };

  // Abrir panel inferior de compartir (Apps externas, Global, Célula, Directos)
  const handleShare = useCallback(() => {
    setShowCommentsSheet(false);
    setShowShareSheet(true);
  }, []);

  if (!visible || images.length === 0) {
    return null;
  }

  // Opacidad de fondo calculada en base al arrastre
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, screenHeight * 0.4],
    outputRange: [1, 0.4],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />

      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: 'black',
            opacity: backdropOpacity,
          },
        ]}
      >
        {/* Contenido principal con soporte de arrastre vertical */}
        <Animated.View
          style={[
            styles.animatedWrapper,
            {
              transform: [{ translateY }, { scale: scaleAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {images.length === 1 ? (
            <Pressable
              onPress={handleImagePress}
              style={[styles.imageSlide, { width: screenWidth, height: screenHeight }]}
            >
              <Image
                source={{
                  uri: images[0].url,
                  cacheKey: cacheKeyEstable(images[0].url),
                }}
                style={styles.fullImage}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
              />
            </Pressable>
          ) : (
            <FlatList
              ref={flatListRef}
              data={images}
              keyExtractor={(item, idx) => item.url + '-' + idx}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex < images.length ? initialIndex : 0}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              onMomentumScrollEnd={ev => {
                const newIndex = Math.round(ev.nativeEvent.contentOffset.x / screenWidth);
                if (newIndex >= 0 && newIndex < images.length) {
                  setCurrentIndex(newIndex);
                }
              }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={handleImagePress}
                  style={[styles.imageSlide, { width: screenWidth, height: screenHeight }]}
                >
                  <Image
                    source={{
                      uri: item.url,
                      cacheKey: cacheKeyEstable(item.url),
                    }}
                    style={styles.fullImage}
                    contentFit="contain"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                </Pressable>
              )}
            />
          )}
        </Animated.View>

        {/* ========================================================================= */}
        {/* BARRA SUPERIOR (HEADER ESTILO FACEBOOK / X)                                */}
        {/* ========================================================================= */}
        {controlsVisible && !showCommentsSheet && !showShareSheet && (
          <View
            style={[
              styles.topBar,
              {
                paddingTop: Math.max(insets.top, 16),
                paddingHorizontal: 16,
              },
            ]}
          >
            {/* Botón Cerrar ✕ */}
            <Pressable
              onPress={onClose}
              style={styles.circleBtn}
              hitSlop={12}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>

            {/* Contador de fotos */}
            {images.length > 1 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {images.length}
                </Text>
              </View>
            )}

            {/* Datos del Autor en cabecera */}
            {authorName ? (
              <View style={styles.authorHeaderBox}>
                <Text numberOfLines={1} style={styles.authorHeaderText}>
                  {authorName}
                </Text>
                {timeAgo ? (
                  <Text style={styles.timeAgoHeaderText}>{timeAgo}</Text>
                ) : null}
              </View>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* BARRA INFERIOR FLOTANTE CON ACCIONES Y TEXTO DEL POST                     */}
        {/* ========================================================================= */}
        {controlsVisible && !showCommentsSheet && !showShareSheet && (
          <View
            style={[
              styles.bottomOverlay,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                paddingHorizontal: 18,
              },
            ]}
          >
            {authorName && (
              <Text style={styles.captionAuthor}>
                {authorName} {timeAgo ? <Text style={styles.captionTime}>· {timeAgo}</Text> : null}
              </Text>
            )}

            {postText ? (
              <View>
                <Text
                  numberOfLines={isTextExpanded ? undefined : 3}
                  style={styles.captionText}
                >
                  {postText}
                </Text>
                {postText.length > 90 && (
                  <Pressable
                    onPress={() => setIsTextExpanded(prev => !prev)}
                    hitSlop={6}
                    style={{ marginTop: 2 }}
                  >
                    <Text style={styles.verMasBtnText}>
                      {isTextExpanded ? 'Ver menos' : 'Ver más...'}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}

            {/* BOTONES TRANSPARENTES: ME GUSTA, COMENTAR Y COMPARTIR */}
            {postId && (
              <View style={styles.actionsBar}>
                {/* Botón Me Gusta */}
                <Pressable
                  onPress={() => onToggleLike?.(postId)}
                  style={styles.actionBtnTransparent}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 16 }}>👍</Text>
                  <Text
                    style={[
                      styles.actionBtnText,
                      userReaction === 'like' && { color: '#70d2a0', fontWeight: '800' },
                    ]}
                  >
                    {likes > 0 ? `${likes} ` : ''}Me gusta
                  </Text>
                </Pressable>

                {/* Botón Comentar */}
                <Pressable
                  onPress={() => setShowCommentsSheet(true)}
                  style={styles.actionBtnTransparent}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 16 }}>💬</Text>
                  <Text style={[styles.actionBtnText, { color: '#E5C689' }]}>
                    {comments.length > 0 ? `${comments.length} ` : ''}Comentar
                  </Text>
                </Pressable>

                {/* Botón Compartir */}
                <Pressable
                  onPress={handleShare}
                  style={styles.actionBtnTransparent}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 16 }}>↗️</Text>
                  <Text style={styles.actionBtnText}>
                    Compartir
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* PANEL DESPLEGABLE / BOTTOM SHEET DE COMENTARIOS (ESTILO FACEBOOK)         */}
        {/* ========================================================================= */}
        {showCommentsSheet && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.commentsSheetWrapper}
          >
            <View style={[styles.commentsSheetBox, { maxHeight: screenHeight * 0.72 }]}>
              {/* Cabecera del Panel de Comentarios */}
              <View style={styles.commentsSheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 15 }}>💬</Text>
                  <Text style={styles.commentsSheetTitle}>
                    Comentarios ({comments.length})
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowCommentsSheet(false)}
                  style={styles.closeSheetBtn}
                  hitSlop={8}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}>✕</Text>
                </Pressable>
              </View>

              {/* Lista de Comentarios con scroll independiente */}
              <ScrollView
                style={styles.commentsListScroll}
                contentContainerStyle={{ padding: 14, gap: 10 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {comments.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24, gap: 4 }}>
                    <Text style={{ fontSize: 24 }}>💭</Text>
                    <Text style={styles.emptyCommentsTitle}>Sé el primero en comentar</Text>
                    <Text style={styles.emptyCommentsSub}>Comparte tu perspectiva con la tribu.</Text>
                  </View>
                ) : (
                  comments.map(cItem => {
                    const isLong = cItem.text.length > 90;
                    const isExpanded = !!expandedComments[cItem.id];
                    const displayText = isLong && !isExpanded ? cItem.text.slice(0, 90) + '...' : cItem.text;

                    return (
                      <View key={cItem.id} style={styles.commentItemCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.commentAuthorName}>
                            {cItem.author} {cItem.role ? `(${cItem.role})` : ''}
                          </Text>
                          <Text style={styles.commentTimeText}>{cItem.timeAgo}</Text>
                        </View>

                        <Text style={styles.commentItemBody}>{displayText}</Text>

                        {isLong && (
                          <Pressable
                            onPress={() => setExpandedComments(prev => ({ ...prev, [cItem.id]: !prev[cItem.id] }))}
                            hitSlop={6}
                            style={{ marginTop: 2 }}
                          >
                            <Text style={styles.commentVerMasText}>
                              {isExpanded ? 'Ver menos' : 'Ver más...'}
                            </Text>
                          </Pressable>
                        )}

                        {/* Foto adjunta en comentario */}
                        {cItem.photoAttached && (
                          <View style={styles.commentPhotoAttachBox}>
                            <Image
                              source={{ uri: cItem.photoAttached }}
                              style={styles.commentPhotoAttachImage}
                              contentFit="cover"
                              transition={200}
                            />
                          </View>
                        )}

                        {/* Votos Like / Dislike en cada comentario */}
                        {postId && onCommentVote && (
                          <View style={styles.commentVoteRow}>
                            <Pressable
                              onPress={() => onCommentVote(postId, cItem.id, 'like')}
                              style={styles.commentVoteBtn}
                              hitSlop={6}
                            >
                              <Text style={{ fontSize: 11 }}>👍</Text>
                              <Text
                                style={[
                                  styles.commentVoteCount,
                                  cItem.userReaction === 'like' && { color: '#70d2a0', fontWeight: '800' },
                                ]}
                              >
                                {cItem.likes}
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => onCommentVote(postId, cItem.id, 'dislike')}
                              style={styles.commentVoteBtn}
                              hitSlop={6}
                            >
                              <Text style={{ fontSize: 11 }}>👎</Text>
                              <Text
                                style={[
                                  styles.commentVoteCount,
                                  cItem.userReaction === 'dislike' && { color: '#f28e8e', fontWeight: '800' },
                                ]}
                              >
                                {cItem.dislikes}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Tira de Emojis Rápidos */}
              <View style={styles.emojisStrip}>
                {EMOJIS_RAPIDOS.map(emoji => (
                  <Pressable
                    key={emoji}
                    onPress={() => setCommentText(prev => prev + emoji)}
                    style={styles.emojiChip}
                    hitSlop={4}
                  >
                    <Text style={{ fontSize: 14 }}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Previsualización compacta de foto adjunta en comentario */}
              {commentPhoto && (
                <View style={styles.photoCompactPreview}>
                  <Image
                    source={{ uri: commentPhoto.uri }}
                    style={styles.photoCompactImg}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <Text style={styles.photoCompactTitle}>Foto lista</Text>
                    <Text style={styles.photoCompactSub}>Se adjuntará al enviar</Text>
                  </View>
                  <Pressable
                    onPress={() => setCommentPhoto(null)}
                    style={styles.removePhotoCompactBtn}
                    hitSlop={6}
                  >
                    <Text style={{ color: '#f28e8e', fontSize: 11, fontWeight: 'bold' }}>✕</Text>
                  </Pressable>
                </View>
              )}

              {/* Input y botón enviar */}
              <View
                style={[
                  styles.commentInputRow,
                  {
                    paddingBottom: Math.max(insets.bottom, 12),
                  },
                ]}
              >
                <Pressable
                  onPress={handlePickCommentPhoto}
                  style={styles.attachBtn}
                  hitSlop={6}
                >
                  <Text style={{ fontSize: 14 }}>📷</Text>
                </Pressable>

                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Escribe un comentario..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.sheetInput}
                  multiline
                />

                <Pressable
                  onPress={handleSubmitComment}
                  disabled={enviandoComentario}
                  style={[
                    styles.sendBtn,
                    commentText.trim().length > 0 && { backgroundColor: '#E5C689' },
                  ]}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.sendBtnText,
                      commentText.trim().length > 0 && { color: '#1E1B18' },
                    ]}
                  >
                    {enviandoComentario ? '...' : 'Enviar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ========================================================================= */}
        {/* BOTTOM SHEET DE COMPARTIR (EXTERNO, GLOBAL, CÉLULA, DIRECTOS)             */}
        {/* ========================================================================= */}
        {showShareSheet && (
          <View style={styles.shareSheetWrapper}>
            <SharePostSheet
              post={{
                id: postId || 'unknown',
                author: authorName,
                text: postText,
                media: images.map(img => ({ url: img.url })),
              }}
              conversations={conversations}
              tieneCelula={tieneCelula}
              onClose={() => setShowShareSheet(false)}
              onShareExternal={async () => {
                try {
                  const shareUrl = images[currentIndex]?.url || images[0]?.url || '';
                  const textToShare = postText ? `"${postText}"` : '';
                  const byAuthor = authorName ? `Publicado por ${authorName} en Renaser` : 'Comunidad Renaser';
                  await Share.share({
                    title: 'Renaser Muro',
                    message: `${byAuthor}\n${textToShare}\n${shareUrl ? `\nVer foto: ${shareUrl}` : ''}`.trim(),
                  });
                } catch {}
              }}
              onShareToConversation={async conv => {
                if (onShareToConversation) {
                  await onShareToConversation(conv);
                }
                setShowShareSheet(false);
              }}
            />
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSlide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  counterText: {
    color: '#FFFFFF',
    fontFamily: 'Jost_500Medium',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  authorHeaderBox: {
    alignItems: 'flex-end',
    maxWidth: 160,
  },
  authorHeaderText: {
    color: '#FFFFFF',
    fontFamily: 'Jost_500Medium',
    fontSize: 12,
  },
  timeAgoHeaderText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 10,
    gap: 6,
  },
  captionAuthor: {
    color: '#E5C689',
    fontFamily: 'Jost_700Bold',
    fontSize: 13,
  },
  captionTime: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
  },
  captionText: {
    color: '#FFFFFF',
    fontFamily: 'Jost_400Regular',
    fontSize: 13.5,
    lineHeight: 19,
  },
  verMasBtnText: {
    color: '#E5C689',
    fontFamily: 'Jost_500Medium',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  actionBtnTransparent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Jost_500Medium',
    fontSize: 12.5,
  },

  // Estilos del Bottom Sheet de Comentarios
  commentsSheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  shareSheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 25,
  },
  commentsSheetBox: {
    backgroundColor: '#1E1B18',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.3)',
    overflow: 'hidden',
  },
  commentsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  commentsSheetTitle: {
    color: '#FFFFFF',
    fontFamily: 'Jost_700Bold',
    fontSize: 14,
  },
  closeSheetBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsListScroll: {
    flexGrow: 0,
  },
  emptyCommentsTitle: {
    color: '#FFFFFF',
    fontFamily: 'Jost_700Bold',
    fontSize: 13,
    marginTop: 4,
  },
  emptyCommentsSub: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
  },
  commentItemCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  commentAuthorName: {
    color: '#E5C689',
    fontFamily: 'Jost_500Medium',
    fontSize: 11.5,
  },
  commentTimeText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Jost_400Regular',
    fontSize: 9.5,
  },
  commentItemBody: {
    color: '#FFFFFF',
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  commentVerMasText: {
    color: '#E5C689',
    fontFamily: 'Jost_500Medium',
    fontSize: 10,
    fontWeight: '700',
  },
  commentPhotoAttachBox: {
    marginTop: 6,
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: 220,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.4)',
    backgroundColor: '#1E1B18',
  },
  commentPhotoAttachImage: {
    width: '100%',
    height: 130,
    borderRadius: 7,
  },
  commentVoteRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    alignItems: 'center',
  },
  commentVoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  commentVoteCount: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
  },
  emojisStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  emojiChip: {
    padding: 4,
  },
  photoCompactPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 6,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.4)',
  },
  photoCompactImg: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  photoCompactTitle: {
    color: '#E5C689',
    fontFamily: 'Jost_500Medium',
    fontSize: 10.5,
  },
  photoCompactSub: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Jost_400Regular',
    fontSize: 9,
  },
  removePhotoCompactBtn: {
    padding: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 6,
    backgroundColor: '#1E1B18',
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sheetInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
  },
  sendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Jost_700Bold',
    fontSize: 11,
  },
});

