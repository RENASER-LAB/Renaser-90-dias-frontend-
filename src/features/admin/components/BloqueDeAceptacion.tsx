import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';

/**
 * Un bloque numerado de la hoja «Aceptar» (spec 025, FR-021 y FR-022): cerrado dice en una línea lo que está elegido y se puede reabrir;
 * abierto muestra sus opciones. Uno solo está abierto a la vez, así que la hoja no crece sin límite y hay un único scroll. Sin animación al
 * abrir y cerrar: se toca pocas veces por persona y el cambio tiene que verse en el acto.
 */
export function BloqueDeAceptacion({
  numero,
  titulo,
  valor,
  abierto,
  onAlternar,
  deshabilitado = false,
  children,
}: {
  numero: number;
  titulo: string;
  /** Lo elegido, en una línea («Diplomado Renaser · 1 año»). */
  valor: string;
  abierto: boolean;
  onAlternar: () => void;
  deshabilitado?: boolean;
  children: React.ReactNode;
}) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.bloque, { borderColor: abierto ? c.gold : c.border, backgroundColor: c.cardBg }]}>
      <Presionable
        disabled={deshabilitado}
        onPress={() => {
          tacto.seleccion();
          onAlternar();
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto, disabled: deshabilitado }}
        accessibilityLabel={`${numero}. ${titulo}: ${valor}`}
        accessibilityHint={abierto ? 'Toca para cerrar' : 'Toca para cambiarlo'}
        style={estilos.cabecera}
      >
        <View style={[estilos.numero, { backgroundColor: abierto ? c.gold : c.goldWash }]}>
          <Text style={[t.small, { color: abierto ? c.onGold : c.goldInk, fontFamily: fuentes.negrita, fontSize: 16 }]}>{numero}</Text>
        </View>
        <View style={estilos.textos}>
          <Text style={[t.small, { color: c.textSoft, fontSize: 16 }]}>{titulo}</Text>
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]} numberOfLines={abierto ? undefined : 2}>
            {valor}
          </Text>
        </View>
        <View style={{ transform: [{ rotate: abierto ? '270deg' : '90deg' }] }}>
          <Icon name="chevron" size={16} color={c.chevron} />
        </View>
      </Presionable>
      {abierto ? <View style={estilos.cuerpo}>{children}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10 },
  numero: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, flexShrink: 1, gap: 2 },
  cuerpo: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
});
