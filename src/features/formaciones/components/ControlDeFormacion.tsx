import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { CODIGOS_DE_FORMACION, type CodigoDeFormacion } from '../types/formaciones.types';
import { nombreCortoDeFormacion, nombreLargoDeFormacion } from '../utils/nombreDeFormacion';

/**
 * «Escuela · Diplomado · Certificación»: elegir una de las tres formaciones en una pantalla de Administración que edita lo de CADA una
 * (la bienvenida, spec 035). Es el `ControlSegmentado` de la app, sin movimiento propio: la píldora viaja 250 ms y el «tic» de selección,
 * como en el selector de formación de la Comunidad; el texto se achica antes de cortarse.
 */
export function ControlDeFormacion({
  valor,
  onCambiar,
  accessibilityLabel = 'Formación',
}: {
  valor: CodigoDeFormacion;
  onCambiar: (formacion: CodigoDeFormacion) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View style={estilos.contenedor}>
      <ControlSegmentado
        opciones={CODIGOS_DE_FORMACION.map(codigo => ({
          valor: codigo,
          etiqueta: nombreCortoDeFormacion(codigo),
          accessibilityLabel: nombreLargoDeFormacion(codigo),
        }))}
        valor={valor}
        onCambiar={onCambiar}
        rol="radio"
        accessibilityLabel={accessibilityLabel}
        achicarTexto
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%' },
});
