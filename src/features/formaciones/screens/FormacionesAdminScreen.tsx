import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { fuentes } from '../../../theme/fuentes';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { useFormacionesAdmin } from '../hooks/useFormacionesAdmin';
import { lineaDeCifras, lineaDeDuraciones } from '../utils/resumenDeFormacion';

/**
 * «Formaciones» (Administración, spec 022, historia 4): las tres con lo que se mira primero —nombre, duración(es), cuánta gente y
 * cuántos grupos tienen, y cuánto hay por atender—. Tocar una abre su detalle: dos toques desde la raíz de Administración.
 * Solo Administración y Alquimista llegan aquí (el servidor responde 403 a cualquier otro rol). Sin animación propia: es una lista
 * que se consulta, y cada fila usa `Presionable` como el resto de Administración.
 */
export function FormacionesAdminScreen({ onVolver, onAbrir }: { onVolver: () => void; onAbrir: (codigo: string) => void }) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { tarjetas, cargando, fallo, recargar } = useFormacionesAdmin();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Formaciones" subtitulo="Escuela, Diplomado y Certificación" onVolver={onVolver} />
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
        {cargando && !tarjetas ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 24 }} /> : null}

        {fallo ? (
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
              {fallo.mensaje}
            </Text>
            {fallo.sinPermiso ? null : <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />}
          </View>
        ) : null}

        {(tarjetas ?? []).map(tarjeta => {
          const { resumen } = tarjeta;
          return (
            <Presionable
              key={resumen.codigo}
              onPress={() => onAbrir(resumen.codigo)}
              accessibilityRole="button"
              accessibilityLabel={`${resumen.nombre}. ${lineaDeDuraciones(resumen)}. ${lineaDeCifras(tarjeta)}${
                tarjeta.porAtender > 0 ? `. ${tarjeta.porAtender} por atender` : ''
              }`}
              style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}
            >
              <View style={estilos.encabezado}>
                <Text style={[t.cardTitle, estilos.nombre, { color: c.textStrong }]} numberOfLines={2}>
                  {resumen.nombre}
                </Text>
                <Icon name="chevron" size={18} color={c.chevron} />
              </View>
              <Text style={[t.body, estilos.linea, { color: c.textSoft }]}>{lineaDeDuraciones(resumen)}</Text>
              <Text style={[t.body, estilos.linea, { color: c.textSoft }]}>{lineaDeCifras(tarjeta)}</Text>
              <View style={estilos.etiquetas}>
                {!resumen.activa ? (
                  <Text style={[t.small, estilos.etiqueta, { color: c.textSoft, borderColor: c.border }]}>No disponible</Text>
                ) : null}
                {tarjeta.porAtender > 0 ? (
                  <Text style={[t.small, estilos.etiqueta, { color: c.goldInk, borderColor: c.goldInk, backgroundColor: c.goldWash }]}>
                    {`${tarjeta.porAtender} por atender`}
                  </Text>
                ) : null}
              </View>
            </Presionable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 16, width: '100%', gap: 4, minHeight: 72 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { flex: 1, flexShrink: 1, fontSize: 18 },
  linea: { fontSize: 16, lineHeight: 22 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  etiqueta: { fontSize: 14, fontFamily: fuentes.media, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
});
