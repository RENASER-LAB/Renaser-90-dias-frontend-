import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { ResumenDeGrupos } from '../components/ResumenDeGrupos';
import type { LecturaDeGrupos } from '../hooks/useLecturaPorSemana';

/**
 * El semáforo por grupos del **líder de mentores** (`GET /api/v1/semaforo/groups`, contrato §4.4):
 * los totales y una tarjeta por grupo con su mentor, cuántos aprendices hay en cada color y el
 * promedio. **Sin nombres de aprendices** (RL-07): las tarjetas no se abren, y se dice por qué.
 *
 * Es estado de Hoy, como la bandeja de tickets —la otra pantalla propia de este rol—, y la abre
 * también el aviso del sábado (`/semaforo/grupos`). Recibe la MISMA lectura con la que Hoy decide
 * si mostrar la entrada; al abrirse vuelve a la ventana vigente y la relee, porque el barrido corre
 * cada hora y la entrada pudo quedar abierta desde temprano.
 *
 * Un único scroll, cuerpo de 16 px y controles de 48 px (§5).
 */
export function SemaforoGruposScreen({ lectura, onVolver }: { lectura: LecturaDeGrupos; onVolver: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  /* Solo al abrir: la función cambia en cada render y no tiene que volver a correr. */
  const volverAVigente = useRef(lectura.volverAVigente);
  useEffect(() => {
    volverAVigente.current();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          onPress={onVolver}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>VOLVER</Text>
        </Pressable>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18, flex: 1 }]} numberOfLines={1}>
          Semáforo por grupos
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 8,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <ResumenDeGrupos
          lectura={lectura}
          ayudaPorGrupo="Solo cantidades: a cada aprendiz lo acompaña y lo ve su mentor."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 10 },
  /* 48 px de alto: el mínimo cómodo para una sola mano (AGENTS.md §4). */
  volver: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
