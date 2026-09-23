import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import type { EstadoPropuestaUI, PropuestaUI } from '../types/renasia.types';
import { admiteAcciones, estadoVisible } from '../utils/propuestas';

type Props = {
  propuesta: PropuestaUI;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/** Lo que se lee debajo del resumen cuando la propuesta ya no está pendiente. */
function textoDeCierre(estado: EstadoPropuestaUI, mensaje?: string | null): string | null {
  switch (estado) {
    case 'confirmada':
      return mensaje || 'Listo, quedó aplicado.';
    case 'fallida':
      return mensaje || 'No se pudo aplicar.';
    case 'cancelada':
      return 'Cancelada. No se cambió nada.';
    case 'vencida':
      return mensaje || 'Esta propuesta venció. Pídele al acompañante que te la vuelva a ofrecer.';
    default:
      return mensaje ?? null;
  }
}

/**
 * Una acción que el acompañante PROPUSO y todavía no hizo (D-153 del backend): marcar un hábito,
 * mover un horario, pausar, armar el plan de rocas. Nada se aplica hasta que la persona toca
 * "Confirmar" — escribir "sí" en el chat no ejecuta nada. Es lo que evita que un mensaje viejo o
 * ambiguo termine cambiando datos reales (el incidente D-132).
 *
 * Mientras confirma o cancela, los dos botones quedan deshabilitados: el backend ya garantiza que
 * un doble toque ejecuta una sola vez, esto solo evita pedirlo dos veces.
 */
export function TarjetaPropuesta({ propuesta, onConfirmar, onCancelar }: Props) {
  const { c, t } = useTheme();
  const { rs } = useResponsive();
  const estado = estadoVisible(propuesta, Date.now());
  const cierre = textoDeCierre(estado, propuesta.mensaje);
  const colorCierre = estado === 'confirmada' ? c.success : estado === 'fallida' ? c.danger : c.textSoft;
  const ocupado = estado === 'confirmando' || estado === 'cancelando';

  return (
    <View style={[styles.tarjeta, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
      <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>PROPUESTA</Text>
      <Text style={[t.body, { color: c.text, fontSize: rs(14.5), lineHeight: rs(21) }]}>
        {propuesta.resumen}
      </Text>

      {(admiteAcciones(estado) || ocupado) && (
        <View style={styles.botones}>
          <GoldButton
            label="CANCELAR"
            variant="outline"
            onPress={onCancelar}
            disabled={ocupado}
            loading={estado === 'cancelando'}
            style={styles.boton}
          />
          <GoldButton
            label="CONFIRMAR"
            onPress={onConfirmar}
            disabled={ocupado}
            loading={estado === 'confirmando'}
            style={styles.boton}
          />
        </View>
      )}

      {cierre && <Text style={[t.small, { color: colorCierre, fontSize: 13 }]}>{cierre}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginTop: 6, width: '100%' },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  boton: { flexGrow: 1, flexBasis: 120, minHeight: 48 },
});
