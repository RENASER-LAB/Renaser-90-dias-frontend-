import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { useVersionesDelDiagnostico } from '../hooks/useVersionesDelDiagnostico';
import { lineaDeLaVersion } from '../utils/publicar';
import { textoDelFallo } from '../utils/textos';
import { TextoDeError } from './piezas';

/** El historial de lo publicado: quién y cuándo publicó cada versión. Solo lectura; se lee al abrir. */
export function HojaDeVersiones({ visible, versionVigente, alCerrar }: { visible: boolean; versionVigente: number | null; alCerrar: () => void }) {
  const { c, t } = useTheme();
  const { versiones, cargando, fallo, recargar } = useVersionesDelDiagnostico(visible);
  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alCerrar} titulo="Versiones publicadas" tamano="grande">
      <ScrollView contentContainerStyle={estilos.cuerpo}>
        {cargando && !versiones ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Cargando las versiones…</Text> : null}
        {fallo ? (
          <View style={{ gap: 10 }}>
            <TextoDeError texto={textoDelFallo(fallo, 'No se pudo cargar el historial.')} />
            {fallo !== 'sin_permiso' && fallo !== 'no_disponible' ? <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} /> : null}
          </View>
        ) : null}
        {versiones && versiones.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>Todavía no se publicó ninguna versión.</Text>
        ) : null}
        {versiones?.map(v => (
          <View key={v.version} style={[estilos.fila, { borderColor: c.border }]}>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media }]}>{lineaDeLaVersion(v)}</Text>
            {v.version === versionVigente ? <Text style={[t.body, { color: c.goldInk, fontSize: 16 }]}>La que ven hoy quienes empiezan</Text> : null}
          </View>
        ))}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 10, paddingHorizontal: 20, paddingBottom: 32 },
  fila: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12, gap: 2 },
});
