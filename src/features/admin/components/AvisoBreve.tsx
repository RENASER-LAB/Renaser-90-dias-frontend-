import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';

/** Cuánto se queda a la vista. Largo a propósito: se lee con calma, no se persigue. */
const SEGUNDOS_A_LA_VISTA = 8;

/**
 * El aviso final de una acción que salió bien (26/09, A-4: «aprobar en un toque + aviso final»).
 *
 * No es un diálogo: no hay que tocar «OK» para seguir aprobando. Aparece abajo, se va solo a los
 * ocho segundos o al tocarlo, y el lector de pantalla lo anuncia (`accessibilityLiveRegion`).
 * Los errores siguen yendo por `avisar`, que sí detiene: un fallo hay que leerlo.
 */
export function AvisoBreve({ texto, onCerrar }: { texto: string | null; onCerrar: () => void }) {
  const { c } = useTheme();

  useEffect(() => {
    if (!texto) return;
    const reloj = setTimeout(onCerrar, SEGUNDOS_A_LA_VISTA * 1000);
    return () => clearTimeout(reloj);
  }, [texto, onCerrar]);

  if (!texto) return null;
  return (
    <View pointerEvents="box-none" style={estilos.capa}>
      <Pressable
        onPress={onCerrar}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={texto}
        accessibilityHint="Toca para cerrar"
        style={[estilos.aviso, { backgroundColor: c.cardBgAlt, borderColor: c.success }]}
      >
        <Icon name="checkCircle" size={20} color={c.success} />
        <Text style={[estilos.texto, { color: c.textStrong }]}>{texto}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  /* Arriba del lanzador del asistente, que ocupa la esquina de abajo. */
  capa: { position: 'absolute', left: 16, right: 16, bottom: 96 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  texto: { flex: 1, fontFamily: 'Jost_400Regular', fontSize: 16, lineHeight: 23 },
});
