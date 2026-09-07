import React, { forwardRef, useImperativeHandle, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  Platform,
  GestureResponderEvent,
  ViewStyle,
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

/**
 * BUG ENCONTRADO 2026-09-07 (E-152): la firma sale torcida en el build web abierto desde un iPhone.
 * En web el gesto del dedo lo negocia el NAVEGADOR antes que nosotros, y sin `touch-action` Safari
 * de iOS lo interpreta como un scroll de la pagina. Se lleva el gesto, y pasan dos cosas:
 *
 * 1) La pagina se desplaza junto con el dedo, asi que el recuadro se mueve CON el. Como los trazos
 *    se graban relativos al recuadro (`locationX/locationY` = clientX/Y menos el borde del recuadro,
 *    ver `createResponderEvent` de react-native-web), el movimiento vertical del dedo se cancela
 *    con el de la pagina y solo sobrevive el horizontal: la firma queda aplastada contra una franja,
 *    un puñado de rayas casi rectas que no se parecen a lo que la persona dibujo.
 * 2) Al quedarse con el gesto, Safari emite `touchcancel`. Eso NO es soltar el dedo:
 *    react-native-web lo trata como terminacion y, a diferencia de `scroll`, NO la puede vetar
 *    `onPanResponderTerminationRequest` — solo puede con `contextmenu`, `scroll` y
 *    `selectionchange` (ver `ResponderSystem`). Por eso los flags anti-intercepcion que alcanzan
 *    en Android nativo aca no alcanzan: hay que impedir que el navegador considere el gesto.
 *
 * `touchAction: 'none'` es exactamente eso, y es la unica palanca que sirve: los listeners de
 * `touchmove` que react-native-web instala sobre `document` son pasivos, asi que un
 * `preventDefault()` desde el PanResponder no haria nada.
 *
 * Contrapartida aceptada: sobre el recuadro ya no se puede arrastrar para scrollear la pagina. Es
 * lo correcto para un pad de firma — el recuadro existe para dibujar — y el resto de la pantalla
 * sigue scrolleando normal.
 *
 * `userSelect: 'none'` va de la mano: sin el, arrastrar el dedo sobre el recuadro empieza a
 * seleccionar texto y iOS levanta la lupa encima de la firma.
 *
 * En nativo no aplica nada de esto (no hay navegador negociando), de ahi el `Platform.OS`.
 * `touchAction` no existe en los tipos de React Native — es una propiedad solo de web que
 * react-native-web si entiende y usa internamente (`ScrollViewBase`, `Pressable`) —, de ahi el
 * casteo.
 */
const estiloGestoWeb =
  Platform.OS === 'web'
    ? ({ touchAction: 'none', userSelect: 'none' } as unknown as ViewStyle)
    : null;

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

  /**
   * Publica los trazos hacia arriba. Se llama al soltar el dedo y TAMBIEN cuando el gesto se
   * cancela: un `touchcancel` del navegador no dispara `onPanResponderRelease` sino
   * `onPanResponderTerminate` (ver el comentario de `estiloGestoWeb`). Si solo escucharamos el
   * release, un trazo interrumpido quedaria dibujado en pantalla pero jamas llegaria al estado de
   * Terminos o del Pacto: la persona veria su firma y el pie seguiria diciendo "SIN FIRMAR", o peor,
   * se guardaria como evidencia legal una firma a la que le falta el ultimo trazo.
   */
  const publicarTrazos = useCallback(() => {
    if (!onSignatureChange) return;
    onSignatureChange(pathsRef.current.length > 0, {
      type: 'drawn',
      data: JSON.stringify(pathsRef.current),
    });
  }, [onSignatureChange]);

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

        onPanResponderRelease: publicarTrazos,

        // El unico aviso que llega cuando el navegador se queda con el gesto. Sin esta linea, en
        // web el trazo cancelado se pierde para quien nos usa.
        onPanResponderTerminate: publicarTrazos,
      }),
    [publicarTrazos]
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
          // Solo tiene efecto en web: le saca el gesto al navegador para que el dedo dibuje en vez
          // de scrollear. Ver `estiloGestoWeb`.
          estiloGestoWeb,
          {
            borderColor: error ? '#E06A66' : hasSignature ? c.gold : c.borderStrong,
            backgroundColor: c.cardBgAlt,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/*
          BUG ENCONTRADO 2026-09-06 (E-136): `width`/`height` al 100% NO son decorativos, son EL
          arreglo. Acá decía solo `<Svg style={StyleSheet.absoluteFill}>`, y en WEB eso deja un
          `<svg>` del DOM con `position:absolute` y los cuatro lados en 0 pero SIN ancho. Un
          `<svg>` es un elemento reemplazado: con `width:auto` el navegador ignora `right`/`bottom`
          y cae al tamaño de objeto por defecto de CSS, **300 × 150 px**. O sea que el área
          dibujable quedaba clavada en 300 px pegada a la izquierda, midiera lo que midiera el
          recuadro visible — el trazo se cortaba a media caja. Medido en Chrome: recuadro de 462 px
          → `<svg>` de 300 px; con estos dos props → 460 px, la caja entera.

          En nativo no se veía porque Yoga sí estira un hijo absoluto con los cuatro lados en 0.
          De hecho `react-native-svg` omite a propósito su default de `100%` cuando la posición es
          `absolute` (`elements/Svg.js`), contando con ese estirado — y en web ese default es
          justamente el que faltaba.

          Porcentaje y no píxeles medidos: así el lienzo sigue al recuadro en cualquier ancho
          (móvil angosto, tablet, web) sin `onLayout` ni números mágicos, y sin el frame en blanco
          que tendría una medición. Sin `viewBox` a propósito: 1 unidad = 1 px, que es la escala en
          la que `locationX/locationY` graba los trazos.
        */}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
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
