import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SeccionPlegable } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { PreguntaAdmin, SeccionAdmin } from '../types/diagnosticoAdmin.types';
import { lineasDeLaPregunta } from './FilaDePregunta';
import { BotonDeAccion } from './piezas';

/**
 * Las preguntas retiradas: dejaron de mostrarse, pero se conservan sus respuestas (la lectura de quien ya respondió las sigue mostrando como
 * «Pregunta retirada»). Se pueden restaurar: vuelven a mostrarse; el servidor responde 409 si su destino «alimenta» ya lo tiene otra.
 * Plegada: se mira de vez en cuando.
 */
export function PreguntasRetiradas({
  retiradas,
  secciones,
  ocupado,
  onRestaurar,
}: {
  retiradas: readonly PreguntaAdmin[];
  secciones: readonly SeccionAdmin[];
  ocupado: boolean;
  onRestaurar: (pregunta: PreguntaAdmin) => void;
}) {
  const { c, t } = useTheme();
  if (retiradas.length === 0) return null;
  return (
    <SeccionPlegable titulo={`Retiradas · ${retiradas.length}`} detalle="Ya no se muestran; se conservan sus respuestas.">
      <View style={{ gap: 12 }}>
        {retiradas.map(p => (
          <View key={p.id} style={[estilos.fila, { borderColor: c.border }]}>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media }]}>{p.texto}</Text>
            {lineasDeLaPregunta(p, secciones, retiradas).map(l => (
              <Text key={l.texto} style={[t.body, { color: l.destacada ? c.goldInk : c.textSoft, fontSize: 16, lineHeight: 22 }]}>
                {l.texto}
              </Text>
            ))}
            <View style={estilos.acciones}>
              <BotonDeAccion
                etiqueta="Restaurar"
                icono="rotateCcw"
                accessibilityLabel={`Restaurar la pregunta ${p.texto}`}
                deshabilitado={ocupado}
                onPress={() => onRestaurar(p)}
              />
            </View>
          </View>
        ))}
      </View>
    </SeccionPlegable>
  );
}

const estilos = StyleSheet.create({
  fila: { gap: 2, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  acciones: { flexDirection: 'row', marginTop: 6 },
});
