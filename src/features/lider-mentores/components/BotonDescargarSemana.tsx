import React from 'react';

import { BotonSecundario } from '../../../components/Legible';
import { useDescargarSemana, type DocumentoQueSeDescarga } from '../hooks/useDescargarSemana';

/**
 * El botón «Descargar semana» de las fichas (spec 056 FR-020, FR-026, FR-047): el mismo en la del mentor (los aprendices que acompaña),
 * en la del líder y en la de un mentor. De 52 de alto, apagado mientras el documento se genera. `semanaHasta` es el viernes de la semana
 * que se está viendo; sin él, la que está en curso.
 */
export function BotonDescargarSemana({ documento, semanaHasta = null }: { documento: DocumentoQueSeDescarga; semanaHasta?: string | null }) {
  const { descargando, descargar } = useDescargarSemana(documento);
  return <BotonSecundario etiqueta="Descargar semana" icono="fileText" cargando={descargando} onPress={() => void descargar(semanaHasta)} />;
}
