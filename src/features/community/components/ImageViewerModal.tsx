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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';

export interface ImageViewerItem {
  url: string;
  mimeType?: string;
  title?: string;
}

export interface ImageViewerModalProps {
  visible: boolean;
  onClose: () => void;
  images: ImageViewerItem[];
  initialIndex?: number;
  authorName?: string;
  timeAgo?: string;
  postText?: string;
}

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
}: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const lastTapRef = useRef<number>(0);

  // Animaciones de arrastre hacia abajo (Facebook swipe-down to dismiss)
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Soporte para gestos nativos de Android / Xiaomi: volver atrás cierra el visor
  useSystemBackHandler(onClose, visible);

  // Sincronizar índice inicial cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setControlsVisible(true);
      translateY.setValue(0);
      scaleAnim.setValue(1);

      setTimeout(() => {
        if (flatListRef.current && initialIndex > 0 && initialIndex < images.length) {
          flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
        }
      }, 50);
    }
  }, [visible, initialIndex, images.length, translateY, scaleAnim]);

  // Manejo de toque simple (modo cine / controles) y doble toque (zoom 1x ⇄ 2x)
  const handleImagePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Doble toque: alterna zoom
      const targetScale = isZoomed ? 1 : 2.2;
      setIsZoomed(!isZoomed);
      Animated.spring(scaleAnim, {
        toValue: targetScale,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      // Toque simple: oculta/muestra controles si no está en zoom
      if (!isZoomed) {
        setControlsVisible(prev => !prev);
      }
    }
    lastTapRef.current = now;
  }, [isZoomed, scaleAnim]);

  // PanResponder para arrastrar hacia abajo y cerrar estilo Facebook
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          !isZoomed &&
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
        {controlsVisible && (
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

            {/* Contador de fotos (si hay más de 1) */}
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
        {/* PIE CON TEXTO DEL POST (FOOTER OVERLAY)                                   */}
        {/* ========================================================================= */}
        {controlsVisible && (postText || authorName) && (
          <View
            style={[
              styles.bottomOverlay,
              {
                paddingBottom: Math.max(insets.bottom, 20),
                paddingHorizontal: 20,
              },
            ]}
          >
            {authorName && (
              <Text style={styles.captionAuthor}>
                {authorName} {timeAgo ? <Text style={styles.captionTime}>· {timeAgo}</Text> : null}
              </Text>
            )}

            {postText ? (
              <Text numberOfLines={4} style={styles.captionText}>
                {postText}
              </Text>
            ) : null}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 10,
    gap: 4,
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
    fontSize: 14,
    lineHeight: 20,
  },
});
