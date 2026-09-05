import React, { forwardRef, useImperativeHandle, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
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

/**
 * Handle imperativo para capturar el lienzo desde fuera (`TerminosScreen`/`PactoScreen`, al subir
 * la firma como evidencia legal a S3 — ver CLAUDE.md de la tarea "firmas del onboarding"). No
 * cambia nada del dibujo ni del estilo: solo agrega la capacidad de "sacarle una foto" al recuadro
 * ya existente.
 */
export interface SignatureCanvasHandle {
  /**
   * Captura el recuadro de la firma (el `canvasBox`, con sus trazos ya dibujados) como PNG y
   * devuelve sus bytes en **base64**. `null` si todavía no hay ningún trazo — capturar un
   * lienzo vacío no tendría valor legal ninguno.
   */
  capturarComoPngBase64: () => Promise<string | null>;
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(function SignatureCanvas(
  {
    initialSignature,
    onSignatureChange,
    label = 'FIRMA DIGITAL SOLEMNE (CON TU DEDO)',
    error,
    hideControls = false,
    hideHeader = false,
  },
  ref
) {
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
  // Ref al recuadro visible (borde + fondo + trazos SVG) — es exactamente lo que se captura como
  // PNG, ni más ni menos que lo que la persona ve dibujado en pantalla.
  const canvasBoxRef = useRef<View>(null);

  const hasSignature = paths.length > 0;

  useImperativeHandle(
    ref,
    () => ({
      capturarComoPngBase64: async () => {
        if (pathsRef.current.length === 0 || !canvasBoxRef.current) return null;
        // PNG, no el SVG vectorial: es evidencia legal y tiene que poder abrirse en cualquier
        // visor de imágenes, adjuntarse a un correo o pegarse en un PDF sin depender de un
        // navegador (decisión del dueño del producto, ver CLAUDE.md de la tarea).
        //
        // BUG ENCONTRADO 2026-09-04 (E-97): esto usaba el `result: 'tmpfile'` por defecto de
        // `captureRef` y devolvía una RUTA de archivo temporal, que después se leía con
        // `fetch(uri).arrayBuffer()`. En Android esa ruta viene SIN el esquema `file://`, así que
        // el `fetch` no la resolvía y devolvía —con status OK— un cuerpo de 14 bytes con el texto
        // literal "File not found". Como la respuesta era "exitosa", nada fallaba y esos 14 bytes
        // se subían a S3 como si fueran la firma. Verificado en el bucket real: los objetos
        // pesaban 14 bytes y contenían ese texto.
        //
        // `result: 'base64'` devuelve los bytes directamente, sin pasar por el sistema de archivos
        // ni por `fetch` — elimina la clase entera de fallo, que en una firma con valor probatorio
        // no se puede permitir.
        //
        // El try/catch NO es defensivo por costumbre: en web `captureRef` usa html2canvas, que
        // puede fallar por razones ajenas a la firma. Si dejáramos escapar la excepción, tumbaría
        // la pantalla entera de Términos o del Pacto — o sea que un problema al RESPALDAR la firma
        // impediría firmar. Devolver `null` es lo que ya declara el contrato del método, y quien
        // llama sabe qué hacer con eso: seguir sin respaldo, y en el Pacto, no marcar el hito.
        try {
          return await captureRef(canvasBoxRef, { format: 'png', quality: 1, result: 'base64' });
        } catch (error) {
          // Nunca la imagen ni la URL: solo que falló y dónde.
          console.warn('[firma] no se pudo capturar el lienzo como PNG', error);
          return null;
        }
      },
    }),
    []
  );

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
        ref={canvasBoxRef}
        // `collapsable={false}`: en Android, react-native-view-shot necesita que la vista a
        // capturar exista de verdad en el árbol nativo (si no, la "optimiza" fuera y la captura
        // sale vacía). No es un estilo, no cambia nada visual.
        collapsable={false}
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
});

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
