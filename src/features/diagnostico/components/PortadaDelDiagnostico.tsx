import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { DiagnosticoParaLaPersona } from '../types/diagnostico.types';

/**
 * La portada del diagnóstico (spec 026, escenario 1): el título, el mensaje que cargó Administración —con sus saltos de línea,
 * «Tiempo estimado: 15 minutos» y lo demás— y, abajo (lo pone quien la usa), «Empezar». No es un paso: la barra de avance no
 * la cuenta.
 */
export function PortadaDelDiagnostico({ datos }: { datos: DiagnosticoParaLaPersona }) {
  const { c, t } = useTheme();
  const lineas = (datos.portada.mensaje ?? '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return (
    <View style={estilos.columna}>
      <View style={[estilos.sello, { backgroundColor: c.goldWash, borderColor: c.border }]}>
        <Icon name="spark" size={24} color={c.goldInk} />
      </View>
      <View style={estilos.titulos}>
        {datos.formacion ? <Text style={[t.micro, { color: c.micro }]}>{datos.formacion.nombre}</Text> : null}
        <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
          {datos.portada.titulo}
        </Text>
      </View>
      {lineas.length > 0 ? (
        <View style={estilos.mensaje}>
          {lineas.map((linea, i) => (
            <Text key={i} style={[t.body, estilos.linea, { color: i === 0 ? c.textStrong : c.text }]}>
              {linea}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 24, paddingTop: 12 },
  sello: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titulos: { gap: 8 },
  mensaje: { gap: 12 },
  linea: { fontSize: 17, lineHeight: 25 },
});
