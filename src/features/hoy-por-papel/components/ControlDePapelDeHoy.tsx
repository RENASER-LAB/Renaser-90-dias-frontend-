import React from 'react';

import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { PAPELES_EN_ORDEN, ROTULO_DEL_PAPEL, type PapelDeHoy } from '../utils/papelesDeHoy';

/**
 * El control de arriba de Hoy para quien tiene más de un papel (spec 018): «Mi programa», «Mi grupo» y «Mis mentores».
 * Solo trae los papeles que le corresponden (`papeles`, ya filtrados por `papelesDeHoy`).
 *
 * Es el `ControlSegmentado` de siempre, sin el recorrido de la píldora: se toca decenas de veces al día y lo que
 * importa es que lo de abajo cambie al instante.
 */
export function ControlDePapelDeHoy({
  papeles,
  valor,
  onCambiar,
}: {
  papeles: readonly PapelDeHoy[];
  valor: PapelDeHoy;
  onCambiar: (papel: PapelDeHoy) => void;
}) {
  return (
    <ControlSegmentado<PapelDeHoy>
      opciones={PAPELES_EN_ORDEN.filter(papel => papeles.includes(papel)).map(papel => ({
        valor: papel,
        etiqueta: ROTULO_DEL_PAPEL[papel],
      }))}
      valor={valor}
      onCambiar={onCambiar}
      accessibilityLabel="Qué ver en Hoy"
      achicarTexto
      sinAnimacion
    />
  );
}
