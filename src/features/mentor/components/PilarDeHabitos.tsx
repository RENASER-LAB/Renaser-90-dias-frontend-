import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SeccionPlegable } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import type { EstadoDelHabito, PilarDelDia } from '../utils/habitosDelDia';
import { HabitoDelDia } from './HabitoDelDia';

/**
 * Un pilar del día como sección que se abre y se cierra (spec 055 FR-013): CERRADA muestra un puntito por hábito (verde cumplido, rojo
 * vencido, hueco pendiente) y «N de M»; ABIERTA, sus hábitos. Reutiliza `SeccionPlegable`. Quien la usa le pone `key` con el día,
 * para que al elegir otro día vuelva a abrirse el pilar que corresponde.
 */
export function PilarDeHabitos({ pilar, onVerEvidencia }: { pilar: PilarDelDia; onVerEvidencia: (registroId: string) => void }) {
  const { c, t } = useTheme();
  return (
    <SeccionPlegable
      titulo={pilar.titulo}
      abiertaAlEmpezar={pilar.abiertoAlEmpezar}
      derecha={abierta => (
        <View style={estilos.resumen}>
          {!abierta ? (
            <View style={estilos.puntos} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {pilar.habitos.map(h => (
                <View key={h.obligacion.registroId} testID="puntito-del-pilar" style={[estilos.punto, estiloDelPunto(h.estado, c)]} />
              ))}
            </View>
          ) : null}
          <Text style={[t.body, { color: c.textSoft, fontSize: 14, fontFamily: fuentes.media, fontVariant: ['tabular-nums'] }]}>
            {pilar.cumplidos} de {pilar.total}
          </Text>
        </View>
      )}
    >
      {pilar.habitos.map(h => (
        <HabitoDelDia key={h.obligacion.registroId} habito={h} onVerEvidencia={onVerEvidencia} />
      ))}
    </SeccionPlegable>
  );
}

function estiloDelPunto(estado: EstadoDelHabito, c: ReturnType<typeof useTheme>['c']) {
  if (estado === 'cumplido') return { backgroundColor: c.success };
  if (estado === 'vencido') return { backgroundColor: c.danger };
  return { borderWidth: 1.5, borderColor: c.chevron };
}

const estilos = StyleSheet.create({
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  puntos: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: 110, justifyContent: 'flex-end' },
  punto: { width: 8, height: 8, borderRadius: 4 },
});
