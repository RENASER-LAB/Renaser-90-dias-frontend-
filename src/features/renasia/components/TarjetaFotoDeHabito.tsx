import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { PedidoDeFotoUI } from '../types/renasia.types';
import { estadoVisibleDelPedido } from '../utils/pedidosDeFoto';

type Props = {
  pedido: PedidoDeFotoUI;
  onTomarFoto: () => void;
};

/**
 * El acompañante pidió la foto de un hábito (evento `evidencia`, 2026-09-26): el título del
 * hábito y el botón "Tomar foto". Tocarlo abre la cámara y después la misma pantalla partida de
 * Training ("¿Qué sentiste?"). Registrado, dice que quedó; vencido, el botón se deshabilita.
 *
 * Solo dibuja: la cámara y la subida las maneja quien la monta (chat u orbe) con
 * `useRegistroConFoto`.
 */
export function TarjetaFotoDeHabito({ pedido, onTomarFoto }: Props) {
  const { c, t } = useTheme();
  const estado = estadoVisibleDelPedido(pedido, Date.now());

  return (
    <View style={[styles.tarjeta, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
      <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>EVIDENCIA DE TU HÁBITO</Text>
      <Text style={[t.body, { color: c.text, fontSize: 14.5 }]}>{pedido.titulo}</Text>

      {estado === 'registrado' ? (
        <View style={styles.cierre}>
          <Icon name="checkCircle" size={16} color={c.success} />
          <Text style={[t.small, { color: c.success, fontSize: 13, flexShrink: 1 }]}>
            {pedido.mensaje || 'Listo, quedó registrado.'}
          </Text>
        </View>
      ) : (
        <GoldButton
          label="TOMAR FOTO"
          onPress={onTomarFoto}
          disabled={estado !== 'pendiente'}
          loading={estado === 'abriendo'}
          style={styles.boton}
        />
      )}

      {estado === 'vencido' ? (
        <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>
          {pedido.mensaje || 'Ya pasó el plazo para registrarlo.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginTop: 6, width: '100%' },
  boton: { minHeight: 48 },
  cierre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
