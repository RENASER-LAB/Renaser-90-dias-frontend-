import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { OpcionesDeFormacion } from '../components/OpcionesDeFormacion';
import { useCambioDeFormacion } from '../hooks/useCambioDeFormacion';
import { PREGUNTA_DE_FORMACION, codigoActivo } from '../utils/vistaDeFormacion';

/**
 * La pregunta corta de la primera vez (spec 022, historia 5, escenario 1): «¿En qué formación vas a trabajar hoy?». La ve una vez, y
 * solo el personal asignado a más de una formación; después el servidor recuerda la última y se cambia desde Yo. Una fila por
 * formación (nombre, sin más: la app no inventa cifras que el servidor no manda a esta cuenta).
 *
 * Sin ✕ ni «atrás»: no hay a dónde volver y entrar sin formación no tiene sentido. El gesto del sistema no hace nada aquí
 * (AGENTS.md §6: no cierra la app desde una vista hija). Sin animación: se ve una vez.
 */
export function EleccionDeFormacionScreen({ onElegida }: { onElegida: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { formacion, enCurso, error, cambiar } = useCambioDeFormacion(onElegida);

  useSystemBackHandler(() => true);

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: c.bg }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          estilos.contenido,
          { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' },
        ]}
      >
        <View style={estilos.textos}>
          <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
            {PREGUNTA_DE_FORMACION}
          </Text>
          <Text style={[t.body, estilos.ayuda, { color: c.textSoft }]}>Puedes cambiarla después desde Yo.</Text>
        </View>
        <OpcionesDeFormacion
          opciones={formacion?.disponibles ?? []}
          activa={codigoActivo(formacion)}
          enCurso={enCurso}
          onElegir={codigo => void cambiar(codigo)}
        />
        {error ? (
          <Text accessibilityRole="alert" style={[t.body, estilos.ayuda, { color: c.danger }]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { flexGrow: 1, justifyContent: 'center', gap: 24, paddingVertical: 36 },
  textos: { gap: 8 },
  ayuda: { fontSize: 16, lineHeight: 23 },
});
