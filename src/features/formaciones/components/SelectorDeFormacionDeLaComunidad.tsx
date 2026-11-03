import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { useFormacionDeLaComunidad } from '../hooks/useFormacionDeLaComunidad';
import { eleccionDelControl, valorDelControl } from '../utils/opcionesDeLaComunidad';

/**
 * El selector de formación de la Comunidad (spec 024): «Todas · Escuela · Diplomado · Certificación», una fila de 52 de alto (el
 * `ControlSegmentado` de la app, con el texto que se achica antes de cortarse) arriba de Comunidad.
 *
 * **Solo lo dibuja quien ve las tres formaciones** (Administración, Alquimista y Soporte TI). Para todas las demás cuentas no devuelve
 * nada —ni un hueco—: la Comunidad queda exactamente igual y no aparece la palabra «formación» (FR-050). Cambiar de opción es
 * instantáneo y vuelve a leer las seis secciones (`ComunidadScreen` se arma de nuevo con la elección); la elección se recuerda por
 * cuenta en este teléfono.
 *
 * Movimiento: el de siempre del `ControlSegmentado` (la píldora viaja 250 ms, el «tic» de selección). Sin animación propia.
 */
export function SelectorDeFormacionDeLaComunidad({ estilo }: { estilo?: React.ComponentProps<typeof View>['style'] }) {
  const { mostrarSelector, eleccion, opciones, elegir } = useFormacionDeLaComunidad();
  if (!mostrarSelector) return null;
  return (
    <View style={[estilos.contenedor, estilo]}>
      <ControlSegmentado
        opciones={opciones.map(o => ({ valor: o.valor, etiqueta: o.etiqueta, accessibilityLabel: o.nombreCompleto }))}
        valor={valorDelControl(eleccion)}
        onCambiar={valor => elegir(eleccionDelControl(valor))}
        rol="radio"
        accessibilityLabel="Formación"
        achicarTexto
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%' },
});
