import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';

/**
 * El buscador de una hoja con lista (país del WhatsApp, ubicación). 2026-10-05.
 *
 * - **No abre el teclado solo.** Al abrir la hoja se ve la lista con lo elegido marcado; quien quiere
 *   filtrar toca el buscador. Abrir el teclado mientras la hoja sube movería la pantalla dos veces y
 *   taparía la mitad de la lista antes de haberla visto.
 * - **16 px de letra**: con menos, Safari en iPhone agranda la página al enfocar el campo.
 * - La ✕ para borrar aparece solo con algo escrito, con 44 px de área.
 * - Quitar las tildes al comparar lo hace quien filtra (`normalizeText` / `normalize`), no este campo.
 */
export function BuscadorDeHoja({
  valor,
  alCambiar,
  placeholder,
  etiqueta,
  buscando = false,
  autoCapitalize = 'none',
}: {
  valor: string;
  alCambiar: (texto: string) => void;
  placeholder: string;
  /** Lo que anuncia el lector de pantalla (el placeholder desaparece al escribir). */
  etiqueta: string;
  /** Una búsqueda en la red en curso (las sugerencias de Google para el distrito). */
  buscando?: boolean;
  autoCapitalize?: 'none' | 'words';
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.caja, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
      <Icon name="search" size={18} color={c.tabInactive} strokeWidth={1.6} />
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        placeholder={placeholder}
        placeholderTextColor={c.tabInactive}
        accessibilityLabel={etiqueta}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        style={[styles.campo, { color: c.textStrong }]}
      />
      {buscando ? <ActivityIndicator size="small" color={c.goldInk} /> : null}
      {valor.length > 0 ? (
        <Pressable
          onPress={() => alCambiar('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Borrar la búsqueda"
          style={[styles.borrar, { backgroundColor: c.tabInactive }]}
        >
          <Icon name="close" size={10} color={c.cardBgAlt} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  campo: {
    flex: 1,
    height: '100%',
    fontFamily: 'Jost_400Regular',
    fontSize: 16,
  },
  borrar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
