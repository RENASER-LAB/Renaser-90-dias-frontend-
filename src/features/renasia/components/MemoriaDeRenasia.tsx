import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import type { MemoriaRenasiaApi, RecuerdoRenasiaApi } from '../types/renasia.types';
import { agruparRecuerdos, memoriaVacia } from '../utils/memoria';

type Props = {
  memoria: MemoriaRenasiaApi | null;
  cargando: boolean;
  borrando: boolean;
  error: string | null;
  onOlvidar: (id: string) => void;
  onOlvidarTodo: () => void;
  onReintentar: () => void;
};

/**
 * "Lo que Renasia recuerda de ti" (D-167). La persona ve lo que el acompañante aprendió de ella y lo
 * borra. Las confirmaciones usan `Alert` de `components/Alerta`, que también funciona en web (E-144).
 * Los `id` de los recuerdos no se dibujan nunca: son solo para borrar.
 */
export function MemoriaDeRenasia({ memoria, cargando, borrando, error, onOlvidar, onOlvidarTodo, onReintentar }: Props) {
  const { c, t } = useTheme();

  /* Si hay resumen se avisa que también se va: el servidor lo borra porque podía nombrar lo que se
     olvida, y que desaparezca sin avisar parecería un error. */
  const confirmarOlvidar = (recuerdo: RecuerdoRenasiaApi) =>
    Alert.alert(
      '¿Olvidar esto?',
      memoria?.resumen
        ? `"${recuerdo.texto}"\n\nTambién se borra el resumen de lo que venían conversando.`
        : `"${recuerdo.texto}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Olvidar', style: 'destructive', onPress: () => onOlvidar(recuerdo.id) },
      ]
    );

  const confirmarOlvidarTodo = () =>
    Alert.alert('¿Olvidar todo?', 'Renasia deja de recordar todo lo que conversaron hasta hoy. Tu chat no se borra.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Olvidar todo', style: 'destructive', onPress: onOlvidarTodo },
    ]);

  return (
    <View style={{ gap: space.gap }}>
      <Text style={[t.body, { color: c.textSoft, lineHeight: 21 }]}>
        Renasia lo aprende de lo que conversan, para acompañarte mejor. Nunca guarda cómo te sientes ni nada
        de tu salud, y puedes borrarlo cuando quieras.
      </Text>

      {error ? (
        <Pressable
          onPress={onReintentar}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          style={[styles.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}
        >
          <Text style={[t.body, { color: c.textSoft, flex: 1 }]}>{error}</Text>
          <Text style={[t.small, { color: c.goldInk }]}>Reintentar</Text>
        </Pressable>
      ) : null}

      {!memoria && cargando ? (
        <Text style={[t.body, { color: c.textSoft }]}>Cargando…</Text>
      ) : memoria && memoriaVacia(memoria) ? (
        <Text style={[t.body, { color: c.textSoft }]}>
          Renasia todavía no recuerda nada de ti. Va aprendiendo de lo que conversan.
        </Text>
      ) : memoria ? (
        <>
          {agruparRecuerdos(memoria.recuerdos).map(grupo => (
            <View key={grupo.categoria} style={{ gap: 8 }}>
              <MicroLabel>{grupo.titulo}</MicroLabel>
              <View style={[styles.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                {grupo.recuerdos.map((recuerdo, i) => (
                  <View
                    key={recuerdo.id}
                    style={[
                      styles.recuerdo,
                      { borderBottomColor: c.divider, borderBottomWidth: i < grupo.recuerdos.length - 1 ? 1 : 0 },
                    ]}
                  >
                    <Text style={[t.body, { color: c.text, flex: 1 }]}>{recuerdo.texto}</Text>
                    <Pressable
                      onPress={() => confirmarOlvidar(recuerdo)}
                      disabled={borrando}
                      accessibilityRole="button"
                      accessibilityLabel={`Olvidar: ${recuerdo.texto}`}
                      hitSlop={8}
                      style={styles.olvidar}
                    >
                      <Icon name="close" size={14} color={borrando ? c.micro : c.textSoft} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {memoria.resumen ? (
            <View style={{ gap: 8 }}>
              <MicroLabel>Lo que venían conversando</MicroLabel>
              <Text style={[t.body, { color: c.text, lineHeight: 21 }]}>{memoria.resumen}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={confirmarOlvidarTodo}
            disabled={borrando}
            accessibilityRole="button"
            accessibilityLabel="Olvidar todo lo que Renasia recuerda de ti"
            style={[styles.olvidarTodo, { borderColor: c.border, backgroundColor: c.cardBg }]}
          >
            <Text style={[t.small, { color: borrando ? c.micro : c.textSoft, letterSpacing: 1 }]}>
              {borrando ? 'BORRANDO…' : 'OLVIDAR TODO'}
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    borderWidth: 1,
    borderRadius: space.radius,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  caja: { borderWidth: 1, borderRadius: space.radius, overflow: 'hidden' },
  recuerdo: { paddingVertical: 12, paddingHorizontal: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  /** 48 px de área táctil con el `hitSlop`: la cruz sola es chica. */
  olvidar: { padding: 8 },
  olvidarTodo: { borderWidth: 1, borderRadius: space.radiusSm, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
