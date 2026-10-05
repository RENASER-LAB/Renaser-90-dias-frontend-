import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';
import { tacto } from '../../utils/tacto';
import { HojaDesdeAbajo } from './HojaDesdeAbajo';
import { BuscadorDeHoja } from './BuscadorDeHoja';

/**
 * Una hoja desde abajo con buscador y una lista para elegir UNA opción: el código de país del
 * WhatsApp y cada nivel de la ubicación (2026-10-05).
 *
 * - **La lista es virtualizada** (`FlatList` con alto fijo por fila): 249 países no se dibujan de una.
 * - **Lo elegido se ve al abrir**: la lista arranca con esa fila a la vista (dos filas por encima,
 *   para que se lea como «estás acá» y no como el primero de la lista), marcada con un ✓ y en negrita.
 * - **Elegir es un toque**: vibra con el «tic» de selección, avisa y quien la usa la cierra.
 * - **Desplazar la lista baja el teclado** (`keyboardDismissMode`), como en las listas del sistema.
 *
 * Qué opciones se muestran (y cómo se filtran sin tildes) lo decide quien la usa: cada selector
 * tiene su propia regla de búsqueda y no se tocó.
 */
export const ALTO_FILA_OPCION = 52;

export interface HojaDeOpcionesProps<T> {
  visible: boolean;
  alCerrar: () => void;
  titulo: string;
  /** Las opciones YA filtradas por la búsqueda. */
  opciones: readonly T[];
  claveDe: (opcion: T) => string;
  etiquetaDe: (opcion: T) => string;
  /** Lo que va antes del nombre (la bandera). */
  prefijoDe?: (opcion: T) => string | undefined;
  /** Lo que va a la derecha (el prefijo telefónico). */
  detalleDe?: (opcion: T) => string | undefined;
  esElegida: (opcion: T) => boolean;
  alElegir: (opcion: T) => void;
  busqueda: string;
  alBuscar: (texto: string) => void;
  placeholderBusqueda: string;
  etiquetaBusqueda: string;
  buscando?: boolean;
  autoCapitalize?: 'none' | 'words';
  /** Lo que va antes de la lista (la opción «Usar …» y las sugerencias de Google del distrito). */
  encabezadoDeLista?: React.ReactElement | null;
}

export function HojaDeOpciones<T>({
  visible,
  alCerrar,
  titulo,
  opciones,
  claveDe,
  etiquetaDe,
  prefijoDe,
  detalleDe,
  esElegida,
  alElegir,
  busqueda,
  alBuscar,
  placeholderBusqueda,
  etiquetaBusqueda,
  buscando,
  autoCapitalize,
  encabezadoDeLista,
}: HojaDeOpcionesProps<T>) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();

  const elegir = useCallback(
    (opcion: T) => {
      tacto.seleccion();
      alElegir(opcion);
    },
    [alElegir],
  );

  /* Dónde arranca la lista. Se calcula sobre la lista que se ve al abrir (sin búsqueda); al filtrar,
     la lista se vuelve a montar desde arriba (`key`), que es lo que se espera al buscar. */
  const indiceInicial = useMemo(() => {
    if (busqueda) return 0;
    const i = opciones.findIndex(esElegida);
    return i > 2 ? i - 2 : 0;
    // Sólo al abrir o al cambiar la lista: no perseguir la fila elegida mientras se mira.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opciones, busqueda === '']);

  const renderItem = useCallback(
    ({ item }: { item: T }) => (
      <OpcionDeHoja
        etiqueta={etiquetaDe(item)}
        prefijo={prefijoDe?.(item)}
        detalle={detalleDe?.(item)}
        elegida={esElegida(item)}
        alTocar={() => elegir(item)}
      />
    ),
    [detalleDe, elegir, esElegida, etiquetaDe, prefijoDe],
  );

  const sinResultados = busqueda.trim().length > 0 && opciones.length === 0 && !encabezadoDeLista;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo={titulo}
      tamano="grande"
      bajoElTitulo={
        <BuscadorDeHoja
          valor={busqueda}
          alCambiar={alBuscar}
          placeholder={placeholderBusqueda}
          etiqueta={etiquetaBusqueda}
          buscando={buscando}
          autoCapitalize={autoCapitalize}
        />
      }
    >
      <FlatList
        key={busqueda ? 'filtrada' : 'completa'}
        data={opciones}
        keyExtractor={claveDe}
        renderItem={renderItem}
        ListHeaderComponent={encabezadoDeLista ?? null}
        ListEmptyComponent={
          sinResultados ? (
            <Text style={[t.body, styles.vacio, { color: c.textSoft }]}>Sin resultados para «{busqueda.trim()}».</Text>
          ) : null
        }
        initialScrollIndex={indiceInicial < opciones.length ? indiceInicial : 0}
        getItemLayout={(_, index) => ({ length: ALTO_FILA_OPCION, offset: ALTO_FILA_OPCION * index, index })}
        initialNumToRender={14}
        maxToRenderPerBatch={14}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) }}
        style={styles.lista}
      />
    </HojaDesdeAbajo>
  );
}

/**
 * Una fila de la lista: 52 px de alto, la palabra en tamaño de lectura y un ✓ dorado si es la
 * elegida. Al apoyar el dedo se tiñe (como las filas de las listas del sistema); no se encoge,
 * porque en una lista a todo el ancho la escala se lee como un temblor.
 */
export function OpcionDeHoja({
  etiqueta,
  prefijo,
  detalle,
  elegida,
  alTocar,
}: {
  etiqueta: string;
  prefijo?: string;
  detalle?: string;
  elegida: boolean;
  alTocar: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityState={{ selected: elegida }}
      accessibilityLabel={detalle ? `${etiqueta}, ${detalle}` : etiqueta}
      style={({ pressed }) => [styles.fila, { backgroundColor: pressed ? c.goldWash : 'transparent' }]}
    >
      {prefijo ? <Text style={styles.prefijo}>{prefijo}</Text> : null}
      <Text
        numberOfLines={1}
        style={[
          t.body,
          styles.etiqueta,
          { color: c.textStrong, fontFamily: elegida ? 'Jost_500Medium' : 'Jost_400Regular' },
        ]}
      >
        {etiqueta}
      </Text>
      {detalle ? <Text style={[t.body, styles.detalle, { color: c.textSoft }]}>{detalle}</Text> : null}
      <View style={styles.marca}>{elegida ? <Icon name="check" size={18} color={c.goldInk} strokeWidth={2} /> : null}</View>
      <View style={[styles.divisor, { backgroundColor: c.divider }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lista: {
    flex: 1,
  },
  fila: {
    height: ALTO_FILA_OPCION,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  prefijo: {
    fontSize: 22,
    lineHeight: 28,
  },
  etiqueta: {
    flex: 1,
    fontSize: 16,
  },
  detalle: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  marca: {
    width: 20,
    alignItems: 'center',
  },
  divisor: {
    position: 'absolute',
    left: 20,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  vacio: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
