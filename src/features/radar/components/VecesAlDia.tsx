import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';

/**
 * «Veces al día» (spec 019, modo Personalizado): la cifra con − / + (botones de 48). Solo la cifra: las horas no se muestran,
 * se reparten parejo entre las que caben. Con veces distintas entre los días marcados la cifra dice «—».
 */
export function VecesAlDia({
  veces,
  noBaja,
  noSube,
  alBajar,
  alSubir,
  deshabilitado = false,
}: {
  veces: number | null;
  noBaja: boolean;
  noSube: boolean;
  alBajar: () => void;
  alSubir: () => void;
  deshabilitado?: boolean;
}) {
  const { c } = useTheme();

  return (
    <View>
      <MicroLabel>Veces al día</MicroLabel>
      <View style={estilos.fila}>
        <Presionable
          onPress={() => {
            tacto.seleccion();
            alBajar();
          }}
          disabled={noBaja || deshabilitado}
          accessibilityRole="button"
          accessibilityLabel="Una vez menos"
          accessibilityState={{ disabled: noBaja || deshabilitado }}
          style={[estilos.boton, { backgroundColor: c.goldWash }, (noBaja || deshabilitado) && estilos.apagado]}
        >
          <Text style={[estilos.signo, { color: c.goldInk }]}>−</Text>
        </Presionable>
        <Text
          style={[estilos.cifra, { color: c.text }]}
          accessibilityLabel={veces === null ? 'Veces distintas según el día' : `${veces} ${veces === 1 ? 'vez' : 'veces'} al día`}
          accessibilityLiveRegion="polite"
        >
          {veces === null ? '—' : veces}
        </Text>
        <Presionable
          onPress={() => {
            tacto.seleccion();
            alSubir();
          }}
          disabled={noSube || deshabilitado}
          accessibilityRole="button"
          accessibilityLabel="Una vez más"
          accessibilityState={{ disabled: noSube || deshabilitado }}
          style={[estilos.boton, { backgroundColor: c.goldWash }, (noSube || deshabilitado) && estilos.apagado]}
        >
          <Text style={[estilos.signo, { color: c.goldInk }]}>+</Text>
        </Presionable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 6 },
  boton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  apagado: { opacity: 0.35 },
  signo: { fontFamily: fuentes.negrita, fontSize: 24, lineHeight: 28 },
  cifra: { fontFamily: fuentes.negrita, fontSize: 30, lineHeight: 36, minWidth: 52, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
