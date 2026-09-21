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
import { safeParsePaths } from './firma/safeParsePaths';
import { Icon } from './Icon';
import { MicroLabel } from './ui';

export interface SignatureData {
  /**
   * `drawn` — trazo con el dedo: `data` es el JSON de los caminos SVG (lo que lee `safeParsePaths`).
   * `typed` — firma electrónica estilizada: `data` es el nombre que se selló, tal cual, sin JSON.
   *
   * La variante nueva es `typed` (AGENTS.md §3, "Modo Dual"). Es aditiva a propósito: lo que ya
   * estaba guardado no trae `type`, o trae `'drawn'`, y en los dos casos se sigue leyendo como
   * trazo — por eso los chequeos de acá preguntan por `=== 'typed'` y nunca por `!== 'drawn'`.
   */
  type: 'drawn' | 'typed';
  data: string;
}

// Reexportado para no mover a quien ya lo importa desde acá (`TerminosScreen`). La implementación
// se fue a su propio módulo para poder probarla sin arrastrar React Native — ver el archivo.
export { safeParsePaths } from './firma/safeParsePaths';

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
  /**
   * Nombre a estilizar para la FIRMA ELECTRÓNICA (AGENTS.md §3, "Modo Dual": trazo con el dedo
   * **y** nombre caligráfico). Cuando llega con texto aparece el selector de modo; cuando no
   * llega —que es lo que hacen `TerminosScreen` y `PactoScreen`— el componente se comporta
   * exactamente como antes: solo dedo, sin selector y sin ninguna rama nueva a la vista.
   */
  nombreFirmaElectronica?: string;
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
    nombreFirmaElectronica,
  },
  ref
) {
  const { c, t } = useTheme();

  // Sin nombre no hay firma electrónica posible, así que tampoco selector: el modo dual se habilita
  // solo, sin una bandera aparte que pueda quedar en `true` con el nombre vacío.
  const nombreElectronico = (nombreFirmaElectronica ?? '').trim();
  const permiteDual = nombreElectronico.length > 0;

  const [modo, setModo] = useState<'trazo' | 'electronica'>(() =>
    permiteDual && initialSignature?.type === 'typed' ? 'electronica' : 'trazo'
  );

  const [paths, setPaths] = useState<string[]>(() => {
    // Una firma electrónica guardada NO es JSON de trazos: `data` es el nombre pelado. Pasarla por
    // `safeParsePaths` devolvería `[]` igual (no rompe), pero preguntar por el tipo deja dicho que
    // acá se están leyendo trazos y no cualquier cosa que venga en `data`.
    if (initialSignature && initialSignature.data && initialSignature.type !== 'typed') {
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

  const firmadoElectronicamente = permiteDual && modo === 'electronica';
  const hasSignature = firmadoElectronicamente || paths.length > 0;

  // `useImperativeHandle` se crea una sola vez (deps `[]`), así que adentro no se puede leer
  // `modo` ni `permiteDual` directamente: se leen por ref, igual que `pathsRef`.
  const firmadoElectronicamenteRef = useRef(firmadoElectronicamente);
  firmadoElectronicamenteRef.current = firmadoElectronicamente;

  useImperativeHandle(
    ref,
    () => ({
      capturarComoPngBase64: async () => {
        // Antes bastaba con mirar los trazos. Con el modo dual hay una segunda forma de tener
        // firma —el nombre caligráfico dibujado dentro del MISMO recuadro—, y esa también tiene
        // que poder capturarse: si no, sellar en modo electrónico devolvería `null` y quien llama
        // lo leería como "no se pudo capturar la firma".
        if (!firmadoElectronicamenteRef.current && pathsRef.current.length === 0) return null;
        if (!canvasBoxRef.current) return null;
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

  /** Publica la firma electrónica hacia arriba. El equivalente de `publicarTrazos` para el otro modo. */
  const publicarFirmaElectronica = useCallback(
    (nombre: string) => {
      if (!onSignatureChange) return;
      const limpio = nombre.trim();
      onSignatureChange(limpio.length > 0, { type: 'typed', data: limpio });
    },
    [onSignatureChange]
  );

  /**
   * Cambiar de modo BORRA lo del otro: una persona firma de una sola manera, y dejar trazos
   * escondidos detrás del nombre caligráfico haría que el PNG que se sube como evidencia legal no
   * coincidiera con lo que se ve en pantalla.
   */
  const cambiarModo = useCallback(
    (siguiente: 'trazo' | 'electronica') => {
      if (modo === siguiente) return;
      // Nada de esto va adentro del updater de `setModo`: React puede invocar un updater más de
      // una vez para detectar impurezas, y avisar hacia arriba dos veces por un solo toque es
      // justo lo que no queremos en el componente que decide si hay firma o no.
      setModo(siguiente);
      setPaths([]);
      pathsRef.current = [];
      currentPathRef.current = '';
      if (siguiente === 'electronica') {
        publicarFirmaElectronica(nombreElectronico);
      } else {
        onSignatureChange?.(false, { type: 'drawn', data: '' });
      }
    },
    [modo, nombreElectronico, onSignatureChange, publicarFirmaElectronica]
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

        onPanResponderRelease: publicarTrazos,

        // El unico aviso que llega cuando el navegador se queda con el gesto. Sin esta linea, en
        // web el trazo cancelado se pierde para quien nos usa.
        onPanResponderTerminate: publicarTrazos,
      }),
    [publicarTrazos]
  );

  const handleClear = () => {
    setPaths([]);
    pathsRef.current = [];
    currentPathRef.current = '';
    // "Limpiar" deja el recuadro como al principio, y al principio se firma con el dedo.
    if (permiteDual) setModo('trazo');
    if (onSignatureChange) {
      onSignatureChange(false, { type: 'drawn', data: '' });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Label and Status */}
      {!hideHeader && !hideControls && (
        <View style={styles.headerRow}>
          {/*
            La etiqueta se lleva el ancho sobrante y el sello se queda con el suyo. Sin esto —era
            una fila con `space-between` y nada más— en pantallas angostas la etiqueta
            ("FIRMA DE ACEPTACIÓN LEGAL (CON TU DEDO)") ocupaba dos líneas, empujaba el sello fuera
            del borde derecho y el "✓ TRAZADO" quedaba cortado a mitad de palabra.
          */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <MicroLabel>{label}</MicroLabel>
          </View>
          {hasSignature && (
            <View style={styles.signedBadge}>
              <Icon name="check" size={12} color="#4E9F76" />
              <Text style={[t.micro, { color: c.success, fontFamily: 'Jost_700Bold', fontSize: 10 }]}>
                TRAZADO
              </Text>
            </View>
          )}
        </View>
      )}

      {/*
        Selector de modo (AGENTS.md §3, "Modo Dual"). Se dibuja solo cuando hay nombre que
        estilizar, así que las pantallas que no lo piden no ven ningún control nuevo. No depende de
        `hideControls`: eso oculta el cintillo y el pie —que `PactoScreen` reemplaza por los
        suyos—, pero el selector no es chrome, es la única puerta al segundo modo de firmar.
      */}
      {permiteDual && (
        <View style={styles.modoRow}>
          {([
            { clave: 'trazo', etiqueta: 'CON MI DEDO' },
            { clave: 'electronica', etiqueta: 'FIRMA ELECTRÓNICA' },
          ] as const).map(opcion => {
            const activo = modo === opcion.clave;
            return (
              <Pressable
                key={opcion.clave}
                onPress={() => cambiarModo(opcion.clave)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={
                  opcion.clave === 'trazo'
                    ? 'Firmar trazando con el dedo'
                    : 'Firmar electrónicamente con tu nombre'
                }
                style={[
                  styles.modoBtn,
                  {
                    borderColor: activo ? c.gold : c.border,
                    backgroundColor: activo ? c.goldWash : c.cardBg,
                  },
                ]}
              >
                <Text
                  style={[
                    t.micro,
                    {
                      color: activo ? c.goldInk : c.textSoft,
                      fontFamily: 'Jost_700Bold',
                      fontSize: 11,
                      letterSpacing: 1,
                    },
                  ]}
                >
                  {opcion.etiqueta}
                </Text>
              </Pressable>
            );
          })}
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
            borderColor: error ? c.danger : hasSignature ? c.gold : c.borderStrong,
            backgroundColor: c.cardBgAlt,
          },
        ]}
        // En modo electrónico el recuadro no escucha el dedo: si lo hiciera, rozarlo agregaría
        // trazos encima del nombre caligráfico.
        {...(firmadoElectronicamente ? {} : panResponder.panHandlers)}
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
        {firmadoElectronicamente ? (
          /*
            Firma electrónica: el nombre vive DENTRO de `canvasBoxRef`, que es justamente lo que
            `capturarComoPngBase64` fotografía. Así el PNG que se sube como evidencia legal es la
            misma imagen que la persona aprobó en pantalla, venga del dedo o del teclado.

            Jost bold en cursiva y no una serif: AGENTS.md §4 reserva Fraunces para `t.hero` y
            `t.screenTitle`, y esto no es ninguno de los dos.
          */
          <View style={styles.firmaElectronicaBox} pointerEvents="none">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ fontFamily: 'Jost_700Bold', fontStyle: 'italic', fontSize: 26, color: c.goldInk }}
            >
              {nombreElectronico}
            </Text>
            <View style={[styles.baseline, { borderColor: c.border }]} />
          </View>
        ) : (
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
        )}

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
            <Text style={[t.small, { color: error ? c.danger : c.textSoft, fontSize: 11.5 }]}>
              {error || 'Trazo requerido para sellar tu compromiso legal'}
            </Text>
          </View>

          {hasSignature && (
            <Pressable
              onPress={handleClear}
              hitSlop={10}
              style={[styles.clearBtn, { borderColor: c.border, backgroundColor: c.cardBg }]}
            >
              <Text style={[t.micro, { color: c.danger, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}>
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
    gap: 10,
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
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
  modoRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  modoBtn: {
    flex: 1,
    flexShrink: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 10,
  },
  firmaElectronicaBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
