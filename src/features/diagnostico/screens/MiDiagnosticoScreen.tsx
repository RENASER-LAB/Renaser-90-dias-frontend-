import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { obtenerLecturaDeMiDiagnostico } from '../api/diagnosticoApi';
import { LecturaDelDiagnosticoView } from '../components/LecturaDelDiagnosticoView';
import { useLecturaDelDiagnostico } from '../hooks/useLecturaDelDiagnostico';
import {
  NO_SE_PUDO_CARGAR_LA_LECTURA_SIN_RED,
  SIN_DIAGNOSTICO_DISPONIBLE,
  TODAVIA_NO_LO_HAS_COMPLETADO,
} from '../utils/textosDelDiagnostico';

/**
 * Yo → «Mi diagnóstico» (spec 026): el diagnóstico que la persona respondió, en solo lectura, por sección y con sus respuestas.
 * Pantalla completa de Yo con su cabecera «‹ Mi diagnóstico»; la flecha y el atrás del sistema vuelven a Yo. Si todavía no lo
 * completó, lo dice (y ahí no hay nada que leer); si el servidor no lo tiene, también.
 *
 * La lectura es la de §4 del contrato (`GET /diagnostico/mio/lectura`), la misma que ve quien la acompaña, así que lo que ve acá es
 * lo que ven su mentor, su líder y Administración.
 */
export function MiDiagnosticoScreen({ onBack }: { onBack: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { vista, reintentar } = useLecturaDelDiagnostico(obtenerLecturaDeMiDiagnostico);

  useSystemBackHandler(() => {
    onBack();
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Mi diagnóstico" onVolver={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 18,
        }}
      >
        {vista.tipo === 'cargando' ? (
          <View style={estilos.centro}>
            <ActivityIndicator color={c.goldInk} size="large" />
          </View>
        ) : vista.tipo === 'oculta' ? (
          <Text style={[t.body, estilos.texto, { color: c.text }]}>{SIN_DIAGNOSTICO_DISPONIBLE}</Text>
        ) : vista.tipo === 'error' ? (
          <View style={estilos.fallo}>
            <Text style={[t.body, estilos.texto, { color: c.text }]}>{NO_SE_PUDO_CARGAR_LA_LECTURA_SIN_RED}</Text>
            {vista.reintentando ? null : <BotonSecundario etiqueta="Reintentar" onPress={reintentar} />}
          </View>
        ) : (
          <>
            {vista.lectura.estado !== 'COMPLETADO' ? (
              <Text style={[t.body, estilos.texto, { color: c.text }]}>{TODAVIA_NO_LO_HAS_COMPLETADO}</Text>
            ) : null}
            {vista.lectura.secciones.length > 0 ? <LecturaDelDiagnosticoView lectura={vista.lectura} /> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { paddingVertical: 48, alignItems: 'center' },
  texto: { fontSize: 16, lineHeight: 24 },
  fallo: { gap: 14 },
});
