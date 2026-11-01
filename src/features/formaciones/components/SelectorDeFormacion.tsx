import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useTheme } from '../../../theme/ThemeContext';
import { useCambioDeFormacion } from '../hooks/useCambioDeFormacion';
import { codigoActivo } from '../utils/vistaDeFormacion';
import { OpcionesDeFormacion } from './OpcionesDeFormacion';

/**
 * «Cambiar de formación» (Yo, spec 022, historia 5): la hoja desde abajo con las formaciones del personal que trabaja en varias.
 * Elegir otra la deja activa en el servidor y vuelve a armar TODAS las vistas con ella; no queda a la vista nada de la anterior.
 * Es una hoja y no una pantalla porque se usa de vez en cuando (estándar de la app: `HojaDesdeAbajo`, la misma entrada y salida de
 * las demás hojas, sin movimiento propio).
 */
export function SelectorDeFormacion({ visible, alCerrar }: { visible: boolean; alCerrar: () => void }) {
  const { c, t } = useTheme();
  const { formacion, enCurso, error, cambiar, limpiarError } = useCambioDeFormacion(alCerrar);
  const activa = codigoActivo(formacion);

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={() => {
        limpiarError();
        alCerrar();
      }}
      titulo="Cambiar de formación"
      subtitulo="Verás solo lo de la formación que elijas"
      etiquetaCerrar="Cerrar sin cambiar de formación"
    >
      <View style={estilos.cuerpo}>
        <OpcionesDeFormacion
          opciones={formacion?.disponibles ?? []}
          activa={activa}
          enCurso={enCurso}
          onElegir={codigo => {
            if (codigo === activa) {
              alCerrar();
              return;
            }
            void cambiar(codigo);
          }}
        />
        {error ? (
          <Text accessibilityRole="alert" style={[t.body, estilos.error, { color: c.danger }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  error: { fontSize: 16, lineHeight: 22 },
});
