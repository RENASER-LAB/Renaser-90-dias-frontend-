import React from 'react';
import { Text, View } from 'react-native';

import { BotonPrincipal } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { BorradorDelDiagnostico } from '../types/diagnosticoAdmin.types';
import { estadoDePublicar, textoDeLaPublicacion } from '../utils/publicar';
import { Tarjeta } from './piezas';

/**
 * «Publicar»: lo que se edita es el borrador y las personas ven solo lo publicado. El panel dice dónde están las cosas (qué versión está
 * vigente y si hay cambios) y, si el servidor no deja publicar, SE LO DICE ANTES con el motivo y apaga el botón.
 */
export function PanelDePublicar({
  borrador,
  ocupado,
  onPublicar,
}: {
  borrador: BorradorDelDiagnostico;
  ocupado: boolean;
  onPublicar: () => void;
}) {
  const { c, t } = useTheme();
  const estado = estadoDePublicar(borrador);
  return (
    <Tarjeta advertencia={borrador.hayCambiosSinPublicar}>
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media }]}>{textoDeLaPublicacion(borrador.publicada)}</Text>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
        {borrador.hayCambiosSinPublicar
          ? 'Tienes cambios sin publicar. Las personas ven solo lo publicado.'
          : 'Lo que ves es lo que ven las personas que empiezan.'}
      </Text>
      {estado.motivos.length > 0 ? (
        <View style={{ gap: 4 }} accessibilityRole="alert">
          {estado.motivos.map(m => (
            <Text key={m} style={[t.body, { color: borrador.puedePublicar.ok ? c.textSoft : c.danger, fontSize: 16, lineHeight: 22 }]}>
              {m}
            </Text>
          ))}
        </View>
      ) : null}
      <BotonPrincipal etiqueta="Publicar" onPress={onPublicar} deshabilitado={!estado.habilitado || ocupado} cargando={ocupado} />
    </Tarjeta>
  );
}
