import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';
import { MicroLabel } from './ui';

export interface SignatureData {
  type: 'drawn';
  data: string;
}

export function safeParsePaths(data: string | undefined | null): string[] {
  if (!data || typeof data !== 'string' || data.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface SignatureCanvasProps {
  initialSignature?: SignatureData | null;
  onSignatureChange?: (hasSignature: boolean, signatureData: SignatureData) => void;
  label?: string;
  error?: string | null;
  hideControls?: boolean;
  hideHeader?: boolean;
}

export function SignatureCanvas({
  initialSignature,
  onSignatureChange,
  label = 'FIRMA DIGITAL SOLEMNE (CON TU DEDO)',
  error,
  hideControls = false,
  hideHeader = false,
}: SignatureCanvasProps) {
  const { c, t } = useTheme();

  const [paths, setPaths] = useState<string[]>(() => {
    if (initialSignature && initialSignature.data) {
      return safeParsePaths(initialSignature.data);
    }
    return [];
  });

  const currentPathRef = useRef<string>('');
  const pathsRef = useRef<string[]>(paths);
  pathsRef.current = paths;

  const hasSignature = paths.length > 0;

  // PanResponder with anti-interception flags for Android & Xiaomi
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          const startPoint = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          currentPathRef.current = startPoint;
          setPaths([...pathsRef.current, startPoint]);
        },

        onPanResponderMove: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          const nextSegment = `${currentPathRef.current} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          currentPathRef.current = nextSegment;

          const updated = [...pathsRef.current];
          if (updated.length > 0) {
            updated[updated.length - 1] = nextSegment;
            setPaths(updated);
          }
        },

        onPanResponderRelease: () => {
          const serialized = JSON.stringify(pathsRef.current);
          if (onSignatureChange) {
            onSignatureChange(pathsRef.current.length > 0, {
              type: 'drawn',
              data: serialized,
            });
          }
        },
      }),
    [onSignatureChange]
  );

  const handleClear = () => {
    setPaths([]);
    currentPathRef.current = '';
    if (onSignatureChange) {
      onSignatureChange(false, { type: 'drawn', data: '' });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Label and Status */}
      {!hideHeader && !hideControls && (
        <View style={styles.headerRow}>
          <MicroLabel>{label}</MicroLabel>
          {hasSignature && (
            <View style={styles.signedBadge}>
              <Icon name="check" size={12} color="#4E9F76" />
              <Text style={[t.micro, { color: '#4E9F76', fontWeight: '700', fontSize: 10 }]}>
                TRAZADO
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Drawing Canvas */}
      <View
        style={[
          styles.canvasBox,
          {
            borderColor: error ? '#E06A66' : hasSignature ? c.gold : c.borderStrong,
            backgroundColor: c.cardBgAlt,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Svg style={StyleSheet.absoluteFill}>
          {paths.map((p, index) => (
            <Path
              key={index}
              d={p}
              stroke={c.gold}
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>

        {!hasSignature && !hideControls && (
          <View style={styles.placeholder} pointerEvents="none">
            <Icon name="spark" size={22} color={c.tabInactive} />
            <Text style={[t.body, { color: c.tabInactive, fontSize: 13.5, marginTop: 6 }]}>
              Dibuja tu firma con el dedo en este recuadro
            </Text>
            <View style={[styles.baseline, { borderColor: c.border }]} />
          </View>
        )}
      </View>

      {/* Footer Controls */}
      {!hideControls && (
        <View style={styles.footerRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[t.small, { color: error ? '#E06A66' : c.textSoft, fontSize: 11.5 }]}>
              {error || 'Trazo requerido para sellar tu compromiso legal'}
            </Text>
          </View>

          {hasSignature && (
            <Pressable
              onPress={handleClear}
              hitSlop={10}
              style={[styles.clearBtn, { borderColor: c.border, backgroundColor: c.cardBg }]}
            >
              <Text style={[t.micro, { color: '#E06A66', fontSize: 10.5, fontWeight: '700' }]}>
                LIMPIAR FIRMA
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  canvasBox: {
    height: 145,
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  baseline: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  clearBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
});
