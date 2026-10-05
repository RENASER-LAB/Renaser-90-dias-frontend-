import React from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { AvatarPersona } from '../../../components/ui';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import { tacto } from '../../../utils/tacto';
import type { WallCategory } from '../types/community.types';
import type { FotoMuroNormalizada } from '../utils/normalizarImagen';

/** Lado de cada foto del mosaico y del recuadro para agregar otra. */
export const LADO_FOTO_NUEVA = 88;

export interface NuevaPublicacionProps {
  visible: boolean;
  alCancelar: () => void;
  /**
   * Publica (`ComunidadScreen.handlePublishPost`). Si falta el texto o la foto, ESE handler avisa
   * qué falta con una alerta; acá solo se decide cómo se ve el botón y qué vibración acompaña.
   */
  alPublicar: () => void;
  publicando: boolean;
  autor: { nombre: string; firma: string; avatarUrl?: string | null };
  texto: string;
  alCambiarTexto: (texto: string) => void;
  categorias: {
    lista: WallCategory[];
    cargando: boolean;
    error: string | null;
    recargar: () => void;
    /** La clave elegida, o `null`: la categoría es opcional. */
    elegida: string | null;
    alElegir: (clave: string | null) => void;
  };
  fotos: {
    lista: FotoMuroNormalizada[];
    agregando: boolean;
    alAgregar: () => void;
    alQuitar: (indice: number) => void;
  };
}

/** Se puede publicar con texto y al menos una foto (el backend exige una: `Publicacion.MEDIA_MIN = 1`). */
export function sePuedePublicar(texto: string, cantidadDeFotos: number, publicando: boolean): boolean {
  return texto.trim().length > 0 && cantidadDeFotos > 0 && !publicando;
}

/**
 * Escribir una publicación para el Muro, a pantalla completa (rediseño del 2026-10-05, tanda 2 de
 * Comunidad). El estado (texto, categoría, fotos) sigue viviendo en `ComunidadScreen`, que es quien
 * publica; este componente es solo cómo se ve y cómo responde.
 *
 * > **Antes del 2026-10-05** la cabecera decía «× CANCELAR», «NUEVA PUBLICACIÓN» y «PUBLICAR» en
 * > mayúsculas, el botón de publicar se veía igual de listo con el formulario vacío, el rótulo de
 * > las fotos era «FOTOS ADJUNTAS (AL MENOS UNA):» y agregar una foto era un chip de 48 px con «+
 * > Agregar»: la foto obligatoria era lo menos visible de la pantalla, y la elegida se veía como una
 * > miniatura de 24 px al lado de su nombre de archivo.
 *
 * - **La cabecera de las hojas del sistema**: ✕ de 24 en un área de 44 a la izquierda, el título en
 *   tipo oración al centro y una píldora «Publicar» a la derecha.
 * - **«Publicar» se ve apagado hasta que se puede publicar** (texto y al menos una foto). Tocarlo así
 *   igual responde: vibra con el «no» de `tacto.error` y la alerta de siempre dice qué falta. Un botón
 *   muerto que no explica nada dejaría a la persona adivinando.
 * - **Al publicar, `tacto.logro()`** en el mismo toque que cierra esta pantalla: es el instante en que
 *   la publicación aparece en el Muro (la subida sigue en segundo plano; si falla, vuelve el borrador
 *   con una alerta).
 * - **Las fotos se ven**: un mosaico de 88 × 88 con la foto real, y a continuación un recuadro del
 *   mismo tamaño con el ícono `imagePlus` para agregar otra.
 */
export function NuevaPublicacion({
  visible,
  alCancelar,
  alPublicar,
  publicando,
  autor,
  texto,
  alCambiarTexto,
  categorias,
  fotos,
}: NuevaPublicacionProps) {
  const { c, t } = useTheme();
  const puede = sePuedePublicar(texto, fotos.lista.length, publicando);

  const publicar = () => {
    if (publicando) return;
    if (puede) tacto.logro();
    else tacto.error();
    alPublicar();
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={alCancelar}>
      <SafeAreaView style={[styles.raiz, { backgroundColor: c.bg }]}>
        <View style={[styles.cabecera, { borderBottomColor: c.divider }]}>
          {/* El título va centrado en TODO el ancho, como en las cabeceras del sistema; los dos
              botones quedan encima, a los lados. */}
          <View style={styles.zonaTitulo} pointerEvents="none">
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.titulo, { color: c.textStrong }]}
            >
              Nueva publicación
            </Text>
          </View>
          <Pressable
            onPress={alCancelar}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            style={({ pressed }) => [styles.cancelar, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="close" size={24} color={c.textStrong} />
          </Pressable>
          <Presionable
            onPress={publicar}
            accessibilityRole="button"
            accessibilityLabel="Publicar"
            accessibilityState={{ disabled: !puede, busy: publicando }}
            contenedorStyle={styles.areaPublicar}
            style={[styles.publicar, { backgroundColor: c.gold, opacity: puede ? 1 : 0.4 }]}
          >
            <Text numberOfLines={1} style={[styles.publicarTexto, { color: c.onGold }]}>
              {publicando ? 'Publicando…' : 'Publicar'}
            </Text>
          </Presionable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.cuerpo}>
          <View style={styles.autor}>
            <AvatarPersona nombre={autor.nombre} avatarUrl={autor.avatarUrl} size={40} />
            <View style={styles.autorTextos}>
              <Text numberOfLines={1} style={[t.cardTitle, { color: c.textStrong }]}>
                {autor.nombre}
              </Text>
              {autor.firma ? (
                <Text numberOfLines={1} style={[t.small, { color: c.goldInk }]}>
                  {autor.firma}
                </Text>
              ) : null}
            </View>
          </View>

          <CategoriasDelPost {...categorias} />

          <TextInput
            value={texto}
            onChangeText={alCambiarTexto}
            placeholder="Escribe tu reflexión, victoria o experiencia de hoy (sin límite de caracteres)..."
            placeholderTextColor={c.textSoft}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Texto de la publicación"
            style={[styles.campo, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
          />

          <FotosDelPost {...fotos} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Las categorías del catálogo del servidor (`GET /api/v1/wall/categories`), no una lista escrita a
 * mano: el administrador las da de alta y les cambia emoji y nombre desde el panel. Elegir una es
 * OPCIONAL —`category` es opcional en el backend—, así que ninguna viene preseleccionada y volver
 * a tocar la elegida la desmarca. En ninguno de los tres estados de red el formulario queda
 * inutilizable: sin catálogo se publica igual, sin categoría.
 */
function CategoriasDelPost({ lista, cargando, error, recargar, elegida, alElegir }: NuevaPublicacionProps['categorias']) {
  const { c, t } = useTheme();
  if (cargando && lista.length === 0) {
    return <Text style={[t.small, { color: c.textSoft }]}>Cargando categorías…</Text>;
  }
  if (error && lista.length === 0) {
    return (
      <View style={styles.filaError}>
        <Text style={[t.body, { color: c.textSoft, flexShrink: 1 }]}>
          No pudimos cargar las categorías. Puedes publicar igual, sin categoría.
        </Text>
        <Pressable
          onPress={recargar}
          accessibilityRole="button"
          style={[styles.chip, { borderColor: c.gold, backgroundColor: c.cardBg }]}
        >
          <Text style={[styles.chipTexto, { color: c.goldInk }]}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }
  if (lista.length === 0) {
    return (
      <Text style={[t.body, { color: c.textSoft }]}>Todavía no hay categorías configuradas. Tu publicación se guarda igual.</Text>
    );
  }
  return (
    <View style={styles.chips}>
      {lista.map(categoria => {
        const activa = elegida === categoria.key;
        return (
          <Pressable
            key={categoria.key}
            onPress={() => {
              tacto.seleccion();
              alElegir(activa ? null : categoria.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            style={[
              styles.chip,
              activa
                ? { borderColor: c.gold, backgroundColor: c.goldWash }
                : { borderColor: c.border, backgroundColor: c.cardBgAlt },
            ]}
          >
            <Text
              style={[
                styles.chipTexto,
                { color: activa ? c.goldInk : c.text, fontFamily: activa ? 'Jost_500Medium' : 'Jost_400Regular' },
              ]}
            >
              {`${categoria.emoji} ${categoria.label}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Las fotos elegidas, a la vista, y el recuadro para agregar otra. */
function FotosDelPost({ lista, agregando, alAgregar, alQuitar }: NuevaPublicacionProps['fotos']) {
  const { c, t } = useTheme();
  return (
    <View style={styles.fotos}>
      <Text style={[t.small, { color: c.textSoft }]}>
        <Text style={{ fontFamily: 'Jost_500Medium', color: c.textStrong }}>Fotos</Text> · al menos una
      </Text>
      <View style={styles.mosaico}>
        {lista.map((foto, indice) => (
          <View key={foto.uri} style={[styles.foto, { backgroundColor: c.placeholderA }]}>
            <Image source={{ uri: foto.uri }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
            <Pressable
              onPress={() => alQuitar(indice)}
              accessibilityRole="button"
              accessibilityLabel={`Quitar la foto ${indice + 1}`}
              style={styles.quitar}
            >
              <View style={styles.quitarCirculo}>
                <Icon name="close" size={14} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>
        ))}
        <Presionable
          onPress={alAgregar}
          disabled={agregando}
          accessibilityRole="button"
          accessibilityLabel={lista.length === 0 ? 'Agregar una foto' : 'Agregar otra foto'}
          accessibilityState={{ disabled: agregando, busy: agregando }}
          style={[styles.foto, styles.agregar, { borderColor: c.borderStrong, backgroundColor: c.cardBg }]}
        >
          {agregando ? (
            <ActivityIndicator size="small" color={c.goldInk} />
          ) : (
            <Icon name="imagePlus" size={28} color={c.goldInk} />
          )}
          <Text style={[styles.agregarTexto, { color: c.textSoft }]}>{agregando ? 'Abriendo…' : 'Agregar'}</Text>
        </Presionable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  cabecera: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  zonaTitulo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 104,
    right: 104,
    justifyContent: 'center',
  },
  titulo: {
    textAlign: 'center',
    fontFamily: 'Jost_500Medium',
    fontSize: 17,
    lineHeight: 22,
  },
  cancelar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaPublicar: {
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 8,
  },
  publicar: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicarTexto: {
    fontFamily: 'Jost_500Medium',
    fontSize: 15,
    lineHeight: 20,
  },
  cuerpo: {
    padding: space.cardPad,
    gap: space.gapLg,
  },
  autor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  autorTextos: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  filaError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipTexto: {
    fontSize: 15,
    lineHeight: 20,
  },
  campo: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    fontSize: 15,
    lineHeight: 22,
  },
  fotos: {
    gap: 10,
  },
  mosaico: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foto: {
    width: LADO_FOTO_NUEVA,
    height: LADO_FOTO_NUEVA,
    borderRadius: space.radiusSm,
    overflow: 'hidden',
  },
  quitar: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    padding: 6,
  },
  quitarCirculo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agregar: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  agregarTexto: {
    fontFamily: 'Jost_500Medium',
    fontSize: 13,
    lineHeight: 17,
  },
});
