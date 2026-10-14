import React from 'react';
import { ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

import { AvisoDeMantenimiento } from './AvisoDeMantenimiento';

/**
 * Una sección entera apagada (el Muro, el chat de Tribu, Training…): el aviso en el mismo contenedor de desplazamiento
 * que tendría la sección, con su mismo relleno, así la cabecera, la barra que se esconde al desplazar y el gesto de
 * volver siguen igual (spec 002). Un solo `ScrollView`, como pide AGENTS.md §2.
 */
export function SeccionEnMantenimiento({
  aviso,
  alReintentar,
  contentContainerStyle,
  ...resto
}: {
  aviso: string | null;
  alReintentar?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
} & Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...resto}
      contentContainerStyle={[{ flexGrow: 1, paddingBottom: 36 }, contentContainerStyle]}
    >
      <View style={{ paddingTop: 14 }}>
        <AvisoDeMantenimiento aviso={aviso} alReintentar={alReintentar} />
      </View>
    </ScrollView>
  );
}
