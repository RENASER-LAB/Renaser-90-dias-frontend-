import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { tituloEnTipoOracion } from '../../habits/utils/tituloEnTipoOracion';
import { LineaDeLaMedicionCruda } from '../../pasos/components/LineaDeLaMedicion';
import type { EstadoDelHabito, HabitoDelDia as HabitoDelDiaDatos } from '../utils/habitosDelDia';

const PALABRA: Record<EstadoDelHabito, string> = { cumplido: 'Cumplido', vencido: 'Vencido', pendiente: 'Pendiente' };

/**
 * Un hábito del día en la ficha del mentor (spec 055 FR-014 y FR-019): a la izquierda su estado —✓ cumplido en verde suave, ✕ vencido
 * en rojo suave, un círculo punteado si está pendiente— y, al lado, un ojo SOLO si hay evidencia (sin evidencia no hay ojo ni
 * hueco); el título; y la hora a la derecha si se entregó. El estado va con su forma además del color, y el lector de pantalla dice
 * la palabra. El ojo es un toque de 48 que abre la hoja de la evidencia.
 */
export function HabitoDelDia({ habito, onVerEvidencia }: { habito: HabitoDelDiaDatos; onVerEvidencia: (registroId: string) => void }) {
  const { c, t } = useTheme();
  const { obligacion: o, estado, hora, conEvidencia } = habito;
  const titulo = tituloEnTipoOracion(o.titulo);
  return (
    <View style={estilos.fila} accessible={false}>
      <View accessible accessibilityLabel={`${PALABRA[estado]}: ${titulo}`} style={estilos.estadoYOjo}>
        <EstadoDelHabitoIcono estado={estado} />
      </View>
      {conEvidencia ? (
        <Presionable
          onPress={() => onVerEvidencia(o.registroId)}
          accessibilityRole="button"
          accessibilityLabel={`Ver la evidencia de ${titulo}`}
          style={estilos.ojo}
        >
          <Icon name="eye" size={20} color={c.goldInk} />
        </Presionable>
      ) : null}
      <View style={estilos.titulo}>
        <Text style={[t.body, { color: c.text, fontSize: 15.5, lineHeight: 21 }]}>{titulo}</Text>
        <LineaDeLaMedicionCruda crudo={o.medicion} />
      </View>
      {hora ? <Text style={[t.body, { color: c.textSoft, fontSize: 14, fontVariant: ['tabular-nums'], fontFamily: fuentes.media }]}>{hora}</Text> : null}
    </View>
  );
}

/** ✓ verde suave, ✕ rojo suave o círculo punteado: 28 px. */
function EstadoDelHabitoIcono({ estado }: { estado: EstadoDelHabito }) {
  const { c } = useTheme();
  if (estado === 'pendiente') {
    return <View testID="estado-pendiente" style={[estilos.estado, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.chevron }]} />;
  }
  const cumplido = estado === 'cumplido';
  return (
    <View testID={cumplido ? 'estado-cumplido' : 'estado-vencido'} style={[estilos.estado, { backgroundColor: cumplido ? c.successWash : c.dangerWash }]}>
      <Icon name={cumplido ? 'check' : 'close'} size={16} color={cumplido ? c.success : c.danger} />
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingVertical: 6 },
  estadoYOjo: { width: 32, alignItems: 'center', justifyContent: 'center' },
  estado: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ojo: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginHorizontal: -6 },
  titulo: { flex: 1, minWidth: 0 },
});
