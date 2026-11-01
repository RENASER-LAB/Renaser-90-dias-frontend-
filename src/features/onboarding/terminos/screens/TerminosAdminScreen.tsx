import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../../components/Icon';
import { BotonSecundario } from '../../../../components/Legible';
import { Presionable } from '../../../../components/Presionable';
import { useSystemBackHandler } from '../../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../../navigation/barraAlDesplazar/BarraInferior';
import { useResponsive } from '../../../../theme/responsive';
import { useTheme } from '../../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../../renasia/components/RenasiaLauncher';
import { CabeceraAdmin } from '../../../admin/components/CabeceraAdmin';
import { useResumenDeTerminos } from '../hooks/useTerminosAdmin';
import { estadoDeLaFormacion, textoDeAceptantes } from '../utils/estadoDeLosTerminos';

/**
 * «Términos y condiciones» en Administración (spec 027): las tres formaciones con el estado de los suyos —la versión vigente, o «Por revisar» si todavía no
 * publicó ninguna— y cuántas personas aceptaron. Tocar una abre sus términos. Solo Administración y Alquimista (el servidor lo vuelve a comprobar).
 */
export function TerminosAdminScreen({ onVolver, onAbrir }: { onVolver: () => void; onAbrir: (formacion: string) => void }) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { resumen, cargando, fallo, recargar } = useResumenDeTerminos();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Términos y condiciones" subtitulo="Uno por formación" onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 12,
        }}
      >
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          Cada formación tiene sus propios términos. Cambiar los de una no mueve los de las otras.
        </Text>
        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 16 }} /> : null}
        {fallo ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
              {fallo}
            </Text>
            <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />
          </View>
        ) : null}
        {resumen.map(formacion => {
          const estado = estadoDeLaFormacion(formacion);
          return (
            <Presionable
              key={formacion.formation}
              onPress={() => onAbrir(formacion.formation)}
              accessibilityRole="button"
              accessibilityLabel={`${formacion.name}. ${estado.titulo}`}
              style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: estado.porRevisar ? c.gold : c.border }]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18 }]}>{formacion.name}</Text>
                <Text style={[t.body, { color: estado.porRevisar ? c.goldInk : c.textStrong, fontSize: 16 }]}>{estado.titulo}</Text>
                {estado.detalle ? <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 21 }]}>{estado.detalle}</Text> : null}
                {!estado.porRevisar ? (
                  <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>{textoDeAceptantes(formacion.acceptedCount)}</Text>
                ) : null}
              </View>
              <Icon name="chevron" size={16} color={c.chevron} />
            </Presionable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, borderWidth: 1, borderRadius: 14, padding: 16 },
});
