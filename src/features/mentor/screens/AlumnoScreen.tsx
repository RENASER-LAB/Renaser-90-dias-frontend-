import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Aparicion } from '../../../components/Aparicion';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { diasDesde, etiquetaDeMotivo } from '../reglas';
import type { AlumnoConEstado } from '../types/mentor.types';

/**
 * El detalle de un aprendiz, para que el mentor sepa QUÉ decirle antes de escribirle.
 *
 * Muestra exactamente lo que el listado ya trajo. No pide nada más al servidor: el desglose
 * día por día de la semana necesitaría su propio endpoint, y en vez de dibujar una rejilla
 * con datos supuestos se dice que falta. Un mentor que ve siete casillas inventadas toma
 * decisiones sobre la vida de alguien con información falsa.
 */
export function AlumnoScreen({ alumno, onVolver }: { alumno: AlumnoConEstado; onVolver: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const nombre = alumno.nombre?.trim() || 'Aprendiz sin nombre';
  const dias = diasDesde(alumno.ultimaActividadEn);
  const pct = alumno.cumplimiento;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          onPress={onVolver}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver a mi célula"
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
            MI CÉLULA
          </Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          estilos.contenido,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
      >
        <Aparicion>
          <Text style={[t.screenTitle, { color: c.text, fontSize: 21 }]} numberOfLines={2}>
            {nombre}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 4 }]}>
            {alumno.diaPrograma === null ? 'Día por confirmar'
              : alumno.diaPrograma <= 0 ? 'Todavía no arrancó su programa'
              : `Día ${alumno.diaPrograma} de 90`}
            {dias !== null ? ` · última actividad hace ${dias === 0 ? 'menos de un día' : dias === 1 ? '1 día' : `${dias} días`}` : ''}
          </Text>
        </Aparicion>

        <Aparicion retardo={70} style={{ marginTop: 20 }}>
          <MicroLabel>SEMANA EN CURSO</MicroLabel>
          <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {pct === null ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 19 }]}>
                El servidor todavía no calcula los hábitos de esta semana para este aprendiz.
                Cuando lo haga, aparecerá aquí el cumplimiento real.
              </Text>
            ) : (
              <>
                <Text style={[estilos.grande, { color: c.textStrong }]}>
                  {alumno.habitosCumplidos} de {alumno.habitosProgramados}
                </Text>
                <Text style={[t.micro, { color: c.textSoft, fontSize: 11.5, marginTop: 2 }]}>
                  hábitos programados cumplidos
                </Text>
                <View style={[estilos.riel, { backgroundColor: c.border }]}>
                  <View style={[estilos.relleno, { backgroundColor: c.gold, width: `${Math.round(pct * 100)}%` }]} />
                </View>
                <Text style={[t.micro, { color: c.chevron, fontSize: 10.5, marginTop: 8, lineHeight: 15 }]}>
                  Cumplimiento = cumplidos ÷ programados. Los días no programados no cuentan.
                </Text>
              </>
            )}
          </View>
        </Aparicion>

        <Aparicion retardo={140} style={{ marginTop: 20 }}>
          <MicroLabel>{alumno.requiereSeguimiento ? 'QUÉ NECESITA' : 'ESTADO'}</MicroLabel>
          <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg, gap: 10 }]}>
            {alumno.requiereSeguimiento ? (
              alumno.motivos.map((m, i) => (
                <View key={`${m.clase}-${i}`} style={estilos.motivo}>
                  <Icon
                    name={m.clase === 'sin_actividad' ? 'clock' : m.clase === 'habitos_pendientes' ? 'diamond' : 'camera'}
                    size={15}
                    color={c.danger}
                  />
                  <Text style={[t.body, { color: c.text, fontSize: 13.5, flex: 1 }]}>
                    {etiquetaDeMotivo(m)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={estilos.motivo}>
                <Icon name="checkCircle" size={16} color={c.success} />
                <Text style={[t.body, { color: c.text, fontSize: 13.5, flex: 1 }]}>
                  Va al día. No hay nada pendiente esta semana.
                </Text>
              </View>
            )}
          </View>
        </Aparicion>

        <Aparicion retardo={210} style={{ marginTop: 20 }}>
          <View style={[estilos.nota, { borderColor: c.border }]}>
            <Icon name="info" size={15} color={c.chevron} />
            <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, flex: 1, lineHeight: 18 }]}>
              El desglose día por día y las evidencias de este aprendiz necesitan su propio
              endpoint. Aparecerán aquí cuando exista, sin cambiar esta pantalla.
            </Text>
          </View>
        </Aparicion>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44 },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 8 },
  grande: { fontFamily: 'Jost_500Medium', fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] },
  riel: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  relleno: { height: '100%', borderRadius: 3 },
  motivo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nota: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
});
